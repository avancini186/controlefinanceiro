import React from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { StatCard } from '../../components/ui/StatCard';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { DynamicIcon } from '../../components/ui/IconPicker';
import { formatCurrency, formatDate, getCurrentMonthDates } from '../../utils/formatters';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Receipt, Split } from 'lucide-react';
import { TransactionType, type TransactionWithRelations } from '../../types';

export const DashboardView: React.FC = () => {
  const { accounts, transactions, isLoading } = useFinancial();
  const { currentMonthYear } = getCurrentMonthDates();

  // 1. Calculate Saldo Atual (Initial balance + total incomes - total expenses)
  const initialAccountsBalance = accounts.reduce((acc, a) => acc + Number(a.initial_balance || 0), 0);
  const totalIncomeAllTime = transactions
    .filter((t) => t.type === TransactionType.INCOME)
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const totalExpenseAllTime = transactions
    .filter((t) => t.type === TransactionType.EXPENSE)
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);
  
  const currentBalance = initialAccountsBalance + totalIncomeAllTime - totalExpenseAllTime;

  // 2. Month's Incomes & Expenses
  const currentMonthTransactions = transactions.filter((t) => t.date && t.date.startsWith(currentMonthYear));
  
  const monthIncome = currentMonthTransactions
    .filter((t) => t.type === TransactionType.INCOME)
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  const monthExpense = currentMonthTransactions
    .filter((t) => t.type === TransactionType.EXPENSE)
    .reduce((acc, t) => acc + Number(t.amount || 0), 0);

  // 3. Recent Transactions (Top 6)
  const recentTransactions = transactions.slice(0, 6);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 font-medium">
        Carregando dados do dashboard...
      </div>
    );
  }

  const columns = [
    {
      header: 'Descrição',
      cell: (tx: TransactionWithRelations) => (
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
            style={{ backgroundColor: tx.category?.color || '#94a3b8' }}
          >
            <DynamicIcon name={tx.splits && tx.splits.length > 0 ? 'Split' : (tx.category?.icon || 'Tag')} className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800">{tx.description || 'Transação'}</span>
            {tx.installment_number && (
              <span className="text-[11px] text-slate-400 font-mono">Parcela {tx.installment_number}</span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Categoria',
      cell: (tx: TransactionWithRelations) => (
        tx.splits && tx.splits.length > 0 ? (
          <Badge variant="purple">
            <Split className="w-3 h-3" />
            Dividida ({tx.splits.length} cat.)
          </Badge>
        ) : (
          <Badge variant="slate">
            {tx.category?.name || 'Sem Categoria'}
          </Badge>
        )
      ),
    },
    {
      header: 'Conta / Cartão',
      cell: (tx: TransactionWithRelations) => (
        <span className="text-xs text-slate-600 font-medium">
          {tx.account ? tx.account.name : tx.card ? `💳 ${tx.card.name}` : '-'}
        </span>
      ),
    },
    {
      header: 'Data',
      cell: (tx: TransactionWithRelations) => (
        <span className="text-xs text-slate-500 font-mono">{formatDate(tx.date)}</span>
      ),
    },
    {
      header: 'Valor',
      className: 'text-right',
      cell: (tx: TransactionWithRelations) => {
        const isIncome = tx.type === TransactionType.INCOME;
        return (
          <span
            className={`font-bold font-mono text-sm ${
              isIncome ? 'text-emerald-600' : 'text-slate-800'
            }`}
          >
            {isIncome ? '+' : '-'} {formatCurrency(Number(tx.amount))}
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Saldo Atual"
          value={formatCurrency(currentBalance)}
          icon={<Wallet className="w-6 h-6" />}
          iconBgColor="bg-emerald-50 text-emerald-600 border border-emerald-100"
          subtitle="Soma de contas + saldo de caixa"
        />
        <StatCard
          title="Receitas do Mês"
          value={formatCurrency(monthIncome)}
          icon={<ArrowUpCircle className="w-6 h-6" />}
          iconBgColor="bg-blue-50 text-blue-600 border border-blue-100"
          subtitle="Entradas no mês atual"
        />
        <StatCard
          title="Despesas do Mês"
          value={formatCurrency(monthExpense)}
          icon={<ArrowDownCircle className="w-6 h-6" />}
          iconBgColor="bg-rose-50 text-rose-600 border border-rose-100"
          subtitle="Saídas no mês atual"
        />
      </div>

      {/* Recent Transactions List */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-800">Últimas Transações</h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">Movimentações recentes</span>
        </div>

        <Table
          columns={columns}
          data={recentTransactions}
          keyExtractor={(tx) => tx.id}
          emptyMessage="Nenhuma transação registrada ainda."
        />
      </div>
    </div>
  );
};
