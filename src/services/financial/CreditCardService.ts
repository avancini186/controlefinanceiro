import { DataService } from '../dataService';
import type { CreditCard } from '../../types/database';

/**
 * CreditCardService - Domain business logic for credit cards
 */
export class CreditCardService {
  static async getCreditCards(): Promise<CreditCard[]> {
    return DataService.fetchCreditCards();
  }

  static async saveCreditCard(item: Omit<CreditCard, 'id'> & { id?: string }): Promise<CreditCard> {
    const payload: CreditCard = {
      ...item,
      id: item.id || crypto.randomUUID(),
      name: item.name.trim(),
      bank: item.bank.trim(),
      limit_amount: Number(item.limit_amount) || 0,
      closing_day: Number(item.closing_day),
      due_day: Number(item.due_day),
    };
    return DataService.upsertCreditCard(payload);
  }

  static async deleteCreditCard(id: string): Promise<void> {
    return DataService.deleteCreditCard(id);
  }
}
