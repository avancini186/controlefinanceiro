import { DataService } from '../DataService';
import { CategoryService } from './CategoryService';
import type { BudgetCategory } from '../../types';

export class BudgetService {
  /**
   * Retrieves budget limits for a given month/year (YYYY-MM).
   */
  static async getBudgetsByPeriod(anoMes: string): Promise<BudgetCategory[]> {
    const rows = await DataService.selectAll('categorias_orcamento', {
      column: 'ano_mes',
      value: anoMes,
    });
    const categories = await CategoryService.getAll();
    const categoryMap = new Map(categories.map((c) => [c.id, c]));

    return rows.map((r) => ({
      id: r.id,
      categoriaId: r.categoria_id,
      limiteMensal: Number(r.limite_mensal),
      anoMes: r.ano_mes,
      createdAt: r.created_at,
      category: categoryMap.get(r.categoria_id),
    }));
  }

  /**
   * Sets or updates a budget limit for a category in a specific month.
   */
  static async setBudget(categoriaId: string, limiteMensal: number, anoMes: string): Promise<BudgetCategory> {
    const existing = await DataService.selectAll('categorias_orcamento', {
      column: 'ano_mes',
      value: anoMes,
    });
    const match = existing.find((b) => b.categoria_id === categoriaId);

    if (match) {
      const updated = await DataService.update('categorias_orcamento', match.id, {
        limite_mensal: limiteMensal,
      });
      const category = await CategoryService.getById(categoriaId);
      return {
        id: updated.id,
        categoriaId: updated.categoria_id,
        limiteMensal: Number(updated.limite_mensal),
        anoMes: updated.ano_mes,
        createdAt: updated.created_at,
        category: category || undefined,
      };
    }

    const created = await DataService.insert('categorias_orcamento', {
      categoria_id: categoriaId,
      limite_mensal: limiteMensal,
      ano_mes: anoMes,
    });
    const category = await CategoryService.getById(categoriaId);
    return {
      id: created.id,
      categoriaId: created.categoria_id,
      limiteMensal: Number(created.limite_mensal),
      anoMes: created.ano_mes,
      createdAt: created.created_at,
      category: category || undefined,
    };
  }

  /**
   * Removes a budget category configuration.
   */
  static async deleteBudget(id: string): Promise<boolean> {
    return await DataService.delete('categorias_orcamento', id);
  }
}
