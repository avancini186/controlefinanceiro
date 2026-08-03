import { DataService } from '../DataService';
import { TransactionService } from './TransactionService';
import type { OFXParsedTransaction, OFXImportRecord } from '../../types';
import { TransactionType, TransactionStatus } from '../../types/enums';
import { supabase } from '../../lib/supabase';

export class OFXImportService {
  /**
   * Generates a unique deterministic SHA-like hash based on: data + valor + descricao.
   */
  static generateHash(data: string, valor: number, descricao: string): string {
    const raw = `${data.trim()}|${Number(valor).toFixed(2)}|${descricao.trim().toLowerCase()}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0; // Convert to 32bit integer
    }
    return 'OFX_' + Math.abs(hash).toString(36);
  }

  /**
   * Parses raw OFX file content and extracts transactions.
   */
  static parseOFX(
    ofxContent: string,
    options?: { isCreditCard?: boolean; importCardCredits?: boolean }
  ): OFXParsedTransaction[] {
    const isCreditCard = options?.isCreditCard ?? false;
    const importCardCredits = options?.importCardCredits ?? false;

    const results: OFXParsedTransaction[] = [];
    const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;

    let match: RegExpExecArray | null;
    while ((match = stmtTrnRegex.exec(ofxContent)) !== null) {
      const trnContent = match[1];

      // Extract FITID
      const fitIdMatch = trnContent.match(/<FITID>\s*([^\r\n<]+)/i);
      const fitId = fitIdMatch ? fitIdMatch[1].trim() : 'N/A';

      // Extract TRNAMT (Amount)
      const amtMatch = trnContent.match(/<TRNAMT>\s*([^\r\n<]+)/i);
      if (!amtMatch) continue;
      const rawValor = parseFloat(amtMatch[1].replace(',', '.'));
      if (isNaN(rawValor)) continue;

      let tipo = rawValor < 0 ? TransactionType.DESPESA : TransactionType.RECEITA;
      let isCreditIgnored = false;
      let selected = true;

      if (isCreditCard) {
        // Credit card rule:
        // rawValor < 0 in OFX or credits/refunds/payments -> RECEITA / ignored if importCardCredits=false
        // Purchases -> rawValor < 0 in standard OFX card exports, or rawValor > 0 depending on bank.
        // If rawValor > 0 -> RECEITA in standard bank checking, but in credit card OFX:
        // Purchases are debits.
        if (rawValor > 0 || tipo === TransactionType.RECEITA) {
          if (!importCardCredits) {
            isCreditIgnored = true;
            selected = false;
          }
          tipo = TransactionType.RECEITA;
        } else {
          tipo = TransactionType.DESPESA;
        }
      }

      const absValor = Math.abs(rawValor);

      // Extract DTPOSTED (Date: YYYYMMDD...)
      const dateMatch = trnContent.match(/<DTPOSTED>\s*([0-9]{8})/i);
      let formattedDate = new Date().toISOString().split('T')[0];
      if (dateMatch) {
        const rawDate = dateMatch[1];
        formattedDate = `${rawDate.substring(0, 4)}-${rawDate.substring(4, 6)}-${rawDate.substring(6, 8)}`;
      }

      // Extract NAME or MEMO (Description)
      const nameMatch = trnContent.match(/<NAME>\s*([^\r\n<]+)/i);
      const memoMatch = trnContent.match(/<MEMO>\s*([^\r\n<]+)/i);
      const rawDesc = (nameMatch ? nameMatch[1] : memoMatch ? memoMatch[1] : 'Transação Importada OFX').trim();

      const hash = this.generateHash(formattedDate, absValor, rawDesc);

      results.push({
        fitId,
        tipo,
        valor: Number(absValor.toFixed(2)),
        data: formattedDate,
        descricao: rawDesc,
        memo: memoMatch ? memoMatch[1].trim() : undefined,
        hash,
        isDuplicate: false,
        selected,
        isCreditIgnored,
      });
    }

    return results;
  }

  /**
   * Checks parsed transactions against existing database transactions for deduplication.
   */
  static async checkDuplicates(parsed: OFXParsedTransaction[]): Promise<OFXParsedTransaction[]> {
    const existingTransactions = await TransactionService.getAll();
    const existingHashes = new Set<string>();

    for (const tx of existingTransactions) {
      if (tx.importHash) {
        existingHashes.add(tx.importHash);
      } else {
        const computedHash = this.generateHash(tx.data, tx.valor, tx.descricao);
        existingHashes.add(computedHash);
      }
    }

    return parsed.map((item) => {
      const isDup = existingHashes.has(item.hash);
      return {
        ...item,
        isDuplicate: isDup,
        selected: isDup ? false : item.selected,
      };
    });
  }

  /**
   * Confirms import and persists valid selected transactions to the database.
   */
  static async importTransactions(
    items: OFXParsedTransaction[],
    target: string | { id: string; type: 'CONTA' | 'CARTAO' },
    filename: string
  ): Promise<OFXImportRecord> {
    const validItems = items.filter((i) => i.selected);

    if (validItems.length === 0) {
      throw new Error('Nenhuma transação selecionada para importação.');
    }

    const targetObj = typeof target === 'string'
      ? { id: target, type: 'CONTA' as const }
      : target;

    let totalCreditos = 0;
    let totalDebitos = 0;

    for (const t of validItems) {
      if (t.tipo === TransactionType.RECEITA) {
        totalCreditos += t.valor;
      } else {
        totalDebitos += t.valor;
      }

      await TransactionService.create({
        tipo: t.tipo,
        valor: t.valor,
        data: t.data,
        contaId: targetObj.type === 'CONTA' ? targetObj.id : undefined,
        cartaoId: targetObj.type === 'CARTAO' ? targetObj.id : undefined,
        descricao: t.descricao,
        observacao: `Importado via extrato OFX (FitID: ${t.fitId || 'N/A'})`,
        status: TransactionStatus.CONCLUIDO,
        importHash: t.hash,
        conciliada: true,
        dataConciliacao: new Date().toISOString(),
      });
    }

    // Log import history
    const historyRecord = await DataService.insert('importacoes_ofx', {
      nome_arquivo: filename,
      conta_id: targetObj.type === 'CONTA' ? targetObj.id : null,
      cartao_id: targetObj.type === 'CARTAO' ? targetObj.id : null,
      total_transacoes: validItems.length,
      valor_total_creditos: Number(totalCreditos.toFixed(2)),
      valor_total_debitos: Number(totalDebitos.toFixed(2)),
    });

    return {
      id: historyRecord.id,
      nomeArquivo: historyRecord.nome_arquivo,
      contaId: historyRecord.conta_id,
      cartaoId: historyRecord.cartao_id,
      totalTransacoes: validItems.length,
      valorTotalCreditos: Number(totalCreditos.toFixed(2)),
      valorTotalDebitos: Number(totalDebitos.toFixed(2)),
      createdAt: historyRecord.created_at,
    };
  }

  /**
   * Retrieves full OFX import history with account and credit card details.
   */
  static async getImportHistory(): Promise<OFXImportRecord[]> {
    try {
      const { data, error } = await supabase
        .from('importacoes_ofx')
        .select(`
          *,
          account:contas!conta_id(*),
          creditCard:cartoes!cartao_id(*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Could not fetch joined OFX history, falling back:', error.message);
        const { data: simpleData } = await supabase
          .from('importacoes_ofx')
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
      console.error('Error fetching OFX import history:', err);
      return [];
    }
  }
}
