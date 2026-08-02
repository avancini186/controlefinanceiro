import React from 'react';
import * as Icons from 'lucide-react';
import { clsx } from 'clsx';

export const AVAILABLE_ICONS = [
  'DollarSign',
  'ShoppingBag',
  'Home',
  'Car',
  'Smile',
  'PieChart',
  'Wallet',
  'CreditCard',
  'Tag',
  'Coffee',
  'PiggyBank',
  'Briefcase',
  'HeartPulse',
  'Gift',
  'ShieldAlert',
  'TrendingUp',
  'TrendingDown',
  'Zap',
  'BookOpen',
  'Plane',
];

export const DynamicIcon: React.FC<{ name: string; className?: string }> = ({ name, className = 'w-4 h-4' }) => {
  const IconComponent = (Icons as Record<string, any>)[name] || Icons.Tag;
  return <IconComponent className={className} />;
};

interface IconPickerProps {
  value: string;
  onChange: (iconName: string) => void;
  label?: string;
}

export const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, label = 'Ícone' }) => {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">{label}</label>
      <div className="grid grid-cols-10 gap-1.5 p-2 bg-slate-50 rounded-lg border border-slate-200 max-h-32 overflow-y-auto">
        {AVAILABLE_ICONS.map((iconName) => {
          const isSelected = value === iconName;
          return (
            <button
              key={iconName}
              type="button"
              onClick={() => onChange(iconName)}
              className={clsx(
                'p-2 rounded-lg flex items-center justify-center transition-all',
                isSelected
                  ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
              )}
              title={iconName}
            >
              <DynamicIcon name={iconName} className="w-4 h-4" />
            </button>
          );
        })}
      </div>
    </div>
  );
};
