import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionService } from '../../services/financial/TransactionService';
import { DataService } from '../../services/DataService';
import { TransactionType, TransactionStatus } from '../../types/enums';

vi.mock('../../services/DataService');

describe('TransactionService - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a transaction successfully when splits match the total amount', async () => {
    vi.mocked(DataService.insert).mockResolvedValue({
      id: 'tx100',
      tipo: TransactionType.DESPESA,
      valor: 150,
      data: '2026-08-01',
      descricao: 'Mercado e Limpeza',
      status: TransactionStatus.CONCLUIDO,
      created_at: new Date().toISOString(),
    } as any);

    vi.mocked(DataService.insertMany).mockResolvedValue([
      { id: 'sp1', transacao_id: 'tx100', categoria_id: 'cat1', valor: 100 },
      { id: 'sp2', transacao_id: 'tx100', categoria_id: 'cat2', valor: 50 },
    ] as any);

    const result = await TransactionService.create(
      {
        tipo: TransactionType.DESPESA,
        valor: 150,
        data: '2026-08-01',
        descricao: 'Mercado e Limpeza',
        status: TransactionStatus.CONCLUIDO,
      },
      [
        { categoryId: 'cat1', amount: 100, description: 'Mercado' },
        { categoryId: 'cat2', amount: 50, description: 'Limpeza' },
      ]
    );

    expect(result.id).toBe('tx100');
    expect(result.splits).toHaveLength(2);
    expect(result.splits?.[0].amount).toBe(100);
  });

  it('should throw an error when split amounts sum does not match transaction total', async () => {
    await expect(
      TransactionService.create(
        {
          tipo: TransactionType.DESPESA,
          valor: 150,
          data: '2026-08-01',
          descricao: 'Divergente',
          status: TransactionStatus.CONCLUIDO,
        },
        [
          { categoryId: 'cat1', amount: 100 },
          { categoryId: 'cat2', amount: 40 }, // Sum is 140 != 150
        ]
      )
    ).rejects.toThrow('A soma dos splits deve ser exatamente igual ao valor total da transação');
  });
});
