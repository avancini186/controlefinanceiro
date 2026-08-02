import { DataService } from '../dataService';
import type { Category } from '../../types/database';

/**
 * CategoryService - Domain business logic for categories
 */
export class CategoryService {
  static async getCategories(): Promise<Category[]> {
    return DataService.fetchCategories();
  }

  static async saveCategory(category: Omit<Category, 'id'> & { id?: string }): Promise<Category> {
    const payload: Category = {
      ...category,
      id: category.id || crypto.randomUUID(),
      name: category.name.trim(),
    };
    return DataService.upsertCategory(payload);
  }

  static async deleteCategory(id: string): Promise<void> {
    return DataService.deleteCategory(id);
  }
}
