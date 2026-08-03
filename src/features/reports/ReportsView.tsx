import React, { useState } from 'react';
import { useFinancialData } from '../../hooks/useFinancialData';
import { PieChart, Wallet, CreditCard, Filter } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { categories, accounts, creditCards, transactions } = useFinancialData();
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Filter transactions for period
  const filteredTx = transactions.filter((t) => t.data.startsWith(selectedPeriod) && t.status === 'CONCLUIDO');

  // Compute expenses by category (including splits)
  const categoryExpensesMap = new Map<string, number>();
  let totalExpensesSum = 0;

  for (const tx of filteredTx) {
    if (tx.tipo !== 'DESPESA') continue;

    if (tx.splits && tx.splits.length > 0) {
      for (const sp of tx.splits) {
        const prev = categoryExpensesMap.get(sp.categoryId) || 0;
        categoryExpensesMap.get(sp.categoryId);
        categoryExpensesMap.set(sp.categoryId, prev + sp.amount);
        totalExpensesSum += sp.amount;
      }
    } else if (tx.categoriaId) {
      const prev = categoryExpensesMap.get(tx.categoriaId) || 0;
      categoryExpensesMap.set(tx.categoriaId, prev + tx.valor);
      totalExpensesSum += tx.valor;
    }
  }

  const categoryExpensesReport = categories
    .filter((c) => c.tipo === 'DESPESA')
    .map((cat) => {
      const total = categoryExpensesMap.get(cat.id) || 0;
      const pct = totalExpensesSum > 0 ? Number(((total / totalExpensesSum) * 100).toFixed(1)) : 0;
      return { category: cat, total, pct };
    })
    .sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-100">Relatórios Financeiros Analíticos</h3>
          <p className="text-xs text-slate-400">Consolidação de movimentações e split transactions por categoria, conta e cartão</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-indigo-400" />
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 min-h-[44px]"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category breakdown visual summary */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
          <h4 className="font-semibold text-slate-100 flex items-center gap-2 text-sm">
            <PieChart className="w-4 h-4 text-indigo-400" />
            <span>Despesas por Categoria (Com Splits Computados)</span>
          </h4>
          {categoryExpensesReport.length === 0 || totalExpensesSum === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">Sem despesas registradas para este período.</p>
          ) : (
            <div className="space-y-3">
              {categoryExpensesReport.map((item) => (
                <div key={item.category.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{item.category.nome}</span>
                    <span className="font-mono text-slate-400">
                      {formatCurrency(item.total)} ({item.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${item.pct}%`, backgroundColor: item.category.cor }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumo por Conta e Cartão */}
        <div className="space-y-6">
          {/* Summary por Conta */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <h4 className="font-semibold text-slate-100 flex items-center gap-2 text-sm">
              <Wallet className="w-4 h-4 text-indigo-400" />
              <span>Movimentação por Conta no Mês</span>
            </h4>
            <div className="space-y-3">
              {accounts.map((acc) => {
                const accTx = filteredTx.filter((t) => t.contaId === acc.id);
                const income = accTx.filter((t) => t.tipo === 'RECEITA').reduce((a, c) => a + c.valor, 0);
                const expense = accTx.filter((t) => t.tipo === 'DESPESA').reduce((a, c) => a + c.valor, 0);

                return (
                  <div key={acc.id} className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">{acc.nome}</span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-emerald-400">+{formatCurrency(income)}</span>
                      <span className="text-rose-400">-{formatCurrency(expense)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary por Cartão */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <h4 className="font-semibold text-slate-100 flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>Compras a Crédito no Mês</span>
            </h4>
            <div className="space-y-3">
              {creditCards.map((card) => {
                const cardTx = filteredTx.filter((t) => t.cartaoId === card.id);
                const totalCardExpense = cardTx.reduce((a, c) => a + c.valor, 0);

                return (
                  <div key={card.id} className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">{card.nome}</span>
                    <span className="font-mono font-semibold text-amber-400">
                      {formatCurrency(totalCardExpense)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
