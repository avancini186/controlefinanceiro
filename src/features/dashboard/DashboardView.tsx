import React, { useState, useEffect } from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { useFinancialData } from '../../hooks/useFinancialData';
import { useApp } from '../../context/AppContext';
import { DashboardService } from '../../services/financial/DashboardService';
import type { DashboardSummary, Transaction } from '../../types';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard as CardIcon,
  TrendingUp,
  Plus,
  ArrowLeftRight,
  PieChart,
  Activity,
  Sparkles,
  Layers,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { refreshData } = useFinancialData();
  const { openTransactionModal, openTransferModal } = useApp();

  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    DashboardService.getDashboardData()
      .then((data) => {
        if (isMounted) {
          setDashboardData(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching dashboard data:', err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshData]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const columns: Column<Transaction>[] = [
    {
      header: 'Descrição & Categoria',
      accessorKey: 'descricao',
      cell: (tx) => (
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              tx.tipo === 'RECEITA'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : tx.tipo === 'TRANSFERENCIA'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {tx.tipo === 'RECEITA' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
          </div>
          <div>
            <p className="font-semibold text-slate-100">{tx.descricao}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {tx.splits && tx.splits.length > 0 ? (
                <span className="flex items-center gap-1 text-indigo-400 font-medium">
                  <Layers className="w-3 h-3" /> Split ({tx.splits.length} categorias)
                </span>
              ) : (
                tx.category?.nome || 'Sem Categoria'
              )}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'Data',
      accessorKey: 'data',
      cell: (tx) => <span className="text-slate-400 font-mono text-xs">{tx.data}</span>,
    },
    {
      header: 'Conta / Cartão',
      accessorKey: 'account',
      cell: (tx) => (
        <span className="text-slate-300 text-xs font-medium">
          {tx.account?.nome || tx.creditCard?.nome || '-'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (tx) => (
        <Badge variant={tx.status === 'CONCLUIDO' ? 'success' : tx.status === 'PENDENTE' ? 'warning' : 'danger'}>
          {tx.status}
        </Badge>
      ),
    },
    {
      header: 'Valor',
      accessorKey: 'valor',
      className: 'text-right',
      cell: (tx) => (
        <span
          className={`font-semibold font-mono text-base ${
            tx.tipo === 'RECEITA' ? 'text-emerald-400' : 'text-slate-100'
          }`}
        >
          {tx.tipo === 'RECEITA' ? '+' : '-'} {formatCurrency(tx.valor)}
        </span>
      ),
    },
  ];

  if (isLoading || !dashboardData) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs font-mono animate-pulse">
        Carregando métricas e gráficos do dashboard...
      </div>
    );
  }

  const { balance, monthlyCashFlow, accountDistribution, cardDistribution, topCategories, projectedBalance, recentTransactions } =
    dashboardData;

  // Max value calculation for cash flow chart scaling
  const maxCashFlowVal = Math.max(
    ...monthlyCashFlow.flatMap((p) => [p.receitas, p.despesas]),
    100
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Quick Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">Resumo Executivo</h2>
          <p className="text-xs text-slate-400">Indicadores consolidados e fluxo de caixa em tempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" icon={<ArrowLeftRight className="w-4 h-4" />} onClick={openTransferModal}>
            Transferência
          </Button>
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openTransactionModal}>
            Nova Transação
          </Button>
        </div>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Saldo Global"
          value={formatCurrency(balance.saldoTotal)}
          subtitle="Soma das contas ativas"
          icon={<Wallet className="w-5 h-5" />}
          colorHex="#6366f1"
        />
        <StatCard
          title="Previsão de Saldo"
          value={formatCurrency(projectedBalance)}
          subtitle="Considerando pendentes"
          icon={<Sparkles className="w-5 h-5" />}
          colorHex="#3b82f6"
        />
        <StatCard
          title="Receitas no Mês"
          value={formatCurrency(balance.totalReceitas)}
          subtitle="Entradas concluídas"
          icon={<ArrowDownLeft className="w-5 h-5" />}
          colorHex="#10b981"
        />
        <StatCard
          title="Despesas no Mês"
          value={formatCurrency(balance.totalDespesas)}
          subtitle="Saídas concluídas"
          icon={<ArrowUpRight className="w-5 h-5" />}
          colorHex="#f43f5e"
        />
        <StatCard
          title="Faturas Aberta"
          value={formatCurrency(balance.faturasPendentes)}
          subtitle="Compromisso em cartões"
          icon={<CardIcon className="w-5 h-5" />}
          colorHex="#f59e0b"
        />
      </div>

      {/* Advanced Charts Section: Cash Flow & Net Worth Evolution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Cash Flow Chart (Receitas vs Despesas) */}
        <div className="lg:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-slate-100 text-base">Fluxo de Caixa Mensal (Últimos 6 Meses)</h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Receitas
              </span>
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Despesas
              </span>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 items-end h-52 pt-4 border-b border-slate-800 pb-4">
            {monthlyCashFlow.map((pt) => {
              const recHeight = Math.round((pt.receitas / maxCashFlowVal) * 100);
              const despHeight = Math.round((pt.despesas / maxCashFlowVal) * 100);

              return (
                <div key={pt.monthLabel} className="flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1.5 h-full">
                    {/* Receita Bar */}
                    <div
                      className="w-1/2 bg-emerald-500/80 hover:bg-emerald-400 rounded-t-md transition-all relative"
                      style={{ height: `${Math.max(4, recHeight)}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-950 px-2 py-1 rounded text-[10px] font-mono text-emerald-400 whitespace-nowrap border border-slate-800 z-10">
                        +{formatCurrency(pt.receitas)}
                      </div>
                    </div>
                    {/* Despesa Bar */}
                    <div
                      className="w-1/2 bg-rose-500/80 hover:bg-rose-400 rounded-t-md transition-all relative"
                      style={{ height: `${Math.max(4, despHeight)}%` }}
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-950 px-2 py-1 rounded text-[10px] font-mono text-rose-400 whitespace-nowrap border border-slate-800 z-10">
                        -{formatCurrency(pt.despesas)}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">{pt.monthLabel}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expense Category Breakdown Chart */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-slate-100 text-base">Despesas por Categoria</h3>
          </div>

          {topCategories.length === 0 ? (
            <p className="text-xs text-slate-500 py-12 text-center">Nenhuma despesa registrada.</p>
          ) : (
            <div className="space-y-3 pt-2">
              {topCategories.slice(0, 5).map((item) => (
                <div key={item.category.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-200 font-medium">{item.category.nome}</span>
                    <span className="font-mono text-slate-400">
                      {formatCurrency(item.total)} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${item.percentage}%`, backgroundColor: item.category.cor }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Account & Card Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Account Balance Distribution */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-slate-100 text-base">Distribuição de Saldo por Conta</h3>
          </div>

          <div className="space-y-3 pt-2">
            {accountDistribution.map((acc, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 font-medium">{acc.accountName}</span>
                  <span className="font-mono text-slate-300 font-semibold">
                    {formatCurrency(acc.balance)} ({acc.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${acc.percentage}%`, backgroundColor: acc.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Credit Card Invoice Distribution */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-slate-100 text-base">Faturas por Cartão de Crédito</h3>
          </div>

          <div className="space-y-3 pt-2">
            {cardDistribution.map((card, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 font-medium">{card.cardName}</span>
                  <span className="font-mono text-amber-400 font-semibold">
                    {formatCurrency(card.invoiceTotal)} / {formatCurrency(card.limit)}
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 rounded-full transition-all"
                    style={{ width: `${card.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-100 text-base">Últimas Transações Registradas</h3>
        </div>
        <Table columns={columns} data={recentTransactions} keyExtractor={(tx) => tx.id} />
      </div>
    </div>
  );
};
