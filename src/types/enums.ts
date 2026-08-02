/**
 * Application Domain Enums / Constant Objects
 * Compatible with erasableSyntaxOnly mode.
 * Eliminates magic strings across the financial manager application.
 */

export const TransactionType = {
  INCOME: 'income',
  EXPENSE: 'expense',
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const TransactionStatus = {
  COMPLETED: 'completed',
  PENDING: 'pending',
  CANCELED: 'canceled',
} as const;
export type TransactionStatus = (typeof TransactionStatus)[keyof typeof TransactionStatus];

export const AccountType = {
  CHECKING: 'checking',
  SAVINGS: 'savings',
  INVESTMENT: 'investment',
  CASH: 'cash',
} as const;
export type AccountType = (typeof AccountType)[keyof typeof AccountType];

export const CardType = {
  CREDIT: 'credit',
  DEBIT: 'debit',
} as const;
export type CardType = (typeof CardType)[keyof typeof CardType];

export const BudgetPeriod = {
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  WEEKLY: 'weekly',
} as const;
export type BudgetPeriod = (typeof BudgetPeriod)[keyof typeof BudgetPeriod];

export const InstallmentStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
} as const;
export type InstallmentStatus = (typeof InstallmentStatus)[keyof typeof InstallmentStatus];
