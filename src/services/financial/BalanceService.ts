import { TransactionService } from './TransactionService';
import { AccountService } from './AccountService';
import { CreditCardService } from './CreditCardService';
import type { BalanceSummary } from '../../types';
import { TransactionType, TransactionStatus } from '../../types/enums';

export class BalanceService {
  /**
   * Calculates current real-time balance for a specific bank/financial account.
   * Uses structured direcaoTransferencia ('ENTRADA' / 'SAIDA') for transfers instead of description strings.
   */
  static async calculateAccountBalance(contaId: string): Promise<number> {
    const account = await AccountService.getById(contaId);
    if (!account) return 0;

    const transactions = await TransactionService.getAll({ contaId });

    let balance = account.saldoInicial;
    for (const tx of transactions) {
      if (tx.status !== TransactionStatus.CONCLUIDO) continue;

      if (tx.tipo === TransactionType.RECEITA) {
        balance += tx.valor;
      } else if (tx.tipo === TransactionType.DESPESA) {
        balance -= tx.valor;
      } else if (tx.tipo === TransactionType.TRANSFERENCIA) {
        // Structured evaluation based exclusively on direcaoTransferencia attribute
        if (tx.direcaoTransferencia === 'ENTRADA') {
          balance += tx.valor;
        } else if (tx.direcaoTransferencia === 'SAIDA') {
          balance -= tx.valor;
        }
      }
    }

    return Number(balance.toFixed(2));
  }

  /**
   * Calculates the date range [startISO, endISO] for current and next invoices based on diaFechamento.
   */
  private static getInvoiceDateRanges(diaFechamento: number, refDate = new Date()) {
    const year = refDate.getFullYear();
    const month = refDate.getMonth(); // 0-indexed
    const day = refDate.getDate();

    // Closing date in current reference month
    const closingCurrentMonth = new Date(year, month, diaFechamento, 23, 59, 59, 999);

    let currentStart: Date;
    let currentEnd: Date;
    let nextStart: Date;
    let nextEnd: Date;

    if (day <= diaFechamento) {
      // Current invoice is for current month
      currentStart = new Date(year, month - 1, diaFechamento + 1, 0, 0, 0, 0);
      currentEnd = closingCurrentMonth;

      nextStart = new Date(year, month, diaFechamento + 1, 0, 0, 0, 0);
      nextEnd = new Date(year, month + 1, diaFechamento, 23, 59, 59, 999);
    } else {
      // Current invoice is already for next month
      currentStart = new Date(year, month, diaFechamento + 1, 0, 0, 0, 0);
      currentEnd = new Date(year, month + 1, diaFechamento, 23, 59, 59, 999);

      nextStart = new Date(year, month + 1, diaFechamento + 1, 0, 0, 0, 0);
      nextEnd = new Date(year, month + 2, diaFechamento, 23, 59, 59, 999);
    }

    const toISODate = (d: Date) => d.toISOString().split('T')[0];

    return {
      currentStart: toISODate(currentStart),
      currentEnd: toISODate(currentEnd),
      nextStart: toISODate(nextStart),
      nextEnd: toISODate(nextEnd),
    };
  }

  /**
   * Calculates the current open invoice total for a credit card.
   */
  static async calculateCurrentInvoice(cartaoId: string, refDate = new Date()): Promise<number> {
    const card = await CreditCardService.getById(cartaoId);
    if (!card) return 0;

    const ranges = this.getInvoiceDateRanges(card.diaFechamento, refDate);
    const transactions = await TransactionService.getAll({ cartaoId });

    const currentInvoiceSum = transactions
      .filter(
        (tx) =>
          (tx.status === TransactionStatus.CONCLUIDO || tx.status === TransactionStatus.PENDENTE) &&
          tx.data >= ranges.currentStart &&
          tx.data <= ranges.currentEnd
      )
      .reduce((acc, curr) => acc + curr.valor, 0);

    return Number(currentInvoiceSum.toFixed(2));
  }

  /**
   * Calculates the next invoice total for a credit card.
   */
  static async calculateNextInvoice(cartaoId: string, refDate = new Date()): Promise<number> {
    const card = await CreditCardService.getById(cartaoId);
    if (!card) return 0;

    const ranges = this.getInvoiceDateRanges(card.diaFechamento, refDate);
    const transactions = await TransactionService.getAll({ cartaoId });

    const nextInvoiceSum = transactions
      .filter(
        (tx) =>
          (tx.status === TransactionStatus.CONCLUIDO || tx.status === TransactionStatus.PENDENTE) &&
          tx.data >= ranges.nextStart &&
          tx.data <= ranges.nextEnd
      )
      .reduce((acc, curr) => acc + curr.valor, 0);

    return Number(nextInvoiceSum.toFixed(2));
  }

