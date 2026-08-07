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

    const summary = await DashboardService.getDashboardData('2026-08');

    expect(summary.balance.saldoTotal).toBe(2500);
    expect(summary.monthlyCashFlow).toHaveLength(6);
    expect(summary.monthlyCashFlow[5].saldoLiquido).toBe(600); // 1000 - 400
  });

  it('should filter topCategories strictly by selected month and calculate percentages based on that month only', async () => {
    vi.mocked(BalanceService.calculateSummary).mockResolvedValue({
      saldoTotal: 5000,
      totalReceitas: 10000,
      totalDespesas: 2000,
      saldoContas: 5000,
      faturasPendentes: 0,
    });

    vi.mocked(DataService.selectAll).mockImplementation(async (table) => {
      if (table === 'contas') return [];
      if (table === 'cartoes') return [];
      if (table === 'categorias') {
        return [
          { id: 'cat1', nome: 'Mercado', tipo: 'DESPESA', cor: '#ff0000' },
          { id: 'cat2', nome: 'Farmácia', tipo: 'DESPESA', cor: '#00ff00' },
          { id: 'cat3', nome: 'Lazer', tipo: 'DESPESA', cor: '#0000ff' },
        ] as any;
      }
      return [] as any;
    });

    // Mock transactions spanning different months (June, July, August 2026)
    vi.mocked(DataService.getTransactionsWithSplitsAndCategory).mockResolvedValue([
      // August 2026 despesas (Total: 2000 => Mercado: 1500 (75%), Farmácia: 500 (25%))
      {
        id: 'tx1',
        tipo: 'DESPESA',
        valor: 1500,
        data: '2026-08-10',
        categoria_id: 'cat1',
        status: 'CONCLUIDO',
        category: { id: 'cat1', nome: 'Mercado', tipo: 'DESPESA', cor: '#ff0000' },
      },
      {
        id: 'tx2',
        tipo: 'DESPESA',
        valor: 500,
        data: '2026-08-15',
        categoria_id: 'cat2',
        status: 'CONCLUIDO',
        category: { id: 'cat2', nome: 'Farmácia', tipo: 'DESPESA', cor: '#00ff00' },
      },
      // June 2026 despesa (Lazer) - should be completely ignored when viewing August
      {
        id: 'tx3',
        tipo: 'DESPESA',
        valor: 9999,
        data: '2026-06-20',
        categoria_id: 'cat3',
        status: 'CONCLUIDO',
        category: { id: 'cat3', nome: 'Lazer', tipo: 'DESPESA', cor: '#0000ff' },
      },
      // Cancelled August despesa - should be ignored
      {
        id: 'tx4',
        tipo: 'DESPESA',
        valor: 3000,
        data: '2026-08-01',
        categoria_id: 'cat3',
        status: 'CANCELADO',
        category: { id: 'cat3', nome: 'Lazer', tipo: 'DESPESA', cor: '#0000ff' },
      },
    ] as any);

    const dataAugust = await DashboardService.getDashboardData('2026-08');

    // Only Mercado (1500) and Farmácia (500) should appear for August 2026
    expect(dataAugust.topCategories).toHaveLength(2);
    expect(dataAugust.topCategories[0].category.nome).toBe('Mercado');
    expect(dataAugust.topCategories[0].total).toBe(1500);
    expect(dataAugust.topCategories[0].percentage).toBe(75); // 1500 / 2000 = 75%

    expect(dataAugust.topCategories[1].category.nome).toBe('Farmácia');
    expect(dataAugust.topCategories[1].total).toBe(500);
    expect(dataAugust.topCategories[1].percentage).toBe(25); // 500 / 2000 = 25%

    // Category Lazer (June expense) must NOT appear in August 2026
    const lazerCat = dataAugust.topCategories.find((c) => c.category.nome === 'Lazer');
    expect(lazerCat).toBeUndefined();
  });

  it('should return empty topCategories when selected month has no despesas', async () => {
    vi.mocked(BalanceService.calculateSummary).mockResolvedValue({
      saldoTotal: 5000,
      totalReceitas: 0,
      totalDespesas: 0,
      saldoContas: 5000,
      faturasPendentes: 0,
    });

    vi.mocked(DataService.selectAll).mockImplementation(async (table) => {
      if (table === 'categorias') {
        return [{ id: 'cat1', nome: 'Mercado', tipo: 'DESPESA', cor: '#ff0000' }] as any;
      }
      return [] as any;
    });

    vi.mocked(DataService.getTransactionsWithSplitsAndCategory).mockResolvedValue([
      // Only June despesa exists
      {
        id: 'tx1',
        tipo: 'DESPESA',
        valor: 500,
        data: '2026-06-10',
        categoria_id: 'cat1',
        status: 'CONCLUIDO',
      },
    ] as any);

    const dataSept = await DashboardService.getDashboardData('2026-09');

    expect(dataSept.topCategories).toHaveLength(0);
  });
});
