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
  X,
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
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile = false,
  onCloseMobile,
}) => {
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

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const renderContent = () => (
    <>
      {/* Brand Header */}
      <div className="p-6 pb-4 border-b border-slate-800/60 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
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

        {/* Mobile Close Button */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Scrollable Navigation Items */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Fixed Footer */}
      <div className="p-4 m-4 bg-slate-950/50 rounded-xl border border-slate-800/60 shrink-0">
        <p className="text-xs text-slate-400 font-medium">Modo Monousuário</p>
        <span className="text-[10px] text-slate-500 block mt-0.5">Versão Pro 3.0</span>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen sticky top-0 shrink-0 hidden md:flex z-40 overflow-hidden">
        {renderContent()}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-full z-10 shadow-2xl animate-fade-in overflow-hidden">
            {renderContent()}
          </div>
        </div>
      )}
    </>
  );
};
