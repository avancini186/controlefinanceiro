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

// Storage keys
const STORAGE_KEYS = {
  CATEGORIES: 'categorias',
  BUDGET_CATEGORIES: 'categorias_orcamento',
  ACCOUNTS: 'contas',
  CARDS: 'cartoes',
  INSTALLMENT_GROUPS: 'grupos_parcelamento',
  TRANSACTIONS: 'transacoes',
} as const;

// LocalStorage Persistence Primitive Helpers
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

/**
 * DataService - Data Access Layer (DAL)
 * Responsible EXCLUSIVELY for Database/Storage CRUD operations and Supabase queries.
 * Contains NO financial domain logic or business rules.
 */
export class DataService {
  // --- RESET PERSISTENCE ---
  static resetLocalSeed(): void {
    setLocal(STORAGE_KEYS.CATEGORIES, []);
    setLocal(STORAGE_KEYS.BUDGET_CATEGORIES, []);
    setLocal(STORAGE_KEYS.ACCOUNTS, []);
    setLocal(STORAGE_KEYS.CARDS, []);
    setLocal(STORAGE_KEYS.INSTALLMENT_GROUPS, []);
    setLocal(STORAGE_KEYS.TRANSACTIONS, []);
  }

  // --- CATEGORIES DAL ---
  static async fetchCategories(): Promise<Category[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('categorias').select('*').order('name');
      if (!error && data) return data;
    }
    return getLocal<Category[]>(STORAGE_KEYS.CATEGORIES, []);
  }

  static async upsertCategory(category: Category): Promise<Category> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('categorias').upsert(category).select().single();
      if (!error && data) return data;
    }

    const items = getLocal<Category[]>(STORAGE_KEYS.CATEGORIES, []);
    const exists = items.some(i => i.id === category.id);
    const updated = exists 
      ? items.map(i => i.id === category.id ? { ...i, ...category } : i)
      : [category, ...items];
    
    setLocal(STORAGE_KEYS.CATEGORIES, updated);
    return category;
  }

  static async deleteCategory(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('categorias').delete().eq('id', id);
    }
    const items = getLocal<Category[]>(STORAGE_KEYS.CATEGORIES, []);
    setLocal(STORAGE_KEYS.CATEGORIES, items.filter(i => i.id !== id));
  }

  // --- BUDGET CATEGORIES DAL ---
  static async fetchBudgetCategories(): Promise<BudgetCategory[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('categorias_orcamento').select('*').order('name');
      if (!error && data) return data;
    }
    return getLocal<BudgetCategory[]>(STORAGE_KEYS.BUDGET_CATEGORIES, []);
  }

  static async upsertBudgetCategory(item: BudgetCategory): Promise<BudgetCategory> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('categorias_orcamento').upsert(item).select().single();
      if (!error && data) return data;
    }

    const items = getLocal<BudgetCategory[]>(STORAGE_KEYS.BUDGET_CATEGORIES, []);
    const exists = items.some(i => i.id === item.id);
    const updated = exists 
      ? items.map(i => i.id === item.id ? { ...i, ...item } : i)
      : [item, ...items];
    
    setLocal(STORAGE_KEYS.BUDGET_CATEGORIES, updated);
    return item;
  }

  static async deleteBudgetCategory(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('categorias_orcamento').delete().eq('id', id);
    }
    const items = getLocal<BudgetCategory[]>(STORAGE_KEYS.BUDGET_CATEGORIES, []);
    setLocal(STORAGE_KEYS.BUDGET_CATEGORIES, items.filter(i => i.id !== id));
  }

  // --- ACCOUNTS DAL ---
  static async fetchAccounts(): Promise<Account[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('contas').select('*').order('name');
      if (!error && data) return data;
    }
    return getLocal<Account[]>(STORAGE_KEYS.ACCOUNTS, []);
  }

  static async upsertAccount(item: Account): Promise<Account> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('contas').upsert(item).select().single();
      if (!error && data) return data;
    }

    const items = getLocal<Account[]>(STORAGE_KEYS.ACCOUNTS, []);
    const exists = items.some(i => i.id === item.id);
    const updated = exists 
      ? items.map(i => i.id === item.id ? { ...i, ...item } : i)
      : [item, ...items];
    
    setLocal(STORAGE_KEYS.ACCOUNTS, updated);
    return item;
  }

  static async deleteAccount(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('contas').delete().eq('id', id);
    }
    const items = getLocal<Account[]>(STORAGE_KEYS.ACCOUNTS, []);
    setLocal(STORAGE_KEYS.ACCOUNTS, items.filter(i => i.id !== id));
  }

  // --- CREDIT CARDS DAL ---
  static async fetchCreditCards(): Promise<CreditCard[]> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('cartoes').select('*').order('name');
      if (!error && data) return data;
    }
    return getLocal<CreditCard[]>(STORAGE_KEYS.CARDS, []);
  }

  static async upsertCreditCard(item: CreditCard): Promise<CreditCard> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('cartoes').upsert(item).select().single();
      if (!error && data) return data;
    }

    const items = getLocal<CreditCard[]>(STORAGE_KEYS.CARDS, []);
    const exists = items.some(i => i.id === item.id);
    const updated = exists 
      ? items.map(i => i.id === item.id ? { ...i, ...item } : i)
      : [item, ...items];
    
    setLocal(STORAGE_KEYS.CARDS, updated);
    return item;
  }

  static async deleteCreditCard(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('cartoes').delete().eq('id', id);
    }
    const items = getLocal<CreditCard[]>(STORAGE_KEYS.CARDS, []);
    setLocal(STORAGE_KEYS.CARDS, items.filter(i => i.id !== id));
  }

  // --- TRANSACTIONS & INSTALLMENT GROUPS DAL ---
  static async fetchTransactions(): Promise<TransactionWithRelations[]> {
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

    // Local Storage Fallback with joins
    const rawTransactions = getLocal<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    const categories = getLocal<Category[]>(STORAGE_KEYS.CATEGORIES, []);
    const accounts = getLocal<Account[]>(STORAGE_KEYS.ACCOUNTS, []);
    const cards = getLocal<CreditCard[]>(STORAGE_KEYS.CARDS, []);
    const installmentGroups = getLocal<InstallmentGroup[]>(STORAGE_KEYS.INSTALLMENT_GROUPS, []);

    return rawTransactions.map(tx => ({
      ...tx,
      category: categories.find(c => c.id === tx.category_id),
      account: tx.account_id ? accounts.find(a => a.id === tx.account_id) : undefined,
      card: tx.card_id ? cards.find(c => c.id === tx.card_id) : undefined,
      installment_group: tx.installment_group_id ? installmentGroups.find(g => g.id === tx.installment_group_id) : undefined,
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  static async upsertTransaction(tx: Transaction): Promise<Transaction> {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from('transacoes').upsert(tx).select().single();
      if (!error && data) return data;
    }

    const items = getLocal<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    const exists = items.some(i => i.id === tx.id);
    const updated = exists 
      ? items.map(i => i.id === tx.id ? { ...i, ...tx } : i)
      : [tx, ...items];
    
    setLocal(STORAGE_KEYS.TRANSACTIONS, updated);
    return tx;
  }

  static async insertInstallmentGroupAndTransactions(
    installmentGroup: InstallmentGroup, 
    transactions: Transaction[]
  ): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('grupos_parcelamento').insert(installmentGroup);
      await supabase.from('transacoes').insert(transactions);
      return;
    }

    // Local Storage Batch Fallback
    const groups = getLocal<InstallmentGroup[]>(STORAGE_KEYS.INSTALLMENT_GROUPS, []);
    setLocal(STORAGE_KEYS.INSTALLMENT_GROUPS, [installmentGroup, ...groups]);

    const items = getLocal<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    setLocal(STORAGE_KEYS.TRANSACTIONS, [...transactions, ...items]);
  }

  static async deleteTransaction(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('transacoes').delete().eq('id', id);
    }
    const items = getLocal<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    setLocal(STORAGE_KEYS.TRANSACTIONS, items.filter(i => i.id !== id));
  }

  static async deleteInstallmentGroup(groupId: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      await supabase.from('grupos_parcelamento').delete().eq('id', groupId);
      return;
    }

    // Local Storage Cascade Delete
    const groups = getLocal<InstallmentGroup[]>(STORAGE_KEYS.INSTALLMENT_GROUPS, []);
    setLocal(STORAGE_KEYS.INSTALLMENT_GROUPS, groups.filter(g => g.id !== groupId));

    const items = getLocal<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, []);
    setLocal(STORAGE_KEYS.TRANSACTIONS, items.filter(t => t.installment_group_id !== groupId));
  }
}
