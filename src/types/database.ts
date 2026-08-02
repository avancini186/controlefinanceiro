import { 
  TransactionType, 
  TransactionStatus, 
  AccountType, 
  CardType, 
  BudgetPeriod, 
  InstallmentStatus 
} from './enums';

export { 
  TransactionType, 
  TransactionStatus, 
  AccountType, 
  CardType, 
  BudgetPeriod, 
  InstallmentStatus 
};

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
  period?: BudgetPeriod;
  created_at?: string;
}

export interface Account {
  id: string;
  name: string;
  bank: string;
  type?: AccountType;
  initial_balance: number;
  color: string;
  created_at?: string;
}

export interface CreditCard {
  id: string;
  name: string;
  bank: string;
  type?: CardType;
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
  status?: InstallmentStatus;
  created_at?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  status?: TransactionStatus;
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

export interface CreateInstallmentParams {
  description: string;
  total_amount: number;
  installments_count: number;
  first_date: string;
  category_id: string;
  card_id: string;
  observation?: string;
}