  /**
   * Calculates the historical total sum of all purchases on a credit card.
   */
  static async calculateCardTotal(cartaoId: string): Promise<number> {
    const transactions = await TransactionService.getAll({ cartaoId });
    const totalSum = transactions
      .filter((tx) => tx.status === TransactionStatus.CONCLUIDO || tx.status === TransactionStatus.PENDENTE)
      .reduce((acc, curr) => acc + curr.valor, 0);

    return Number(totalSum.toFixed(2));
  }

  /**
   * Legacy alias calling calculateCurrentInvoice for backwards compatibility.
   */
  static async calculateCardBalance(cartaoId: string): Promise<number> {
    return await this.calculateCurrentInvoice(cartaoId);
  }

  /**
   * Calculates the global net worth (Sum of all active account balances).
   */
  static async calculateGlobalBalance(): Promise<number> {
    const accounts = await AccountService.getAll();
    let total = 0;
    for (const acc of accounts) {
      if (acc.ativa) {
        total += await this.calculateAccountBalance(acc.id);
      }
    }
    return Number(total.toFixed(2));
  }

  /**
   * Calculates total income for a given period (month and year).
   */
  static async calculateMonthlyIncome(month: number, year: number): Promise<number> {
    const transactions = await TransactionService.getAll();
    const formattedMonth = String(month).padStart(2, '0');
    const periodPrefix = `${year}-${formattedMonth}`;

    const incomeSum = transactions
      .filter(
        (tx) =>
          tx.tipo === TransactionType.RECEITA &&
          tx.status === TransactionStatus.CONCLUIDO &&
          tx.data.startsWith(periodPrefix)
      )
      .reduce((acc, curr) => acc + curr.valor, 0);

    return Number(incomeSum.toFixed(2));
  }

  /**
   * Calculates total expenses for a given period (month and year).
   */
  static async calculateMonthlyExpense(month: number, year: number): Promise<number> {
    const transactions = await TransactionService.getAll();
    const formattedMonth = String(month).padStart(2, '0');
    const periodPrefix = `${year}-${formattedMonth}`;

    const expenseSum = transactions
      .filter(
        (tx) =>
          tx.tipo === TransactionType.DESPESA &&
          tx.status === TransactionStatus.CONCLUIDO &&
          tx.data.startsWith(periodPrefix)
      )
      .reduce((acc, curr) => acc + curr.valor, 0);

    return Number(expenseSum.toFixed(2));
  }

  /**
   * Calculates liquid available balance (Global account balance minus current pending credit card invoices).
   */
  static async calculateAvailableBalance(): Promise<number> {
    const globalBalance = await this.calculateGlobalBalance();
    const cards = await CreditCardService.getAll();
    let currentInvoicesTotal = 0;

    for (const card of cards) {
      currentInvoicesTotal += await this.calculateCurrentInvoice(card.id);
    }

    return Number((globalBalance - currentInvoicesTotal).toFixed(2));
  }

  /**
   * Projects future balance taking into account PENDENTE transactions.
   */
  static async calculateFutureBalance(_monthsAhead = 1): Promise<number> {
    const currentAvailable = await this.calculateAvailableBalance();
    const transactions = await TransactionService.getAll();

    const futurePending = transactions
      .filter((tx) => tx.status === TransactionStatus.PENDENTE)
      .reduce((acc, curr) => {
        if (curr.tipo === TransactionType.RECEITA) return acc + curr.valor;
        if (curr.tipo === TransactionType.DESPESA) return acc - curr.valor;
        return acc;
      }, 0);

    return Number((currentAvailable + futurePending).toFixed(2));
  }

  /**
   * Overall balance summary aggregator. Dashboard uses calculateCurrentInvoice exclusively.
   */
  static async calculateSummary(period?: { month: number; year: number }): Promise<BalanceSummary> {
    const now = new Date();
    const month = period?.month || now.getMonth() + 1;
    const year = period?.year || now.getFullYear();

    const globalBalance = await this.calculateGlobalBalance();
    const totalReceitas = await this.calculateMonthlyIncome(month, year);
    const totalDespesas = await this.calculateMonthlyExpense(month, year);

    const cards = await CreditCardService.getAll();
    let faturasPendentes = 0;
    for (const card of cards) {
      faturasPendentes += await this.calculateCurrentInvoice(card.id);
    }

    return {
      saldoTotal: globalBalance,
      totalReceitas,
      totalDespesas,
      saldoContas: globalBalance,
      faturasPendentes: Number(faturasPendentes.toFixed(2)),
    };
  }
}
