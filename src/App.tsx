import React, { useState } from 'react';
import { FinancialProvider } from './context/FinancialContext';
import { MainLayout } from './components/layout/MainLayout';
import type { NavTab } from './components/layout/Sidebar';
import { DashboardView } from './features/dashboard/DashboardView';
import { TransactionsView } from './features/transactions/TransactionsView';
import { AccountsView } from './features/accounts/AccountsView';
import { CreditCardsView } from './features/credit-cards/CreditCardsView';
import { CategoriesView } from './features/categories/CategoriesView';
import { BudgetCategoriesView } from './features/budget-categories/BudgetCategoriesView';
import { SettingsView } from './features/settings/SettingsView';

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'transactions':
        return <TransactionsView />;
      case 'accounts':
        return <AccountsView />;
      case 'cards':
        return <CreditCardsView />;
      case 'categories':
        return <CategoriesView />;
      case 'budgets':
        return <BudgetCategoriesView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <MainLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderActiveView()}
    </MainLayout>
  );
};

export function App() {
  return (
    <FinancialProvider>
      <AppContent />
    </FinancialProvider>
  );
}

export default App;
