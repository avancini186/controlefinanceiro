import { DataService } from '../DataService';
import { TransactionService } from './TransactionService';
import { OFXImportService } from './OFXImportService';
import type { CSVParsedRow, CSVColumnMapping, CSVMappingTemplate, CSVImportRecord } from '../../types';
import { TransactionType, TransactionStatus } from '../../types/enums';
import { supabase } from '../../lib/supabase';

export class CSVImportService {
  /**
   * Helper to format raw date string to YYYY-MM-DD based on specified format.
   */
  private static parseFormattedDate(rawDate: string, format?: string): string {
    const clean = rawDate.trim();
    if (!clean) return new Date().toISOString().split('T')[0];

    // Standard YYYY-MM-DD
    if (clean.match(/^\d{4}-\d{2}-\d{2}$/)) return clean;

    // DD/MM/YYYY
    const brMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (brMatch) {
      const d = brMatch[1].padStart(2, '0');
      const m = brMatch[2].padStart(2, '0');
      const y = brMatch[3];
      return `${y}-${m}-${d}`;
    }

    // MM/DD/YYYY
    if (format === 'MM/DD/YYYY') {
      const usMatch = clean.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (usMatch) {
        const m = usMatch[1].padStart(2, '0');
        const d = usMatch[2].padStart(2, '0');
        const y = usMatch[3];
        return `${y}-${m}-${d}`;
      }
    }

    return clean;
  }

  /**
   * Parses raw CSV text using specified column mapping definitions.
   */
  static parseCSV(
    csvContent: string,
    mapping: CSVColumnMapping,
    options?: { isCreditCard?: boolean; importCardCredits?: boolean }
  ): { headers: string[]; rows: CSVParsedRow[] } {
    const isCreditCard = options?.isCreditCard ?? false;
    const importCardCredits = options?.importCardCredits ?? false;

    const delimiter = mapping.delimitador || ',';
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return { headers: [], rows: [] };
    }

    const headers = lines[0].split(delimiter).map((h) => h.replace(/^["']|["']$/g, '').trim());

    const idxDate = typeof mapping.dataCol === 'number' ? mapping.dataCol : (mapping.colunaData ? headers.indexOf(mapping.colunaData) : 0);
    const idxDesc = typeof mapping.descricaoCol === 'number' ? mapping.descricaoCol : (mapping.colunaDescricao ? headers.indexOf(mapping.colunaDescricao) : 1);
    const idxVal = typeof mapping.valorCol === 'number' ? mapping.valorCol : (mapping.colunaValor ? headers.indexOf(mapping.colunaValor) : 2);
    const idxTipo = typeof mapping.tipoCol === 'number' ? mapping.tipoCol : (mapping.colunaTipo ? headers.indexOf(mapping.colunaTipo) : -1);

    if (idxDate === -1 || idxDesc === -1 || idxVal === -1) {
      throw new Error('Colunas obrigatórias não encontradas no arquivo CSV com a delimitação configurada.');
    }

    const rows: CSVParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const colTokens = lines[i].split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim());
      if (colTokens.length < Math.max(idxDate, idxDesc, idxVal) + 1) continue;

      const rawDate = colTokens[idxDate];
      const rawDesc = colTokens[idxDesc] || 'Transação CSV';
      const rawValStr = colTokens[idxVal];

      // Parse float value replacing comma with dot
      const cleanValStr = rawValStr.replace(/\./g, '').replace(',', '.');
      const numVal = parseFloat(cleanValStr);
      if (isNaN(numVal)) continue;

      const absValor = Math.abs(numVal);
      const formattedDate = this.parseFormattedDate(rawDate, mapping.formatoData);

      let tipo: TransactionType = numVal < 0 ? TransactionType.DESPESA : TransactionType.RECEITA;
      let isCreditIgnored = false;
      let selected = true;

      if (idxTipo !== -1 && colTokens[idxTipo]) {
        const tStr = colTokens[idxTipo].toLowerCase();
        if (tStr.includes('rec') || tStr.includes('cred') || tStr.includes('ent')) {
          tipo = TransactionType.RECEITA;
        } else if (tStr.includes('desp') || tStr.includes('deb') || tStr.includes('sai')) {
          tipo = TransactionType.DESPESA;
        }
      }

      if (isCreditCard) {
        // Rule for Credit Card:
        // Value > 0 -> Purchase -> DESPESA
        // Value <= 0 or Credit transaction -> Refund/Invoice payment -> Ignored by default unless importCardCredits is true
        if (numVal <= 0 || tipo === TransactionType.RECEITA) {
          if (!importCardCredits) {
            isCreditIgnored = true;
            selected = false;
          }
          tipo = TransactionType.RECEITA;
        } else {
          tipo = TransactionType.DESPESA;
        }
      }

      const hash = OFXImportService.generateHash(formattedDate, absValor, rawDesc);

      rows.push({
        data: formattedDate,
        descricao: rawDesc,
        valor: absValor,
        tipo,
        hash,
        isDuplicate: false,
        selected,
        isCreditIgnored,
      });
    }

    return { headers, rows };
  }

