import React from 'react';
import { Button } from '../../../components/ui/Button';
import type { Category } from '../../../types';
import { Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

export interface SplitRow {
  id: string;
  categoryId: string;
  amount: number;
  description: string;
}

export interface SplitTransactionEditorProps {
  splits: SplitRow[];
  totalAmount: number;
  categories: Category[];
  onAddSplitRow: () => void;
  onRemoveSplitRow: (id: string) => void;
  onUpdateSplit: (id: string, field: keyof SplitRow, value: unknown) => void;
  formatCurrency: (val: number) => string;
}

export const SplitTransactionEditor: React.FC<SplitTransactionEditorProps> = ({
  splits,
  totalAmount,
  categories,
  onAddSplitRow,
  onRemoveSplitRow,
  onUpdateSplit,
  formatCurrency,
}) => {
  const distributedAmount = splits.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const remainingAmount = Number((totalAmount - distributedAmount).toFixed(2));
  const isSplitValid = Math.abs(remainingAmount) < 0.01;

  return (
    <div className="p-4 bg-slate-950/70 border border-indigo-500/30 rounded-2xl space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
          Divisão de Itens por Categoria
        </h4>
        <Button variant="ghost" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={onAddSplitRow}>
          Adicionar Linha
        </Button>
      </div>

      {/* Split Rows */}
      <div className="space-y-3">
        {splits.map((row) => (
          <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-5">
              <select
                value={row.categoryId}
                onChange={(e) => onUpdateSplit(row.id, 'categoryId', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-3">
              <input
                type="number"
                step="0.01"
                placeholder="Valor"
                value={row.amount}
                onChange={(e) => onUpdateSplit(row.id, 'amount', parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono"
              />
            </div>
            <div className="col-span-3">
              <input
                type="text"
                placeholder="Obs (opcional)"
                value={row.description}
                onChange={(e) => onUpdateSplit(row.id, 'description', e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              />
            </div>
            <div className="col-span-1 text-center">
              <button
                type="button"
                onClick={() => onRemoveSplitRow(row.id)}
                className="p-1 text-slate-500 hover:text-rose-400"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Realtime Summary */}
      <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl grid grid-cols-3 gap-2 text-center text-xs font-mono">
        <div>
          <span className="text-slate-500 block text-[10px]">Total</span>
          <span className="text-slate-200 font-bold">{formatCurrency(totalAmount)}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">Distribuído</span>
          <span className="text-indigo-400 font-bold">{formatCurrency(distributedAmount)}</span>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px]">Restante</span>
          <span className={isSplitValid ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
            {formatCurrency(remainingAmount)}
          </span>
        </div>
      </div>

      {/* Validation Message */}
      <div
        className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs font-medium ${
          isSplitValid
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}
      >
        {isSplitValid ? (
          <>
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Divisão perfeita! O valor restante é R$ 0,00.</span>
          </>
        ) : (
          <>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>A soma dos splits deve ser exatamente igual ao valor total.</span>
          </>
        )}
      </div>
    </div>
  );
};
