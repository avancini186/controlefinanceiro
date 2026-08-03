import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardService } from '../../services/financial/DashboardService';
import { DataService } from '../../services/DataService';
import { BalanceService } from '../../services/financial/BalanceService';

vi.mock('../../services/DataService');
vi.mock('../../services/financial/BalanceService');

describe('DashboardService - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should compile dashboard metrics and cash flow points', async () => {
    vi.mocked(BalanceService.calculateSummary).mockResolvedValue({
      saldoTotal: 2500,
      totalReceitas: 3000,
      totalDespesas: 500,
      saldoContas: 2500,
      faturasPendentes: 0,
    });

    vi.mocked(DataService.selectAll).mockImplementation(async (table) => {
      if (table === 'contas') {
        return [{ id: 'acc1', nome: 'Itaú', cor: '#000', saldo_inicial: 2500, saldo_atual: 2500, ativa: true }] as any;
      }
      if (table === 'cartoes') {
        return [] as any;
      }
      if (table === 'categorias') {
        return [] as any;
      }
      return [] as any;
    });

    vi.mocked(DataService.getTransactionsWithSplitsAndCategory).mockResolvedValue([]);
    vi.mocked(BalanceService.calculateAccountBalance).mockResolvedValue(2500);
    vi.mocked(BalanceService.calculateMonthlyIncome).mockResolvedValue(1000);
    vi.mocked(BalanceService.calculateMonthlyExpense).mockResolvedValue(400);
    vi.mocked(BalanceService.calculateFutureBalance).mockResolvedValue(2500);

    const summary = await DashboardService.getDashboardData();

    expect(summary.balance.saldoTotal).toBe(2500);
    expect(summary.monthlyCashFlow).toHaveLength(6);
    expect(summary.monthlyCashFlow[5].saldoLiquido).toBe(600); // 1000 - 400
  });
});
