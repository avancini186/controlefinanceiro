import { DataService } from '../dataService';
import type { Transaction, TransactionWithRelations, TransactionSplit } from '../../types/database';

/**
 * TransactionService - Domain business logic for single financial transactions
 */
export class TransactionService {
  static async getTransactions(): Promise<TransactionWithRelations[]> {
    return DataService.fetchTransactions();
  }

  static async saveSingleTransaction(
    tx: Omit<Transaction, 'id'> & { id?: string },
    splits?: Omit<TransactionSplit, 'id' | 'transaction_id'>[]
  ): Promise<Transaction> {
    const isSplit = Boolean(splits && splits.length > 0);
    const amount = Number(tx.amount) || 0;

    if (isSplit && splits) {
      const splitsSum = splits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
      const diff = Math.abs(splitsSum - amount);
      if (diff > 0.01) {
        throw new Error(`A soma dos valores divididos (R$ ${splitsSum.toFixed(2)}) deve ser exatamente igual ao valor total (R$ ${amount.toFixed(2)}).`);
      }
    }

    const payload: Transaction = {
      ...tx,
      id: tx.id || crypto.randomUUID(),
      description: tx.description?.trim(),
      observation: tx.observation?.trim(),
      amount,
      is_split: isSplit,
      category_id: isSplit ? (splits![0]?.category_id || tx.category_id) : tx.category_id,
    };

    const savedTx = await DataService.upsertTransaction(payload);

    if (isSplit && splits) {
      await DataService.saveTransactionSplits(savedTx.id, splits);
    } else if (tx.id) {
      // Clear splits if transaction was changed from split to simple
      await DataService.saveTransactionSplits(savedTx.id, []);
    }

    return savedTx;
  }

  static async deleteTransaction(id: string): Promise<void> {
    return DataService.deleteTransaction(id);
  }
}