  /**
   * Checks candidate transactions against existing hashes in database for deduplication.
   */
  static async checkDuplicates(
    rows: CSVParsedRow[],
    targetId?: string
  ): Promise<CSVParsedRow[]> {
    const existingTransactions = await TransactionService.getAll();
    const existingHashes = new Set<string>();

    for (const tx of existingTransactions) {
      if (targetId && tx.contaId !== targetId && tx.cartaoId !== targetId) {
        continue;
      }
      if (tx.importHash) {
        existingHashes.add(tx.importHash);
      } else {
        const computedHash = OFXImportService.generateHash(tx.data, tx.valor, tx.descricao);
        existingHashes.add(computedHash);
      }
    }

    return rows.map((r) => {
      const isDup = existingHashes.has(r.hash);
      return {
        ...r,
        isDuplicate: isDup,
        selected: isDup ? false : r.selected,
      };
    });
  }

  /**
   * Confirms and creates selected CSV transactions in database.
   */
  static async importTransactions(
    selectedRows: CSVParsedRow[],
    target: string | { id: string; type: 'CONTA' | 'CARTAO' },
    filename: string
  ): Promise<CSVImportRecord> {
    if (selectedRows.length === 0) {
      throw new Error('Nenhuma transação selecionada para importação.');
    }

    const targetObj = typeof target === 'string'
      ? { id: target, type: 'CONTA' as const }
      : target;

    let totalCreditos = 0;
    let totalDebitos = 0;

    for (const r of selectedRows) {
      if (r.tipo === TransactionType.RECEITA) {
        totalCreditos += r.valor;
      } else {
        totalDebitos += r.valor;
      }

      await TransactionService.create({
        tipo: r.tipo,
        valor: r.valor,
        data: r.data,
        contaId: targetObj.type === 'CONTA' ? targetObj.id : undefined,
        cartaoId: targetObj.type === 'CARTAO' ? targetObj.id : undefined,
        categoriaId: r.categoriaId || undefined,
        descricao: r.descricao,
        status: TransactionStatus.CONCLUIDO,
        importHash: r.hash,
      });
    }

    // Record import history
    const historyRecord = await DataService.insert('importacoes_csv', {
      nome_arquivo: filename,
      conta_id: targetObj.type === 'CONTA' ? targetObj.id : null,
      cartao_id: targetObj.type === 'CARTAO' ? targetObj.id : null,
      total_transacoes: selectedRows.length,
      valor_total_creditos: Number(totalCreditos.toFixed(2)),
      valor_total_debitos: Number(totalDebitos.toFixed(2)),
    });

    return {
      id: historyRecord.id,
      nomeArquivo: historyRecord.nome_arquivo,
      contaId: historyRecord.conta_id,
      cartaoId: historyRecord.cartao_id,
      totalTransacoes: historyRecord.total_transacoes,
      valorTotalCreditos: Number(historyRecord.valor_total_creditos),
      valorTotalDebitos: Number(historyRecord.valor_total_debitos),
      createdAt: historyRecord.created_at,
    };
  }

