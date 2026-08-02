import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  CategoryService, 
  BudgetService, 
  AccountService, 
  CreditCardService, 
  TransactionService, 
  BalanceService 
} from '../services/financial';
import type { 
  Category, 
  BudgetCategory, 
  Account, 
  CreditCard, 
  TransactionWithRelations 
} from '../types/database';

interface FinancialContextType {
  categories: Category[];
  budgetCategories: BudgetCategory[];
  accounts: Account[];
  cards: CreditCard[];
  transactions: TransactionWithRelations[];
  isLoading: boolean;
  refreshData: () => Promise<void>;
  resetToSeed: () => Promise<void>;
}

const FinancialContext = createContext<FinancialContextType | undefined>(undefined);

export const FinancialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [cats, bCats, accs, crds, txs] = await Promise.all([
        CategoryService.getCategories(),
        BudgetService.getBudgetCategories(),
        AccountService.getAccounts(),
        CreditCardService.getCreditCards(),
        TransactionService.getTransactions(),
      ]);
      setCategories(cats);
      setBudgetCategories(bCats);
      setAccounts(accs);
      setCards(crds);
      setTransactions(txs);
    } catch (e) {
      console.error('Failed to load financial data:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetToSeed = async () => {
    await BalanceService.resetSeedData();
    await refreshData();
  };

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <FinancialContext.Provider
      value={{
        categories,
        budgetCategories,
        accounts,
        cards,
        transactions,
        isLoading,
        refreshData,
        resetToSeed,
      }}
    >
      {children}
    </FinancialContext.Provider>
  );
};

export const useFinancial = () => {
  const context = useContext(FinancialContext);
  if (!context) {
    throw new Error('useFinancial must be used within a FinancialProvider');
  }
  return context;
};
