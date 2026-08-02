import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { 
  Category, 
  BudgetCategory, 
  Account, 
  CreditCard, 
  Transaction, 
  InstallmentGroup,
  TransactionWithRelations 
} from '../types/database';

// Clean default state for real database usage
const INITIAL_CATEGORIES: Category[] = [];
const INITIAL_BUDGET_CATEGORIES: BudgetCategory[] = [];
const INITIAL_ACCOUNTS: Account[] = [];
const INITIAL_CARDS: CreditCard[] = [];
const INITIAL_TRANSACTIONS: Transaction[] = [];

// LocalStorage Persistence Helpers
const getLocal = <T>(key: string, fallback: T): T => {
  try {
    const item = localStorage.getItem(`fin_app_${key}`);
    return item ? JSON.parse(item) : fallback;
  } catch (e) {
    console.error(`Error reading ${key} from localStorage`, e);
    return fallback;
  }
};

const setLocal = <T>(key: string, value: T): void => {
  try {
    localStorage.setItem(`fin_app_${key}`, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing ${key} to localStorage`, e);
  }
};

export class DataService {
  // Reset demo data to localStorage
  static resetLocalSeed() {
    setLocal('categorias', INITIAL_CATEGORIES);
    setLocal('categorias_orcamento', INITIAL_BUDGET_CATEGORIES);
    setLocal('contas', INITIAL_ACCOUNTS);
    setLocal('cartoes', INITIAL_CARDS);
    setLocal('grupos_parcelamento', []);
    setLocal('transacoes', INITIAL_TRANSACTIONS);
  }

  // --- CATEGORIES ---
  static async getCategories(): Promise<Category[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('categorias').select('*').order('name');
      if (!error && data) return data;
    }
    return getLocal<Category[]>('categorias', INITIAL_CATEGORIES);
  }

  static async saveCategory(category: Omit<Category, 'id'> & { id?: string }): Promise<Category> {
    const isNew = !category.id;
    const id = category.id || crypto.randomUUID();
    const payload = { ...category, id };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('categorias').upsert(payload).select().single();
      if (!error && data) return data;
    }

    const items = getLocal<Category[]>('categorias', INITIAL_CATEGORIES);
    const updated = isNew 
      ? [payload as Category, ...items]
      : items.map(item => item.id === id ? { ...item, ...payload } : item);
    
    setLocal('categorias', updated);
    return payload as Category;
  }

  static async deleteCategory(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('categorias').delete().eq('id', id);
    }
    const items = getLocal<Category[]>('categorias', INITIAL_CATEGORIES);
    setLocal('categorias', items.filter(i => i.id !== id));
  }

  // --- BUDGET CATEGORIES ---
  static async getBudgetCategories(): Promise<BudgetCategory[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('categorias_orcamento').select('*').order('name');
      if (!error && data) return data;
    }
    return getLocal<BudgetCategory[]>('categorias_orcamento', INITIAL_BUDGET_CATEGORIES);
  }

  static async saveBudgetCategory(item: Omit<BudgetCategory, 'id'> & { id?: string }): Promise<BudgetCategory> {
    const isNew = !item.id;
    const id = item.id || crypto.randomUUID();
    const payload = { ...item, id };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('categorias_orcamento').upsert(payload).select().single();
      if (!error && data) return data;
    }

    const items = getLocal<BudgetCategory[]>('categorias_orcamento', INITIAL_BUDGET_CATEGORIES);
    const updated = isNew 
      ? [payload as BudgetCategory, ...items]
      : items.map(i => i.id === id ? { ...i, ...payload } : i);
    
    setLocal('categorias_orcamento', updated);
    return payload as BudgetCategory;
  }

  static async deleteBudgetCategory(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('categorias_orcamento').delete().eq('id', id);
    }
    const items = getLocal<BudgetCategory[]>('categorias_orcamento', INITIAL_BUDGET_CATEGORIES);
    setLocal('categorias_orcamento', items.filter(i => i.id !== id));
  }

  // --- ACCOUNTS ---
  static async getAccounts(): Promise<Account[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('contas').select('*').order('name');
      if (!error && data) return data;
    }
    return getLocal<Account[]>('contas', INITIAL_ACCOUNTS);
  }

  static async saveAccount(item: Omit<Account, 'id'> & { id?: string }): Promise<Account> {
    const isNew = !item.id;
    const id = item.id || crypto.randomUUID();
    const payload = { ...item, id };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('contas').upsert(payload).select().single();
      if (!error && data) return data;
    }

    const items = getLocal<Account[]>('contas', INITIAL_ACCOUNTS);
    const updated = isNew 
      ? [payload as Account, ...items]
      : items.map(i => i.id === id ? { ...i, ...payload } : i);
    
    setLocal('contas', updated);
    return payload as Account;
  }

  static async deleteAccount(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('contas').delete().eq('id', id);
    }
    const items = getLocal<Account[]>('contas', INITIAL_ACCOUNTS);
    setLocal('contas', items.filter(i => i.id !== id));
  }

  // --- CREDIT CARDS ---
  static async getCreditCards(): Promise<CreditCard[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('cartoes').select('*').order('name');
      if (!error && data) return data;
    }
    return getLocal<CreditCard[]>('cartoes', INITIAL_CARDS);
  }

  static async saveCreditCard(item: Omit<CreditCard, 'id'> & { id?: string }): Promise<CreditCard> {
    const isNew = !item.id;
    const id = item.id || crypto.randomUUID();
    const payload = { ...item, id };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('cartoes').upsert(payload).select().single();
      if (!error && data) return data;
    }

    const items = getLocal<CreditCard[]>('cartoes', INITIAL_CARDS);
    const updated = isNew 
      ? [payload as CreditCard, ...items]
      : items.map(i => i.id === id ? { ...i, ...payload } : i);
    
    setLocal('cartoes', updated);
    return payload as CreditCard;
  }

  static async deleteCreditCard(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('cartoes').delete().eq('id', id);
    }
    const items = getLocal<CreditCard[]>('cartoes', INITIAL_CARDS);
    setLocal('cartoes', items.filter(i => i.id !== id));
  }

  // --- TRANSACTIONS & INSTALLMENT GROUPS ---
  static async getTransactions(): Promise<TransactionWithRelations[]> {
    let rawTransactions: Transaction[] = [];
    let categories: Category[] = [];
    let accounts: Account[] = [];
    let cards: CreditCard[] = [];
    let installmentGroups: InstallmentGroup[] = [];

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('transacoes')
        .select(`
          *,
          category:categorias(*),
          account:contas(*),
          card:cartoes(*),
          installment_group:grupos_parcelamento(*)
        `)
        .order('date', { ascending: false });
      
      if (!error && data) return data as TransactionWithRelations[];
    }

    // Local Storage Fallback with joined relations
    rawTransactions = getLocal<Transaction[]>('transacoes', INITIAL_TRANSACTIONS);
    categories = getLocal<Category[]>('categorias', INITIAL_CATEGORIES);
    accounts = getLocal<Account[]>('contas', INITIAL_ACCOUNTS);
    cards = getLocal<CreditCard[]>('cartoes', INITIAL_CARDS);
    installmentGroups = getLocal<InstallmentGroup[]>('grupos_parcelamento', []);

    return rawTransactions.map(tx => ({
      ...tx,
      category: categories.find(c => c.id === tx.category_id),
      account: tx.account_id ? accounts.find(a => a.id === tx.account_id) : undefined,
      card: tx.card_id ? cards.find(c => c.id === tx.card_id) : undefined,
      installment_group: tx.installment_group_id ? installmentGroups.find(g => g.id === tx.installment_group_id) : undefined,
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  static async saveSingleTransaction(tx: Omit<Transaction, 'id'> & { id?: string }): Promise<Transaction> {
    const isNew = !tx.id;
    const id = tx.id || crypto.randomUUID();
    const payload = { ...tx, id };

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('transacoes').upsert(payload).select().single();
      if (!error && data) return data;
    }

    const items = getLocal<Transaction[]>('transacoes', INITIAL_TRANSACTIONS);
    const updated = isNew 
      ? [payload as Transaction, ...items]
      : items.map(i => i.id === id ? { ...i, ...payload } : i);
    
    setLocal('transacoes', updated);
    return payload as Transaction;
  }

  /**
   * Creates an Installment Group and automatically generates N monthly transactions
   */
  static async createInstallmentPurchase(params: {
    description: string;
    total_amount: number;
    installments_count: number;
    first_date: string;
    category_id: string;
    card_id: string;
    observation?: string;
  }): Promise<void> {
    const { description, total_amount, installments_count, first_date, category_id, card_id, observation } = params;
    
    const groupId = crypto.randomUUID();
    const installmentGroup: InstallmentGroup = {
      id: groupId,
      description,
      total_amount,
      installments_count,
      created_at: new Date().toISOString()
    };

    // Calculate installment values
    const baseAmount = Math.floor((total_amount / installments_count) * 100) / 100;
    const remainder = Math.round((total_amount - (baseAmount * installments_count)) * 100) / 100;

    const transactionsToInsert: Transaction[] = [];
    const startDate = new Date(first_date + 'T00:00:00');

    for (let i = 0; i < installments_count; i++) {
      const installmentDate = new Date(startDate);
      installmentDate.setMonth(startDate.getMonth() + i);

      // Add remainder rounding to the first installment
      const installmentAmount = i === 0 ? Number((baseAmount + remainder).toFixed(2)) : Number(baseAmount.toFixed(2));
      
      transactionsToInsert.push({
        id: crypto.randomUUID(),
        type: 'expense',
        amount: installmentAmount,
        date: installmentDate.toISOString().split('T')[0],
        category_id,
        card_id,
        description: `${description} (${i + 1}/${installments_count})`,
        observation: observation || undefined,
        installment_group_id: groupId,
        installment_number: `${i + 1}/${installments_count}`
      });
    }

    if (isSupabaseConfigured && supabase) {
      await supabase.from('grupos_parcelamento').insert(installmentGroup);
      await supabase.from('transacoes').insert(transactionsToInsert);
      return;
    }

    // Local Storage Fallback
    const groups = getLocal<InstallmentGroup[]>('grupos_parcelamento', []);
    setLocal('grupos_parcelamento', [installmentGroup, ...groups]);

    const items = getLocal<Transaction[]>('transacoes', INITIAL_TRANSACTIONS);
    setLocal('transacoes', [...transactionsToInsert, ...items]);
  }

  static async deleteTransaction(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('transacoes').delete().eq('id', id);
    }
    const items = getLocal<Transaction[]>('transacoes', INITIAL_TRANSACTIONS);
    setLocal('transacoes', items.filter(i => i.id !== id));
  }

  static async deleteInstallmentGroup(groupId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('grupos_parcelamento').delete().eq('id', groupId);
      return;
    }

    // Local Storage Cascade Delete
    const groups = getLocal<InstallmentGroup[]>('grupos_parcelamento', []);
    setLocal('grupos_parcelamento', groups.filter(g => g.id !== groupId));

    const items = getLocal<Transaction[]>('transacoes', INITIAL_TRANSACTIONS);
    setLocal('transacoes', items.filter(t => t.installment_group_id !== groupId));
  }
}
