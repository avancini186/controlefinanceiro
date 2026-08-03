import { useApp } from '../context/AppContext';

export function useFinancialData() {
  const {
    accounts,
    creditCards,
    categories,
    transactions,
    balance,
    config,
    isLoading,
    error,
    refreshData,
  } = useApp();

  return {
    accounts,
    creditCards,
    categories,
    transactions,
    balance,
    config,
    isLoading,
    error,
    refreshData,
  };
}