  /**
   * Saves a reusable CSV mapping template configuration.
   */
  static async saveTemplate(nomeModelo: string, mapping: CSVColumnMapping): Promise<CSVMappingTemplate> {
    const created = await DataService.insert('modelos_mapeamento_csv', {
      nome_modelo: nomeModelo,
      coluna_data: String(mapping.colunaData ?? mapping.dataCol ?? 0),
      coluna_descricao: String(mapping.colunaDescricao ?? mapping.descricaoCol ?? 1),
      coluna_valor: String(mapping.colunaValor ?? mapping.valorCol ?? 2),
      coluna_tipo: mapping.colunaTipo !== undefined ? String(mapping.colunaTipo) : null,
      coluna_categoria: mapping.colunaCategoria !== undefined ? String(mapping.colunaCategoria) : null,
      delimitador: mapping.delimitador || ',',
      formato_data: mapping.formatoData || 'YYYY-MM-DD',
    });

    return {
      id: created.id,
      nomeModelo: created.nome_modelo,
      colunaData: created.coluna_data,
      colunaDescricao: created.coluna_descricao,
      colunaValor: created.coluna_valor,
      colunaTipo: created.coluna_tipo || undefined,
      colunaCategoria: created.coluna_categoria || undefined,
      delimitador: created.delimitador,
      formatoData: created.formato_data,
      createdAt: created.created_at,
    };
  }

  /**
   * Retrieves all saved CSV mapping templates.
   */
  static async getTemplates(): Promise<CSVMappingTemplate[]> {
    const records = await DataService.selectAll('modelos_mapeamento_csv');
    return records.map((r) => ({
      id: r.id,
      nomeModelo: r.nome_modelo,
      colunaData: r.coluna_data,
      colunaDescricao: r.coluna_descricao,
      colunaValor: r.coluna_valor,
      colunaTipo: r.coluna_tipo || undefined,
      colunaCategoria: r.coluna_categoria || undefined,
      delimitador: r.delimitador,
      formatoData: r.formato_data,
      createdAt: r.created_at,
    }));
  }

  /**
   * Retrieves full CSV import history with account and credit card details.
   */
  static async getImportHistory(): Promise<CSVImportRecord[]> {
    try {
      const { data, error } = await supabase
        .from('importacoes_csv')
        .select(`
          *,
          account:contas!conta_id(*),
          creditCard:cartoes!cartao_id(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Could not fetch joined CSV history, falling back:', error.message);
        const { data: simpleData } = await supabase
          .from('importacoes_csv')
          .select('*')
          .order('created_at', { ascending: false });

        return ((simpleData || []) as any[]).map((row: any) => ({
          id: row.id,
          nomeArquivo: row.nome_arquivo,
          contaId: row.conta_id,
          cartaoId: row.cartao_id,
          totalTransacoes: row.total_transacoes,
          valorTotalCreditos: Number(row.valor_total_creditos || 0),
          valorTotalDebitos: Number(row.valor_total_debitos || 0),
          createdAt: row.created_at,
        }));
      }

      return ((data || []) as any[]).map((row: any) => ({
        id: row.id,
        nomeArquivo: row.nome_arquivo,
        contaId: row.conta_id,
        cartaoId: row.cartao_id,
        totalTransacoes: row.total_transacoes,
        valorTotalCreditos: Number(row.valor_total_creditos || 0),
        valorTotalDebitos: Number(row.valor_total_debitos || 0),
        createdAt: row.created_at,
        account: row.account ? {
          id: row.account.id,
          nome: row.account.nome,
          tipo: row.account.tipo,
          saldoInicial: Number(row.account.saldo_inicial),
          saldoAtual: Number(row.account.saldo_atual),
          cor: row.account.cor,
          icone: row.account.icone,
          ativa: row.account.ativa,
          createdAt: row.account.created_at,
        } : undefined,
        creditCard: row.creditCard ? {
          id: row.creditCard.id,
          nome: row.creditCard.nome,
          limite: Number(row.creditCard.limite),
          diaFechamento: row.creditCard.dia_fechamento,
          diaVencimento: row.creditCard.dia_vencimento,
          cor: row.creditCard.cor,
          icone: row.creditCard.icone,
          ativo: row.creditCard.ativo,
          createdAt: row.creditCard.created_at,
        } : undefined,
      }));
    } catch (err) {
      console.error('Error fetching CSV import history:', err);
      return [];
    }
  }
}
