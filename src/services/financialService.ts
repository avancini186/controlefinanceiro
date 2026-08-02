import { DataService } from './dataService';
import type { 
  Category, 
  BudgetCategory, 
  Account, 
  CreditCard, 
  Transaction, 
  InstallmentGroup,
  TransactionWithRelations 
} from '../types/database';

export interface CreateInstallmentParams {
  description: string;
  total_amount: number;
  installments_count: number;
  first_date: string;
  category_id: string;
  card_id: string;
  observation?: string;
}

/**
 * FinancialService - Business Logic Domain Layer
 * Responsible for financial rules, calculations, payload preparation, and validations.
 * Communicates ONLY with DataService for data persistence.
 */
export class FinancialService {
  // --- CATEGORIES DOMAIN LOGIC ---
  static async getCategories(): Promise<Category[]> {
    return DataService.fetchCategories();
  }

  static async saveCategory(category: Omit<Category, 'id'> & { id?: string }): Promise<Category> {
    const payload: Category = {
      ...category,
      id: category.id || crypto.randomUUID(),
      name: category.name.trim(),
    };
    return DataService.upsertCategory(payload);
  }

  static async deleteCategory(id: string): Promise<void> {
    return DataService.deleteCategory(id);
  }

  // --- BUDGET CATEGORIES DOMAIN LOGIC ---
  static async getBudgetCategories(): Promise<BudgetCategory[]> {
    return DataService.fetchBudgetCategories();
  }

  static async saveBudgetCategory(item: Omit<BudgetCategory, 'id'> & { id?: string }): Promise<BudgetCategory> {
    const payload: BudgetCategory = {
      ...item,
      id: item.id || crypto.randomUUID(),
      name: item.name.trim(),
    };
    return DataService.upsertBudgetCategory(payload);
  }

  static async deleteBudgetCategory(id: string): Promise<void> {
    return DataService.deleteBudgetCategory(id);
  }

  // --- ACCOUNTS DOMAIN LOGIC ---
  static async getAccounts(): Promise<Account[]> {
    return DataService.fetchAccounts();
  }

  static async saveAccount(item: Omit<Account, 'id'> & { id?: string }): Promise<Account> {
    const payload: Account = {
      ...item,
      id: item.id || crypto.randomUUID(),
      name: item.name.trim(),
      bank: item.bank.trim(),
      initial_balance: Number(item.initial_balance) || 0,
    };
    return DataService.upsertAccount(payload);
  }

  static async deleteAccount(id: string): Promise<void> {
    return DataService.deleteAccount(id);
  }

  // --- CREDIT CARDS DOMAIN LOGIC ---
  static async getCreditCards(): Promise<CreditCard[]> {
    return DataService.fetchCreditCards();
  }

  static async saveCreditCard(item: Omit<CreditCard, 'id'> & { id?: string }): Promise<CreditCard> {
    const payload: CreditCard = {
      ...item,
      id: item.id || crypto.randomUUID(),
      name: item.name.trim(),
      bank: item.bank.trim(),
      limit_amount: Number(item.limit_amount) || 0,
      closing_day: Number(item.closing_day),
      due_day: Number(item.due_day),
    };
    return DataService.upsertCreditCard(payload);
  }

  static async deleteCreditCard(id: string): Promise<void> {
    return DataService.deleteCreditCard(id);
  }

  // --- TRANSACTIONS & INSTALLMENTS DOMAIN LOGIC ---
  static async getTransactions(): Promise<TransactionWithRelations[]> {
    return DataService.fetchTransactions();
  }

  static async saveSingleTransaction(tx: Omit<Transaction, 'id'> & { id?: string }): Promise<Transaction> {
    const payload: Transaction = {
      ...tx,
      id: tx.id || crypto.randomUUID(),
      description: tx.description?.trim(),
      observation: tx.observation?.trim(),
      amount: Number(tx.amount) || 0,
    };
    return DataService.upsertTransaction(payload);
  }

  /**
   * Business Logic for Multi-Installment Purchase:
   * 1. Generates InstallmentGroup entity
   * 2. Calculates exact installment distribution & rounding remainder
   * 3. Prepares N monthly transactions starting from first_date
   */
  static async createInstallmentPurchase(params: CreateInstallmentParams): Promise<void> {
    const { 
      description, 
      total_amount, 
      installments_count, 
      first_date, 
      category_id, 
      card_id, 
      observation 
    } = params;

    const groupId = crypto.randomUUID();
    const installmentGroup: InstallmentGroup = {
      id: groupId,
      description: description.trim(),
      total_amount: Number(total_amount),
      installments_count: Number(installments_count),
      created_at: new Date().toISOString()
    };

    // Calculate installment values & remainder rounding
    const baseAmount = Math.floor((total_amount / installments_count) * 100) / 100;
    const remainder = Math.round((total_amount - (baseAmount * installments_count)) * 100) / 100;

    const transactionsToInsert: Transaction[] = [];
    const startDate = new Date(first_date + 'T00:00:00');

    for (let i = 0; i < installments_count; i++) {
      const installmentDate = new Date(startDate);
      installmentDate.setMonth(startDate.getMonth() + i);

      // Add remainder rounding to the first installment
      const installmentAmount = i === 0 
        ? Number((baseAmount + remainder).toFixed(2)) 
        : Number(baseAmount.toFixed(2));

      transactionsToInsert.push({
        id: crypto.randomUUID(),
        type: 'expense',
        amount: installmentAmount,
        date: installmentDate.toISOString().split('T')[0],
        category_id,
        card_id,
        description: `${description.trim()} (${i + 1}/${installments_count})`,
        observation: observation?.trim() || undefined,
        installment_group_id: groupId,
        installment_number: `${i + 1}/${installments_count}`
      });
    }

    return DataService.insertInstallmentGroupAndTransactions(installmentGroup, transactionsToInsert);
  }

  static async deleteTransaction(id: string): Promise<void> {
    return DataService.deleteTransaction(id);
  }

  static async deleteInstallmentGroup(groupId: string): Promise<void> {
    return DataService.deleteInstallmentGroup(groupId);
  }

  // --- PERSISTENCE RESET LOGIC ---
  static async resetSeedData(): Promise<void> {
    DataService.resetLocalSeed();
  }
}
