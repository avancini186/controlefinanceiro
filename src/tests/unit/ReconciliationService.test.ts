import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReconciliationService } from '../../services/financial/ReconciliationService';
import { DataService } from '../../services/DataService';
import { TransactionType, TransactionStatus, AccountType } from '../../types/enums';

vi.mock('../../services/DataService');

describe('ReconciliationService - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate reconciliation summary correctly separating reconciled and pending items', async () => {
    vi.mocked(DataService.selectById).mockResolvedValue({
      id: 'acc1',
      nome: 'Itaú',
      tipo: AccountType.CONTA_CORRENTE,
      saldo_inicial: 1000,
      saldo_atual: 1200,
      ativa: true,
    } as any);

    vi.mocked(DataService.getTransactionsWithSplitsAndCategory).mockResolvedValue([
      {
        id: 'tx1',
        tipo: TransactionType.RECEITA,
        valor: 300,
        data: '2026-08-01',
        conta_id: 'acc1',
        conciliada: true,
        status: TransactionStatus.CONCLUIDO,
      },
      {
        id: 'tx2',
        tipo: TransactionType.DESPESA,
        valor: 100,
        data: '2026-08-02',
        conta_id: 'acc1',
        conciliada: false,
        status: TransactionStatus.CONCLUIDO,
      },
    ] as any);

    const summary = await ReconciliationService.getReconciliationSummary('acc1');

    // Reconciled = initial 1000 + 300 = 1300
    expect(summary.saldoConciliado).toBe(1300);
    expect(summary.qtdConciliada).toBe(1);
    expect(summary.qtdPendente).toBe(1);
  });
});
