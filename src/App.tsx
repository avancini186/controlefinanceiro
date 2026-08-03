import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './features/dashboard/DashboardView';
import { TransactionsView } from './features/transactions/TransactionsView';
import { ReconciliationView } from './features/reconciliation/ReconciliationView';
import { RecurringTransactionsView } from './features/recurrences/RecurringTransactionsView';
import { OFXImportView } from './features/ofx-import/OFXImportView';
import { CSVImportView } from './features/csv-import/CSVImportView';
import { AccountsView } from './features/accounts/AccountsView';
import { CreditCardsView } from './features/credit-cards/CreditCardsView';
import { CategoriesView } from './features/categories/CategoriesView';
import { BudgetCategoriesView } from './features/budget-categories/BudgetCategoriesView';
import { ReportsView } from './features/reports/ReportsView';
import { BackupExportView } from './features/backup/BackupExportView';
import { IntegrityView } from './features/integrity/IntegrityView';
import { TransactionModal } from './features/transactions/TransactionModal';
import { TransferModal } from './features/transfers/TransferModal';
import { ToastContainer } from './components/ui/ToastContainer';

const AppContent: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isTransactionModalOpen,
    editingTransaction,
    closeTransactionModal,
    isTransferModalOpen,
    closeTransferModal,
    refreshData,
  } = useApp();

  const [globalSearch, setGlobalSearch] = useState('');

  const titleMap = {
    dashboard: { title: 'Dashboard Financeiro', subtitle: 'Visão geral consolidada do seu patrimônio' },
    transactions: { title: 'Transações', subtitle: 'Histórico de movimentações de receitas e despesas' },
    reconciliation: { title: 'Conciliação Bancária', subtitle: 'Conferência de movimentações com o extrato bancário' },
    recurrences: { title: 'Transações Recorrentes', subtitle: 'Automação de receitas e despesas repetitivas' },
    'ofx-import': { title: 'Importação OFX', subtitle: 'Importação e conciliação de extratos bancários' },
    'csv-import': { title: 'Importação CSV', subtitle: 'Mapeamento dinâmico de colunas e modelos de importação' },
    accounts: { title: 'Contas Financeiras', subtitle: 'Gestão de saldo de contas correntes e investimentos' },
    'credit-cards': { title: 'Cartões de Crédito', subtitle: 'Controle de limites e faturas dos seus cartões' },
    categories: { title: 'Categorias', subtitle: 'Organização e classificação das suas movimentações' },
    budgets: { title: 'Orçamentos', subtitle: 'Metas e limites de gastos por categoria' },
    reports: { title: 'Relatórios Analíticos', subtitle: 'Análises avançadas e gráficos da sua saúde financeira' },
    backup: { title: 'Backup & Exportação', subtitle: 'Geração de backup em JSON, exportação em CSV e restauração' },
    integrity: { title: 'Integridade do Banco', subtitle: 'Módulo permanente de auditoria e reparação contínua' },
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={titleMap[activeTab].title}
          subtitle={titleMap[activeTab].subtitle}
          globalSearchQuery={globalSearch}
          onGlobalSearchChange={setGlobalSearch}
        />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'transactions' && <TransactionsView />}
          {activeTab === 'reconciliation' && <ReconciliationView />}
          {activeTab === 'recurrences' && <RecurringTransactionsView />}
          {activeTab === 'ofx-import' && <OFXImportView />}
          {activeTab === 'csv-import' && <CSVImportView />}
          {activeTab === 'accounts' && <AccountsView />}
          {activeTab === 'credit-cards' && <CreditCardsView />}
          {activeTab === 'categories' && <CategoriesView />}
          {activeTab === 'budgets' && <BudgetCategoriesView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'backup' && <BackupExportView />}
          {activeTab === 'integrity' && <IntegrityView />}
        </main>
      </div>

      {/* Modais Globais */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={closeTransactionModal}
        onSuccess={refreshData}
        transactionToEdit={editingTransaction}
      />
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={closeTransferModal}
        onSuccess={refreshData}
      />

      {/* Global Toast Notification Container */}
      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
