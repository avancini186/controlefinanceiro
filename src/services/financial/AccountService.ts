import { DataService } from '../dataService';
import type { Account } from '../../types/database';

/**
 * AccountService - Domain business logic for bank accounts
 */
export class AccountService {
  static async getAccounts(): Promise<Account[]> {
    return DataService.fetchAccounts();
  }

  static async saveAccount(item: Omit<Account, 'id'> & { id?: string }): Promise<Account> {
    const payload: Account = {
      ...item,
      id: item.id || crypto.randomUUID(),
      name: item.name.trim(),
      bank: item.bank.trim(),
      initial_balance: Number(item.initial_balance) || 0,
    };
    return DataService.upsertAccount(payload);
  }

  static async deleteAccount(id: string): Promise<void> {
    return DataService.deleteAccount(id);
  }
}
