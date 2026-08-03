import React from 'react';
import {
  LayoutDashboard,
  ArrowUpRight,
  Wallet,
  CreditCard as CardIcon,
  Tag,
  Target,
  PieChart,
  Repeat,
  UploadCloud,
  FileSpreadsheet,
  Scale,
  HardDrive,
  ShieldCheck,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'transactions'
  | 'reconciliation'
  | 'recurrences'
  | 'ofx-import'
  | 'csv-import'
  | 'accounts'
  | 'credit-cards'
  | 'categories'
  | 'budgets'
  | 'reports'
  | 'backup'
  | 'integrity';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions' as ActiveTab, label: 'Transações', icon: ArrowUpRight },
    { id: 'reconciliation' as ActiveTab, label: 'Conciliação', icon: Scale },
    { id: 'recurrences' as ActiveTab, label: 'Recorrências', icon: Repeat },
    { id: 'ofx-import' as ActiveTab, label: 'Importar OFX', icon: UploadCloud },
    { id: 'csv-import' as ActiveTab, label: 'Importar CSV', icon: FileSpreadsheet },
    { id: 'accounts' as ActiveTab, label: 'Contas', icon: Wallet },
    { id: 'credit-cards' as ActiveTab, label: 'Cartões de Crédito', icon: CardIcon },
    { id: 'categories' as ActiveTab, label: 'Categorias', icon: Tag },
    { id: 'budgets' as ActiveTab, label: 'Orçamentos', icon: Target },
    { id: 'reports' as ActiveTab, label: 'Relatórios', icon: PieChart },
    { id: 'backup' as ActiveTab, label: 'Backup & Exportação', icon: HardDrive },
    { id: 'integrity' as ActiveTab, label: 'Integridade do Banco', icon: ShieldCheck },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between hidden md:flex">
      <div>
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-slate-100 text-lg tracking-tight">FinControl</h1>
            <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest block">
              Pro Manager
            </span>
          </div>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 bg-slate-950/50 rounded-xl border border-slate-800/60">
        <p className="text-xs text-slate-400 font-medium">Modo Monousuário</p>
        <span className="text-[10px] text-slate-500 block mt-0.5">Versão Pro 3.0</span>
      </div>
    </aside>
  );
};
