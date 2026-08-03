import { TransactionService } from './TransactionService';
import { CategoryService } from './CategoryService';
import type { Category } from '../../types';

export interface CategorySuggestion {
  categoryId: string;
  category: Category;
  probability: number; // 0 to 100 percentage
  count: number;
}

export class ClassificationService {
  /**
   * Normalizes text string for token matching (removes accents, numbers, punctuation, lowercases).
   */
  private static normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim();
  }

  /**
   * Analyzes description/merchant against past transaction classification history
   * and returns top probability category suggestions.
   */
  static async suggestCategory(description: string): Promise<CategorySuggestion[]> {
    if (!description || !description.trim()) {
      return [];
    }

    const cleanInput = this.normalizeText(description);
    const inputTokens = cleanInput.split(/\s+/).filter((t) => t.length > 2);

    const [allTransactions, allCategories] = await Promise.all([
      TransactionService.getAll(),
      CategoryService.getAll(),
    ]);

    const categoryMap = new Map<string, Category>(allCategories.map((c) => [c.id, c]));
    const categoryCounts = new Map<string, number>();
    let totalMatches = 0;

    for (const tx of allTransactions) {
      if (!tx.categoriaId || !categoryMap.has(tx.categoriaId)) continue;

      const cleanTxDesc = this.normalizeText(tx.descricao);
      const txTokens = cleanTxDesc.split(/\s+/).filter((t) => t.length > 2);

      // Check exact substring match or shared token matches
      let isMatch = false;

      if (cleanInput.includes(cleanTxDesc) || cleanTxDesc.includes(cleanInput)) {
        isMatch = true;
      } else {
        const sharedTokens = inputTokens.filter((token) => txTokens.includes(token));
        if (sharedTokens.length > 0) {
          isMatch = true;
        }
      }

      if (isMatch) {
        const catId = tx.categoriaId;
        const currentCount = categoryCounts.get(catId) || 0;
        categoryCounts.set(catId, currentCount + 1);
        totalMatches++;
      }
    }

    if (totalMatches === 0) {
      return [];
    }

    const suggestions: CategorySuggestion[] = [];
    categoryCounts.forEach((count, catId) => {
      const category = categoryMap.get(catId);
      if (category) {
        const probability = Math.round((count / totalMatches) * 100);
        suggestions.push({
          categoryId: catId,
          category,
          probability,
          count,
        });
      }
    });

    // Sort by highest probability first
    return suggestions.sort((a, b) => b.probability - a.probability);
  }
}
