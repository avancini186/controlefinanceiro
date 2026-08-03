import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClassificationService } from '../../services/financial/ClassificationService';
import { DataService } from '../../services/DataService';
import { CategoryType, TransactionType, TransactionStatus } from '../../types/enums';

vi.mock('../../services/DataService');

describe('ClassificationService - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should suggest correct category and probability based on historical transactions', async () => {
    vi.mocked(DataService.selectAll).mockResolvedValue([
      { id: 'cat_fuel', nome: 'Combustível', icone: 'GasPump', cor: '#ff0000', tipo: CategoryType.DESPESA },
      { id: 'cat_market', nome: 'Supermercado', icone: 'Cart', cor: '#00ff00', tipo: CategoryType.DESPESA },
    ] as any);

    vi.mocked(DataService.getTransactionsWithSplitsAndCategory).mockResolvedValue([
      {
        id: 'tx1',
        tipo: TransactionType.DESPESA,
        valor: 150,
        data: '2026-08-01',
        categoria_id: 'cat_fuel',
        descricao: 'Posto Shell Ipiranga',
        status: TransactionStatus.CONCLUIDO,
      },
      {
        id: 'tx2',
        tipo: TransactionType.DESPESA,
        valor: 200,
        data: '2026-08-02',
        categoria_id: 'cat_fuel',
        descricao: 'Posto Shell Av Paulista',
        status: TransactionStatus.CONCLUIDO,
      },
      {
        id: 'tx3',
        tipo: TransactionType.DESPESA,
        valor: 50,
        data: '2026-08-03',
        categoria_id: 'cat_market',
        descricao: 'Mercado Carrefour',
        status: TransactionStatus.CONCLUIDO,
      },
    ] as any);

    const suggestions = await ClassificationService.suggestCategory('Posto Shell');

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].category.nome).toBe('Combustível');
    expect(suggestions[0].probability).toBe(100);
  });
});
