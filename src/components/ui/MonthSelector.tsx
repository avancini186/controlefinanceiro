import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthSelectorProps {
  value: string;
  onChange: (month: string) => void;
  className?: string;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const handlePrevMonth = () => {
    if (!value) return;
    const [y, m] = value.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    const prevM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    onChange(prevM);
  };

  const handleNextMonth = () => {
    if (!value) return;
    const [y, m] = value.split('-').map(Number);
    const d = new Date(y, m, 1);
    const nextM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    onChange(nextM);
  };

  const formatMonthName = (yearMonth: string) => {
    if (!yearMonth) return '';
    const [y, m] = yearMonth.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    const name = new Intl.DateTimeFormat('pt-BR', { month: 'short', year: 'numeric' }).format(d);
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <div className={`flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-sm shrink-0 ${className}`}>
      <button
        type="button"
        onClick={handlePrevMonth}
        className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        title="Mês Anterior"
        aria-label="Mês Anterior"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div className="relative flex items-center px-2">
        <span className="text-xs font-semibold text-slate-100 min-w-[90px] text-center font-mono">
          {formatMonthName(value)}
        </span>
        <input
          type="month"
          value={value}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          title="Clique para escolher o mês"
        />
      </div>

      <button
        type="button"
        onClick={handleNextMonth}
        className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        title="Próximo Mês"
        aria-label="Próximo Mês"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
