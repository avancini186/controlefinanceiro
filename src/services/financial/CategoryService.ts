import { DataService } from '../DataService';
import type { Category } from '../../types';
import { CategoryType } from '../../types/enums';

export class CategoryService {
  /**
   * Retrieves all categories, optionally filtered by type.
   */
  static async getAll(type?: CategoryType): Promise<Category[]> {
    const rows = await DataService.selectAll(
      'categorias',
      type ? { column: 'tipo', value: type } : undefined
    );
    return rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      icone: r.icone,
      cor: r.cor,
      tipo: r.tipo as CategoryType,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  /**
   * Retrieves a category by ID.
   */
  static async getById(id: string): Promise<Category | null> {
    const r = await DataService.selectById('categorias', id);
    if (!r) return null;
    return {
      id: r.id,
      nome: r.nome,
      icone: r.icone,
      cor: r.cor,
      tipo: r.tipo as CategoryType,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }

  /**
   * Creates a new category.
   */
  static async create(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    const created = await DataService.insert('categorias', {
      nome: category.nome,
      icone: category.icone || 'Tag',
      cor: category.cor || '#64748b',
      tipo: category.tipo,
    });
    return {
      id: created.id,
      nome: created.nome,
      icone: created.icone,
      cor: created.cor,
      tipo: created.tipo as CategoryType,
      createdAt: created.created_at,
      updatedAt: created.updated_at,
    };
  }

  /**
   * Updates an existing category.
   */
  static async update(id: string, category: Partial<Category>): Promise<Category> {
    const updated = await DataService.update('categorias', id, {
      ...(category.nome && { nome: category.nome }),
      ...(category.icone && { icone: category.icone }),
      ...(category.cor && { cor: category.cor }),
      ...(category.tipo && { tipo: category.tipo }),
    });
    return {
      id: updated.id,
      nome: updated.nome,
      icone: updated.icone,
      cor: updated.cor,
      tipo: updated.tipo as CategoryType,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  }

  /**
   * Deletes a category.
   */
  static async delete(id: string): Promise<boolean> {
    return await DataService.delete('categorias', id);
  }
}
