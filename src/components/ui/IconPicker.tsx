import React, { useState } from 'react';
import * as Icons from 'lucide-react';

const AVAILABLE_ICONS = [
  'Tag', 'Wallet', 'CreditCard', 'TrendingUp', 'TrendingDown', 'ShoppingBag',
  'Coffee', 'Utensils', 'Car', 'Home', 'Smartphone', 'Zap', 'Gift', 'Film',
  'DollarSign', 'HeartPulse', 'GraduationCap', 'Plane', 'Briefcase', 'Shield'
];

export interface IconPickerProps {
  selectedIcon: string;
  onSelectIcon: (iconName: string) => void;
  label?: string;
}

export const IconPicker: React.FC<IconPickerProps> = ({
  selectedIcon,
  onSelectIcon,
  label = 'Ícone',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Render current selected icon safely
  const renderLucideIcon = (name: string, size = 18) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const IconComponent = (Icons as any)[name] || Icons.Tag;
    return <IconComponent size={size} />;
  };

  return (
    <div className="space-y-1.5">
      {label && <label className="block text-xs font-medium text-slate-300">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="p-1 bg-slate-800 border border-slate-700 rounded-lg text-indigo-400">
              {renderLucideIcon(selectedIcon)}
            </span>
            <span className="text-xs font-mono text-slate-300">{selectedIcon}</span>
          </div>
          <span className="text-xs text-slate-500">Alterar</span>
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-2 z-30 w-full p-3 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
            {AVAILABLE_ICONS.map((iconName) => (
              <button
                key={iconName}
                type="button"
                onClick={() => {
                  onSelectIcon(iconName);
                  setIsOpen(false);
                }}
                className={`p-2.5 flex flex-col items-center justify-center rounded-xl transition-all ${
                  selectedIcon === iconName
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'bg-slate-950/40 text-slate-400 hover:bg-slate-800 hover:text-slate-100 border border-slate-800/80'
                }`}
              >
                {renderLucideIcon(iconName, 20)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
