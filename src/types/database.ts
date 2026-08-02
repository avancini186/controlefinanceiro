export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
  icon: string;
  created_at?: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at?: string;
}

export interface Account {
  id: string;
  name: string;
  bank: string;
  initial_balance: number;
  color: string;
  created_at?: string;
}

export interface CreditCard {
  id: string;
  name: string;
  bank: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
  color: string;
  created_at?: string;
}

export interface InstallmentGroup {
  id: string;
  description: string;
  total_amount: number;
  installments_count: number;
  created_at?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // YYYY-MM-DD
  category_id: string;
  account_id?: string | null;
  card_id?: string | null;
  description?: string;
  observation?: string;
  installment_group_id?: string | null;
  installment_number?: string | null; // e.g. "1/12"
  created_at?: string;
}

export interface TransactionWithRelations extends Transaction {
  category?: Category;
  account?: Account;
  card?: CreditCard;
  installment_group?: InstallmentGroup;
}
