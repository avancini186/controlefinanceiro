import React from 'react';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  Wallet, 
  CreditCard, 
  Tag, 
  PieChart, 
  Settings,
  ShieldCheck
} from 'lucide-react';
import { clsx } from 'clsx';

export type NavTab = 
  | 'dashboard' 
  | 'transactions' 
  | 'accounts' 
  | 'cards' 
  | 'categories' 
  | 'budgets' 
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isOpenMobile: boolean;
  setIsOpenMobile: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpenMobile,
  setIsOpenMobile,
}) => {
  const menuItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'transactions', label: 'Transações', icon: <ArrowLeftRight className="w-5 h-5" /> },
    { id: 'accounts', label: 'Contas', icon: <Wallet className="w-5 h-5" /> },
    { id: 'cards', label: 'Cartões', icon: <CreditCard className="w-5 h-5" /> },
    { id: 'categories', label: 'Categorias', icon: <Tag className="w-5 h-5" /> },
    { id: 'budgets', label: 'Orçamentos', icon: <PieChart className="w-5 h-5" /> },
    { id: 'settings', label: 'Configurações', icon: <Settings className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={() => setIsOpenMobile(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside
        className={clsx(
          'fixed lg:static top-0 left-0 z-50 h-screen w-64 bg-slate-900 text-slate-300 flex flex-col justify-between transition-transform duration-300 ease-in-out border-r border-slate-800 shrink-0',
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div>
          {/* Logo Brand Header */}
          <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xl shadow-md">
              F
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-50 text-base leading-tight tracking-tight">FinControl</span>
              <span className="text-[11px] text-slate-400 font-medium">Gestão Financeira</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 flex flex-col gap-1">
            {menuItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpenMobile(false);
                  }}
                  className={clsx(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors w-full text-left',
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400 font-semibold border-l-4 border-emerald-500 pl-2.5'
                      : 'hover:bg-slate-800/80 hover:text-slate-100 text-slate-400'
                  )}
                >
                  <span className={clsx(isActive ? 'text-emerald-400' : 'text-slate-400')}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Footer Badge */}
        <div className="p-4 border-t border-slate-800/80 text-xs text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Sistema Simples & Seguro</span>
          </div>
        </div>
      </aside>
    </>
  );
};
