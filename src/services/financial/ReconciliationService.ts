import { DataService } from '../DataService';
import { TransactionService } from './TransactionService';
import { BalanceService } from './BalanceService';
import { AccountService } from './AccountService';
import type { Transaction } from '../../types';

export interface ReconciliationSummary {
  saldoSistema: number;
  saldoConciliado: number;
  diferenca: number;
  qtdConciliada: number;
  qtdPendente: number;
}

export class ReconciliationService {
  /**
   * Marks a single transaction as reconciled.
   */
  static async reconcileTransaction(id: string): Promise<Transaction> {
    await DataService.update('transacoes', id, {
      conciliada: true,
      data_conciliacao: new Date().toISOString(),
    });

    const updated = await TransactionService.getById(id);
    if (!updated) {
      throw new Error(`Transação ${id} não encontrada para conciliação.`);
    }
    return updated;
  }

  /**
   * Unmarks a single transaction from reconciled status.
   */
  static async unreconcileTransaction(id: string): Promise<Transaction> {
    await DataService.update('transacoes', id, {
      conciliada: false,
      data_conciliacao: null,
    });

    const updated = await TransactionService.getById(id);
    if (!updated) {
      throw new Error(`Transação ${id} não encontrada para desconciliação.`);
    }
    return updated;
  }

  /**
   * Reconciles multiple transactions in a batch using Promise.all for speed.
   */
  static async batchReconcile(ids: string[]): Promise<boolean> {
    if (ids.length === 0) return true;

    const now = new Date().toISOString();
    await Promise.all(
      ids.map((id) =>
        DataService.update('transacoes', id, {
          conciliada: true,
          data_conciliacao: now,
        })
      )
    );

    return true;
  }

  /**
   * Calculates reconciliation summary (System Balance, Reconciled Balance, Difference, Quantities).
   */
  static async getReconciliationSummary(contaId?: string): Promise<ReconciliationSummary> {
    const allTransactions = await TransactionService.getAll(contaId ? { contaId } : undefined);

    let saldoSistema = 0;
    if (contaId) {
      saldoSistema = await BalanceService.calculateAccountBalance(contaId);
    } else {
      const summary = await BalanceService.calculateSummary();
      saldoSistema = summary.saldoTotal;
    }

    // Account initial balance if account specified
    let initialBalance = 0;
    if (contaId) {
      const acc = await AccountService.getById(contaId);
      if (acc) initialBalance = acc.saldoInicial;
    }

    let saldoConciliado = initialBalance;
    let qtdConciliada = 0;
    let qtdPendente = 0;

    for (const tx of allTransactions) {
      if (tx.status !== 'CONCLUIDO') continue;

      if (tx.conciliada) {
        qtdConciliada++;
        if (tx.tipo === 'RECEITA') {
          saldoConciliado += tx.valor;
        } else if (tx.tipo === 'DESPESA') {
          saldoConciliado -= tx.valor;
        } else if (tx.tipo === 'TRANSFERENCIA') {
          if (tx.direcaoTransferencia === 'ENTRADA') {
            saldoConciliado += tx.valor;
          } else if (tx.direcaoTransferencia === 'SAIDA') {
            saldoConciliado -= tx.valor;
          }
        }
      } else {
        qtdPendente++;
      }
    }

    saldoConciliado = Number(saldoConciliado.toFixed(2));
    const diferenca = Number((saldoSistema - saldoConciliado).toFixed(2));

    return {
      saldoSistema,
      saldoConciliado,
      diferenca,
      qtdConciliada,
      qtdPendente,
    };
  }
}
