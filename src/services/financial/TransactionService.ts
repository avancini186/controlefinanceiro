import { DataService } from '../dataService';
import type { Transaction, TransactionWithRelations } from '../../types/database';

/**
 * TransactionService - Domain business logic for single financial transactions
 */
export class TransactionService {
  static async getTransactions(): Promise<TransactionWithRelations[]> {
    return DataService.fetchTransactions();
  }

  static async saveSingleTransaction(tx: Omit<Transaction, 'id'> & { id?: string }): Promise<Transaction> {
    const payload: Transaction = {
      ...tx,
      id: tx.id || crypto.randomUUID(),
      description: tx.description?.trim(),
      observation: tx.observation?.trim(),
      amount: Number(tx.amount) || 0,
    };
    return DataService.upsertTransaction(payload);
  }

  static async deleteTransaction(id: string): Promise<void> {
    return DataService.deleteTransaction(id);
  }
}
