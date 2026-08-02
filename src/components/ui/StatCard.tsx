import React from 'react';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconBgColor?: string;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  iconBgColor = 'bg-emerald-50 text-emerald-600',
  subtitle,
}) => {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex items-center justify-between">
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        {subtitle && <span className="text-xs text-slate-400 mt-1">{subtitle}</span>}
      </div>
      <div className={clsx('p-3 rounded-xl flex items-center justify-center', iconBgColor)}>
        {icon}
      </div>
    </div>
  );
};
