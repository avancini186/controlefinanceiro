import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ActiveTab } from '../components/layout/Sidebar';
import type { Account, CreditCard, Category, Transaction, BalanceSummary, AppConfig } from '../types';
import {
  CategoryService,
  AccountService,
  CreditCardService,
  TransactionService,
  BalanceService,
  ConfigService,
  RecurringTransactionService,
} from '../services/financial';

export interface AppContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isTransactionModalOpen: boolean;
  editingTransaction: Transaction | null;
  openTransactionModal: (txToEdit?: Transaction) => void;
  closeTransactionModal: () => void;
  isTransferModalOpen: boolean;
  openTransferModal: () => void;
  closeTransferModal: () => void;
  isLoading: boolean;
  error: string | null;

  // Selected Month / Competencia (YYYY-MM)
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;

  // Real App Data from Supabase Services
  accounts: Account[];
  creditCards: CreditCard[];
  categories: Category[];
  transactions: Transaction[];
  balance: BalanceSummary;
  config: AppConfig | null;

  // Actions / Refresh
  refreshData: () => Promise<void>;
}

const initialBalance: BalanceSummary = {
  saldoTotal: 0,
  totalReceitas: 0,
  totalDespesas: 0,
  saldoContas: 0,
  faturasPendentes: 0,
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const now = new Date();
  const currentSystemMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentSystemMonth);

  const openTransactionModal = useCallback((txToEdit?: Transaction) => {
    setEditingTransaction(txToEdit || null);
    setIsTransactionModalOpen(true);
  }, []);

  const closeTransactionModal = useCallback(() => {
    setIsTransactionModalOpen(false);
    setEditingTransaction(null);
  }, []);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balance, setBalance] = useState<BalanceSummary>(initialBalance);
  const [config, setConfig] = useState<AppConfig | null>(null);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Process any due recurring transactions first
      await RecurringTransactionService.processPendingRecurrences().catch((err: unknown) =>
        console.error('Error processing recurring occurrences:', err)
      );

      const [catList, accList, cardList, txList, balSummary, cfg] = await Promise.all([
        CategoryService.getAll().catch(() => []),
        AccountService.getAll().catch(() => []),
        CreditCardService.getAll().catch(() => []),
        TransactionService.getAll().catch(() => []),
        BalanceService.calculateSummary().catch(() => initialBalance),
        ConfigService.getConfig().catch(() => null),
      ]);

      // Calculate updated balances for accounts
      const updatedAccounts = await Promise.all(
        accList.map(async (acc) => ({
          ...acc,
          saldoAtual: await BalanceService.calculateAccountBalance(acc.id).catch(() => acc.saldoInicial),
        }))
      );

      // Calculate current and next invoice totals for credit cards
      const updatedCards = await Promise.all(
        cardList.map(async (card) => ({
          ...card,
          faturaAtual: await BalanceService.calculateCurrentInvoice(card.id).catch(() => 0),
          faturaProxima: await BalanceService.calculateNextInvoice(card.id).catch(() => 0),
        }))
      );

      setCategories(catList);
      setAccounts(updatedAccounts);
      setCreditCards(updatedCards);
      setTransactions(txList);
      setBalance(balSummary);
      setConfig(cfg);
    } catch (err) {
      console.error('Error loading financial data:', err);
      setError('Ocorreu um erro ao carregar os dados do banco.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        isTransactionModalOpen,
        editingTransaction,
        openTransactionModal,
        closeTransactionModal,
        isTransferModalOpen,
        openTransferModal: () => setIsTransferModalOpen(true),
        closeTransferModal: () => setIsTransferModalOpen(false),
        isLoading,
        error,
        selectedMonth,
        setSelectedMonth,
        accounts,
        creditCards,
        categories,
        transactions,
        balance,
        config,
        refreshData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
