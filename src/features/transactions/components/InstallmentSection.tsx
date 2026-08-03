import React from 'react';
import { Input } from '../../../components/ui/Input';

export interface InstallmentSectionProps {
  isInstallment: boolean;
  installmentsCount: number;
  totalAmount: number;
  onToggleInstallment: (checked: boolean) => void;
  onChangeInstallmentsCount: (count: number) => void;
  formatCurrency: (val: number) => string;
}

export const InstallmentSection: React.FC<InstallmentSectionProps> = ({
  isInstallment,
  installmentsCount,
  totalAmount,
  onToggleInstallment,
  onChangeInstallmentsCount,
  formatCurrency,
}) => {
  return (
    <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-300 cursor-pointer flex items-center gap-2">
          <input
            type="checkbox"
            checked={isInstallment}
            onChange={(e) => onToggleInstallment(e.target.checked)}
            className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
          />
          <span>Compra Parcelada em Vários Meses</span>
        </label>
      </div>

      {isInstallment && (
        <div className="grid grid-cols-2 gap-4 pt-2">
          <Input
            label="Quantidade de Parcelas"
            type="number"
            min="2"
            max="72"
            value={installmentsCount}
            onChange={(e) => onChangeInstallmentsCount(parseInt(e.target.value) || 2)}
          />
          <div className="flex flex-col justify-end text-xs text-indigo-300 font-mono">
            <span>Valor por parcela: {formatCurrency(totalAmount / (installmentsCount || 1))}</span>
          </div>
        </div>
      )}
    </div>
  );
};
