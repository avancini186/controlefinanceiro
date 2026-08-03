import React from 'react';

export interface StatCardProps {
  title: string;
  value: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  subtitle?: string;
  colorHex?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  subtitle,
  colorHex,
}) => {
  return (
    <div className="relative overflow-hidden bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-md transition-all hover:border-slate-700/80 shadow-lg">
      {colorHex && (
        <div
          className="absolute top-0 left-0 right-0 h-1 opacity-80"
          style={{ backgroundColor: colorHex }}
        />
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</span>
        {icon && <div className="p-2.5 bg-slate-800/70 border border-slate-700/50 rounded-xl text-slate-200">{icon}</div>}
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <h4 className="text-2xl font-bold text-slate-100 tracking-tight">{value}</h4>
        {trend && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full font-mono ${
              trend.isPositive
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {trend.isPositive ? '+' : ''}{trend.value}
          </span>
        )}
      </div>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  );
};
