import { DataService } from '../dataService';
import type { BudgetCategory } from '../../types/database';

/**
 * BudgetService - Domain business logic for budget categories
 */
export class BudgetService {
  static async getBudgetCategories(): Promise<BudgetCategory[]> {
    return DataService.fetchBudgetCategories();
  }

  static async saveBudgetCategory(item: Omit<BudgetCategory, 'id'> & { id?: string }): Promise<BudgetCategory> {
    const payload: BudgetCategory = {
      ...item,
      id: item.id || crypto.randomUUID(),
      name: item.name.trim(),
    };
    return DataService.upsertBudgetCategory(payload);
  }

  static async deleteBudgetCategory(id: string): Promise<void> {
    return DataService.deleteBudgetCategory(id);
  }
}
