import React, { useState, useEffect } from 'react';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { MonthSelector } from '../../components/ui/MonthSelector';
import { useFinancialData } from '../../hooks/useFinancialData';
import { useApp } from '../../context/AppContext';
import { DashboardService } from '../../services/financial/DashboardService';
import { BudgetService } from '../../services/financial/BudgetService';
import { TransactionService } from '../../services/financial/TransactionService';
import type { DashboardSummary, BudgetCategory } from '../../types';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard as CardIcon,
  Plus,
  ArrowLeftRight,
  PieChart,
  Activity,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  PiggyBank,
  Target,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { transactions, refreshData } = useFinancialData();
  const { openTransactionModal, openTransferModal, selectedMonth, setSelectedMonth } = useApp();

  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Accordions retráteis - estado inicial FECHADOS por padrão
  const [isCashFlowOpen, setIsCashFlowOpen] = useState(false);
  const [isAccountDistOpen, setIsAccountDistOpen] = useState(false);
  const [isCardDistOpen, setIsCardDistOpen] = useState(false);

  // Estado dos cards expansíveis de categoria (Padrão: compacto mostrando 6 itens)
  const [isTopCategoriesExpanded, setIsTopCategoriesExpanded] = useState(false);
  const [isBudgetsExpanded, setIsBudgetsExpanded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      DashboardService.getDashboardData(selectedMonth),
      BudgetService.getBudgetsByPeriod(selectedMonth),
    ])
      .then(([dashData, budgetData]) => {
        if (isMounted) {
          setDashboardData(dashData);
          setBudgets(budgetData);
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
  }, [selectedMonth, refreshData]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (isLoading || !dashboardData) {
    return (
      <div className="p-12 text-center text-slate-500 text-xs font-mono animate-pulse">
        Carregando métricas e gráficos do dashboard...
      </div>
    );
  }

  const { balance, monthlyCashFlow, accountDistribution, cardDistribution, topCategories } =
    dashboardData;

  const receitasMes = balance.totalReceitas;
  const despesasMes = balance.totalDespesas;
  const saldoMes = receitasMes - despesasMes;

  // Cor dinâmica do Saldo do Mês (Verde se positivo, Vermelho se negativo, Cinza se zero)
  const saldoColorHex = saldoMes > 0 ? '#10b981' : saldoMes < 0 ? '#f43f5e' : '#94a3b8';

  // Total aplicado em investimentos durante o mês
  const totalInvestimentos = transactions
    .filter((tx) => {
      if (!TransactionService.belongsToCompetencia(tx, selectedMonth)) return false;
      if (tx.status === 'CANCELADO') return false;

      const catName = (tx.category?.nome || '').toLowerCase();
      const desc = (tx.descricao || '').toLowerCase();
      const isInvCat =
        catName.includes('investimento') ||
        catName.includes('tesouro') ||
        catName.includes('cdb') ||
        catName.includes('etf') ||
        catName.includes('fii') ||
        catName.includes('ação') ||
        catName.includes('acoes') ||
        catName.includes('cripto') ||
        catName.includes('previdência') ||
        catName.includes('previdencia') ||
        catName.includes('aplicação') ||
        catName.includes('aplicacao');

      const isInvDesc =
        desc.includes('investimento') ||
        desc.includes('tesouro') ||
        desc.includes('cdb') ||
        desc.includes('etf') ||
        desc.includes('fii') ||
        desc.includes('ações') ||
        desc.includes('cripto') ||
        desc.includes('previdência') ||
        desc.includes('previdencia');

      return isInvCat || isInvDesc;
    })
    .reduce((acc, tx) => acc + tx.valor, 0);

  // Consumo Mensal do Orçamento ordenado do maior % para o menor %
  const budgetsWithConsumption = budgets
    .map((b) => {
      let spent = 0;
      for (const tx of transactions) {
        if (tx.status === 'CANCELADO' || !TransactionService.belongsToCompetencia(tx, selectedMonth)) continue;
        if (tx.tipo !== 'DESPESA') continue;

        if (tx.splits && tx.splits.length > 0) {
          for (const s of tx.splits) {
            if (s.categoryId === b.categoriaId) {
              spent += s.amount;
            }
          }
        } else if (tx.categoriaId === b.categoriaId) {
          spent += tx.valor;
        }
      }

      const percent = Math.round((spent / (b.limiteMensal || 1)) * 100);

      // Cores por faixa de percentual: Até 70% verde, 70-90% amarelo, 90-100% laranja, >100% vermelho
      let barColorClass = 'bg-emerald-500';
      let textColorClass = 'text-emerald-400';
      if (percent > 100) {
        barColorClass = 'bg-rose-500';
        textColorClass = 'text-rose-400';
      } else if (percent > 90) {
        barColorClass = 'bg-amber-500';
        textColorClass = 'text-amber-400';
      } else if (percent > 70) {
        barColorClass = 'bg-yellow-500';
        textColorClass = 'text-yellow-400';
      }

      return {
        ...b,
        spent,
        percent,
        barColorClass,
        textColorClass,
      };
    })
    .sort((a, b) => b.percent - a.percent);

  // Listas filtradas pela expansão (compacta: 6 itens, expandida: todas)
  const visibleTopCategories = isTopCategoriesExpanded
    ? topCategories
    : topCategories.slice(0, 6);

  const visibleBudgets = isBudgetsExpanded
    ? budgetsWithConsumption
    : budgetsWithConsumption.slice(0, 6);

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
          <p className="text-xs text-slate-400">Indicadores gerenciais e controle orçamentário do período</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
          <Button variant="outline" icon={<ArrowLeftRight className="w-4 h-4" />} onClick={openTransferModal}>
            Transferência
          </Button>
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => openTransactionModal()}>
            Nova Transação
          </Button>
        </div>
      </div>

      {/* 4 Indicadores Principais em Grid Fluida (Receitas | Despesas | Saldo | Investimentos) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title="Receitas no Mês"
          value={formatCurrency(receitasMes)}
          subtitle="Recebido no período"
          icon={<ArrowDownLeft className="w-5 h-5 text-emerald-400" />}
          colorHex="#10b981"
        />
        <StatCard
          title="Despesas no Mês"
          value={formatCurrency(despesasMes)}
          subtitle="Gasto no período"
          icon={<ArrowUpRight className="w-5 h-5 text-rose-400" />}
          colorHex="#f43f5e"
        />
        <StatCard
          title="Saldo do Mês"
          value={formatCurrency(saldoMes)}
          subtitle="Resultado do período"
          icon={<Wallet className="w-5 h-5 text-slate-200" />}
          colorHex={saldoColorHex}
        />
        <StatCard
          title="Investimentos no Mês"
          value={formatCurrency(totalInvestimentos)}
          subtitle="Aplicado no período"
          icon={<PiggyBank className="w-5 h-5 text-sky-400" />}
          colorHex="#38bdf8"
        />
      </div>

      {/* Primeira Seção: Despesas por Categoria & Consumo Mensal do Orçamento (Cards Expansíveis) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Despesas por Categoria */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-slate-100 text-base">Despesas por Categoria</h3>
            </div>
            {topCategories.length > 0 && (
              <span className="text-[11px] font-mono font-medium text-slate-400">
                {topCategories.length} {topCategories.length === 1 ? 'categoria' : 'categorias'}
              </span>
            )}
          </div>

          {topCategories.length === 0 ? (
            <p className="text-xs text-slate-500 py-12 text-center">Nenhuma despesa registrada neste período.</p>
          ) : (
            <div className="space-y-3.5 pt-2 transition-all duration-300">
              {visibleTopCategories.map((item) => (
                <div key={item.category.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-200 font-medium">{item.category.nome}</span>
                    <span className="font-mono text-slate-400">
                      {formatCurrency(item.total)} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${item.percentage}%`, backgroundColor: item.category.cor }}
                    />
                  </div>
                </div>
              ))}

              {topCategories.length > 6 && (
                <div className="pt-3 border-t border-slate-800/60 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setIsTopCategoriesExpanded(!isTopCategoriesExpanded)}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition-colors py-1 px-3 rounded-lg hover:bg-indigo-500/10"
                  >
                    {isTopCategoriesExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" /> Mostrar menos
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" /> Mostrar todas ({topCategories.length})
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Consumo Mensal do Orçamento */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-slate-100 text-base">Consumo Mensal do Orçamento</h3>
            </div>
            {budgetsWithConsumption.length > 0 && (
              <span className="text-[11px] font-mono font-medium text-slate-400">
                {budgetsWithConsumption.length} {budgetsWithConsumption.length === 1 ? 'orçamento' : 'orçamentos'}
              </span>
            )}
          </div>

          {budgetsWithConsumption.length === 0 ? (
            <p className="text-xs text-slate-500 py-12 text-center">
              Nenhum orçamento configurado para o mês atual.
            </p>
          ) : (
            <div className="space-y-3.5 pt-2 transition-all duration-300">
              {visibleBudgets.map((b) => (
                <div key={b.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-200 font-medium">{b.category?.nome || 'Categoria'}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-300">
                        {formatCurrency(b.spent)} / {formatCurrency(b.limiteMensal)}
                      </span>
                      <span className={`font-bold ${b.textColorClass}`}>
                        {b.percent}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${b.barColorClass}`}
                      style={{ width: `${Math.min(100, b.percent)}%` }}
                    />
                  </div>
                </div>
              ))}

              {budgetsWithConsumption.length > 6 && (
                <div className="pt-3 border-t border-slate-800/60 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setIsBudgetsExpanded(!isBudgetsExpanded)}
                    className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors py-1 px-3 rounded-lg hover:bg-emerald-500/10"
                  >
                    {isBudgetsExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4" /> Mostrar menos
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" /> Mostrar todas ({budgetsWithConsumption.length})
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Painéis Analíticos Retráteis (Accordion - Fechados por Padrão) */}
      <div className="space-y-4">
        {/* Accordion 1: Fluxo de Caixa Mensal */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => setIsCashFlowOpen(!isCashFlowOpen)}
            className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-slate-100 text-base">Fluxo de Caixa Mensal</h3>
                <p className="text-xs text-slate-400">Histórico dos últimos 6 meses</p>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-slate-800 text-slate-400">
              {isCashFlowOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          </button>

          {isCashFlowOpen && (
            <div className="p-6 pt-0 border-t border-slate-800/60 animate-fade-in space-y-6">
              <div className="flex items-center justify-end gap-4 text-xs font-medium pt-4">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Receitas
                </span>
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Despesas
                </span>
              </div>

              <div className="grid grid-cols-6 gap-3 items-end h-52 border-b border-slate-800 pb-4">
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
          )}
        </div>

        {/* Accordion 2: Distribuição do Saldo por Conta */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => setIsAccountDistOpen(!isAccountDistOpen)}
            className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Wallet className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="font-bold text-slate-100 text-base">Distribuição do Saldo por Conta</h3>
                <p className="text-xs text-slate-400">Saldos individuais e proporção no patrimônio</p>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-slate-800 text-slate-400">
              {isAccountDistOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          </button>

          {isAccountDistOpen && (
            <div className="p-6 pt-0 border-t border-slate-800/60 animate-fade-in space-y-3.5 pt-4">
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
          )}
        </div>

        {/* Accordion 3: Faturas por Cartão de Crédito */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => setIsCardDistOpen(!isCardDistOpen)}
            className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CardIcon className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="font-bold text-slate-100 text-base">Faturas por Cartão de Crédito</h3>
                <p className="text-xs text-slate-400">Limites, comprometimento e limite disponível</p>
              </div>
            </div>
            <div className="p-2 rounded-xl bg-slate-800 text-slate-400">
              {isCardDistOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          </button>

          {isCardDistOpen && (
            <div className="p-6 pt-0 border-t border-slate-800/60 animate-fade-in space-y-3.5 pt-4">
              {cardDistribution.map((card, idx) => {
                const disponivel = Math.max(0, card.limit - card.invoiceTotal);
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                      <span className="text-slate-200 font-medium">{card.cardName}</span>
                      <div className="font-mono text-xs flex flex-wrap items-center gap-3">
                        <span className="text-amber-400 font-semibold">Fatura: {formatCurrency(card.invoiceTotal)}</span>
                        <span className="text-slate-400">Limite: {formatCurrency(card.limit)}</span>
                        <span className="text-emerald-400">Disponível: {formatCurrency(disponivel)}</span>
                        <span className="text-slate-400 font-bold">({card.percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 rounded-full transition-all"
                        style={{ width: `${card.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
