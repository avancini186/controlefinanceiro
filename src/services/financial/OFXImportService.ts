import { DataService } from '../DataService';
import { TransactionService } from './TransactionService';
import type { OFXParsedTransaction, OFXImportRecord } from '../../types';
import { TransactionType, TransactionStatus } from '../../types/enums';
import { parseInstallmentFromDescription } from '../../utils/installmentParser';

export const IGNORED_DESCRIPTION_PATTERNS = [
  'ESTORNO',
  'REVERSAO',
  'REVERSÃO',
  'PAGAMENTO FATURA',
  'PAGTO FATURA',
  'PAGAMENTO CARTÃO',
  'PAGAMENTO CARTAO',
  'CRÉDITO FATURA',
  'CREDITO FATURA',
  'CRÉDITO EM FATURA',
  'CREDITO EM FATURA',
  'PAGAMENTO RECEBIDO',
  'AJUSTE',
  'AJUSTE FINANCEIRO',
  'AJUSTE DE LIMITE',
  'AJUSTE CONTÁBIL',
  'CRÉDITO',
  'CREDITO',
];

export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export class OFXImportService {
  /**
   * Identifies the reason why a transaction should be unselected automatically, if any.
   */
  static getUnselectReason(transaction: { isDuplicate?: boolean; descricao: string }): string | undefined {
    if (transaction.isDuplicate) {
      return 'Duplicada';
    }

    const norm = normalizeText(transaction.descricao);
    if (!norm) return undefined;

    const paymentPatterns = ['pagamento fatura', 'pagto fatura', 'pagamento cartao', 'pagto cartao'];
    if (paymentPatterns.some((p) => norm.includes(p))) {
      return 'Pagamento de fatura';
    }

    const creditPatterns = ['credito fatura', 'credito em fatura', 'pagamento recebido', 'credito'];
    if (creditPatterns.some((p) => norm.includes(p))) {
      return 'Crédito da fatura';
    }

    const reversalPatterns = ['estorno', 'reversao'];
    if (reversalPatterns.some((p) => norm.includes(p))) {
      return 'Estorno';
    }

    const adjustmentPatterns = ['ajuste'];
    if (adjustmentPatterns.some((p) => norm.includes(p))) {
      return 'Ajuste';
    }

    return undefined;
  }

  /**
   * Exclusive method responsible for deciding whether an OFX transaction starts selected by default.
   */
  static shouldPreselectTransaction(transaction: { isDuplicate?: boolean; descricao: string }): boolean {
    if (transaction.isDuplicate) {
      return false;
    }
    const reason = this.getUnselectReason(transaction);
    return reason === undefined;
  }

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

      if (isCreditCard) {
        if (rawValor > 0 || tipo === TransactionType.RECEITA) {
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

      const baseTx = {
        fitId,
        tipo,
        valor: Number(absValor.toFixed(2)),
        data: formattedDate,
        descricao: rawDesc,
        memo: memoMatch ? memoMatch[1].trim() : undefined,
        hash,
        isDuplicate: false,
      };

      let selected = this.shouldPreselectTransaction(baseTx);
      let ignoreReason = this.getUnselectReason(baseTx);

      if (isCreditCard && (rawValor > 0 || tipo === TransactionType.RECEITA) && !importCardCredits) {
        isCreditIgnored = true;
        selected = false;
        if (!ignoreReason) {
          ignoreReason = 'Crédito da fatura';
        }
      }

      results.push({
        ...baseTx,
        selected,
        isCreditIgnored,
        ignoreReason: selected ? undefined : ignoreReason,
      });
    }

    return results;
  }

  /**
   * Checks parsed transactions against existing database transactions for deduplication.
   */
  static async checkDuplicates(
    parsed: OFXParsedTransaction[],
    targetId?: string
  ): Promise<OFXParsedTransaction[]> {
    const existingTransactions = await TransactionService.getAll();
    const existingHashes = new Set<string>();

    for (const tx of existingTransactions) {
      if (targetId && tx.contaId !== targetId && tx.cartaoId !== targetId) {
        continue;
      }
      if (tx.importHash) {
        existingHashes.add(tx.importHash);
      } else {
        const computedHash = this.generateHash(tx.data, tx.valor, tx.descricao);
        existingHashes.add(computedHash);
      }
    }

    return parsed.map((item) => {
      const isDup = existingHashes.has(item.hash);
      const updatedItem = {
        ...item,
        isDuplicate: isDup,
      };
      const selected = this.shouldPreselectTransaction(updatedItem);
      const ignoreReason = this.getUnselectReason(updatedItem);

      return {
        ...updatedItem,
        selected,
        ignoreReason: selected ? undefined : ignoreReason,
      };
    });
  }

  /**
   * Confirms import and persists valid selected transactions to the database,
   * automatically generating future installments for installment purchases.
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

      const parsedInst = parseInstallmentFromDescription(t.descricao);
      const numParc = parsedInst.numeroParcela;
      const totParc = parsedInst.totalParcelas;

      let group: any = null;
      if (numParc && totParc && totParc > 1) {
        try {
          group = await DataService.insert('grupos_parcelamento', {
            descricao: parsedInst.baseDescription,
            valor_total: t.valor * totParc,
            total_parcelas: totParc,
          });
        } catch (e) {
          console.warn('Failed to insert grupo_parcelamento:', e);
        }
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
        grupoParcelamentoId: group ? group.id : undefined,
        numeroParcela: numParc,
        totalParcelas: totParc,
      });

      // Auto-generate remaining future installments if numParc < totParc
      if (numParc && totParc && numParc < totParc && targetObj.type === 'CARTAO') {
        const [baseY, baseM, baseD] = t.data.split('-').map(Number);

        for (let next = numParc + 1; next <= totParc; next++) {
          const monthOffset = next - numParc;
          let targetY = baseY;
          let targetM = (baseM - 1) + monthOffset;
          targetY += Math.floor(targetM / 12);
          targetM = ((targetM % 12) + 12) % 12;

          const maxDays = new Date(targetY, targetM + 1, 0).getDate();
          const targetD = Math.min(baseD, maxDays);
          const nextDate = `${targetY}-${String(targetM + 1).padStart(2, '0')}-${String(targetD).padStart(2, '0')}`;

          const nextDesc = t.descricao.replace(
            /(?:parcela|parc\.?)\s*\d{1,2}\s*[/|de]\s*\d{1,2}/i,
            `Parcela ${next}/${totParc}`
          );

          await TransactionService.create({
            tipo: t.tipo,
            valor: t.valor,
            data: nextDate,
            cartaoId: targetObj.id,
            descricao: nextDesc !== t.descricao ? nextDesc : `${parsedInst.baseDescription} - Parcela ${next}/${totParc}`,
            observacao: `Gerado automaticamente via importação parcelada (Origem: FitID ${t.fitId || 'N/A'})`,
            status: TransactionStatus.CONCLUIDO,
            importHash: `${t.hash}_P${next}`,
            conciliada: true,
            dataConciliacao: new Date().toISOString(),
            grupoParcelamentoId: group ? group.id : undefined,
            numeroParcela: next,
            totalParcelas: totParc,
          });
        }
      }
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
      const records = await DataService.selectAll('importacoes_ofx');
      return (records || []).map((row: any) => ({
        id: row.id,
        nomeArquivo: row.nome_arquivo,
        contaId: row.conta_id,
        cartaoId: row.cartao_id,
        totalTransacoes: row.total_transacoes,
        valorTotalCreditos: Number(row.valor_total_creditos || 0),
        valorTotalDebitos: Number(row.valor_total_debitos || 0),
        createdAt: row.created_at,
      }));
    } catch (err) {
      console.error('Error fetching OFX import history:', err);
      return [];
    }
  }
}
