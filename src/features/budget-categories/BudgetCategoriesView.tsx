import React, { useState, useEffect, useCallback } from 'react';
import { useFinancialData } from '../../hooks/useFinancialData';
import { Button } from '../../components/ui/Button';
import { BudgetCategoryModal } from './BudgetCategoryModal';
import { BudgetService } from '../../services/financial/BudgetService';
import type { BudgetCategory } from '../../types';
import { Target, Plus, Trash2 } from 'lucide-react';

export const BudgetCategoriesView: React.FC = () => {
  const { categories, transactions } = useFinancialData();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const currentAnoMes = new Date().toISOString().slice(0, 7);
  const [budgets, setBudgets] = useState<BudgetCategory[]>([]);

  const loadBudgets = useCallback(async () => {
    try {
      const data = await BudgetService.getBudgetsByPeriod(currentAnoMes);
      setBudgets(data);
    } catch (err) {
      console.error('Error loading budgets:', err);
    }
  }, [currentAnoMes]);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  const handleDeleteBudget = async (id: string) => {
    try {
      await BudgetService.deleteBudget(id);
      await loadBudgets();
    } catch (err) {
      console.error('Error deleting budget:', err);
      alert('Erro ao excluir orçamento.');
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-100">Orçamentos Mensais por Categoria</h3>
          <p className="text-xs text-slate-400">Defina teto de gastos por categoria para manter o controle financeiro ({currentAnoMes})</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Novo Orçamento
        </Button>
      </div>

      {budgets.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
          <p className="text-slate-400 text-sm">Nenhum orçamento configurado para {currentAnoMes}.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsModalOpen(true)}>
            Definir Teto de Gastos
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {budgets.map((b) => {
            // Calculate spent amount in this category for the month (including splits)
            let spent = 0;
            for (const tx of transactions) {
              if (tx.status !== 'CONCLUIDO' || !tx.data.startsWith(currentAnoMes)) continue;
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

            const percent = Math.min(100, Math.round((spent / (b.limiteMensal || 1)) * 100));

            return (
              <div key={b.id} className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md space-y-4 group">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-800 border border-slate-700 rounded-xl text-indigo-400">
                      <Target className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-100">{b.category?.nome || 'Categoria'}</h4>
                      <p className="text-xs text-slate-500">{b.anoMes}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-300">
                      {percent}% consumido
                    </span>
                    <button
                      onClick={() => handleDeleteBudget(b.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300">Gasto: {formatCurrency(spent)}</span>
                    <span className="text-slate-400">Teto: {formatCurrency(b.limiteMensal)}</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        percent > 90 ? 'bg-rose-500' : percent > 75 ? 'bg-amber-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal CRUD Orçamento */}
      <BudgetCategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categories={categories}
        currentAnoMes={currentAnoMes}
        onSuccess={loadBudgets}
      />
    </div>
  );
};
