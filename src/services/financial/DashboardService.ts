import { BalanceService } from './BalanceService';
import { TransactionService } from './TransactionService';
import { AccountService } from './AccountService';
import { CreditCardService } from './CreditCardService';
import { CategoryService } from './CategoryService';
import type {
  DashboardSummary,
  MonthlyCashFlowPoint,
  NetWorthEvolutionPoint,
  AccountDistributionPoint,
  CardDistributionPoint,
} from '../../types';
import { CategoryType } from '../../types/enums';

export class DashboardService {
  /**
   * Aggregates and calculates all metrics for the advanced dashboard view.
   * STRICT CONSTRAINT: All financial logic, cash flow trends, net worth evolution,
   * category breakdowns, account/card distributions, and balance projections
   * are computed EXCLUSIVELY in this service. ZERO calculation in UI components.
   */
  static async getDashboardData(): Promise<DashboardSummary> {
    const balance = await BalanceService.calculateSummary();
    const allTransactions = await TransactionService.getAll();
    const recentTransactions = allTransactions.slice(0, 10);

    // Accounts summary & balances
    const rawAccounts = await AccountService.getAll();
    const accountsSummary = await Promise.all(
      rawAccounts.map(async (acc) => ({
        ...acc,
        saldoAtual: await BalanceService.calculateAccountBalance(acc.id),
      }))
    );

    // Cards summary & invoice totals
    const rawCards = await CreditCardService.getAll();
    const creditCardsSummary = await Promise.all(
      rawCards.map(async (card) => ({
        ...card,
        faturaAtual: await BalanceService.calculateCurrentInvoice(card.id),
        faturaProxima: await BalanceService.calculateNextInvoice(card.id),
      }))
    );

    // Top Expense Categories (including splits)
    const categories = await CategoryService.getAll(CategoryType.DESPESA);
    const categoryTotals = new Map<string, number>();
    let totalExpenseSum = 0;

    for (const tx of allTransactions) {
      if (tx.tipo !== 'DESPESA') continue;

      if (tx.splits && tx.splits.length > 0) {
        for (const sp of tx.splits) {
          const prev = categoryTotals.get(sp.categoryId) || 0;
          categoryTotals.set(sp.categoryId, prev + sp.amount);
          totalExpenseSum += sp.amount;
        }
      } else if (tx.categoriaId) {
        const prev = categoryTotals.get(tx.categoriaId) || 0;
        categoryTotals.set(tx.categoriaId, prev + tx.valor);
        totalExpenseSum += tx.valor;
      }
    }

    const topCategories = categories
      .map((cat) => {
        const total = categoryTotals.get(cat.id) || 0;
        const percentage = totalExpenseSum > 0 ? Number(((total / totalExpenseSum) * 100).toFixed(1)) : 0;
        return { category: cat, total, percentage };
      })
      .filter((tc) => tc.total > 0)
      .sort((a, b) => b.total - a.total);

    // 1. Monthly Cash Flow (Past 6 Months)
    const monthlyCashFlow: MonthlyCashFlowPoint[] = [];
    const netWorthEvolution: NetWorthEvolutionPoint[] = [];
    const now = new Date();

    let cumulativeNetWorth = balance.saldoTotal;

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const monthLabel = `${y}-${String(m).padStart(2, '0')}`;

      const rec = await BalanceService.calculateMonthlyIncome(m, y);
      const desp = await BalanceService.calculateMonthlyExpense(m, y);
      const saldoLiquido = Number((rec - desp).toFixed(2));

      monthlyCashFlow.push({
        monthLabel,
        receitas: rec,
        despesas: desp,
        saldoLiquido,
      });

      // Simple trend calculation for net worth history
      cumulativeNetWorth += saldoLiquido;
      netWorthEvolution.push({
        monthLabel,
        patrimonio: Number(cumulativeNetWorth.toFixed(2)),
      });
    }

    // 2. Account Balance Distribution
    const activeAccountTotal = accountsSummary.reduce((a, b) => a + Math.max(0, b.saldoAtual), 0);
    const accountDistribution: AccountDistributionPoint[] = accountsSummary.map((acc) => ({
      accountName: acc.nome,
      color: acc.cor,
      balance: acc.saldoAtual,
      percentage: activeAccountTotal > 0 ? Number(((Math.max(0, acc.saldoAtual) / activeAccountTotal) * 100).toFixed(1)) : 0,
    }));

    // 3. Credit Card Invoice Distribution
    const cardDistribution: CardDistributionPoint[] = creditCardsSummary.map((card) => {
      const invoice = card.faturaAtual || 0;
      const limit = card.limite || 1;
      const pct = Math.min(100, Number(((invoice / limit) * 100).toFixed(1)));
      return {
        cardName: card.nome,
        color: card.cor,
        invoiceTotal: invoice,
        limit: card.limite,
        percentage: pct,
      };
    });

    // 4. Projected Future Balance (BalanceService.calculateFutureBalance)
    const projectedBalance = await BalanceService.calculateFutureBalance(1);

    return {
      balance,
      recentTransactions,
      topCategories,
      accountsSummary,
      creditCardsSummary,
      monthlyCashFlow,
      netWorthEvolution,
      accountDistribution,
      cardDistribution,
      projectedBalance,
    };
  }
}
