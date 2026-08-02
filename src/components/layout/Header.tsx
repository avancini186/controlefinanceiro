import React from 'react';
import { Menu, Calendar } from 'lucide-react';
import type { NavTab } from './Sidebar';
import { formatMonthYear } from '../../utils/formatters';

interface HeaderProps {
  activeTab: NavTab;
  onOpenMobileSidebar: () => void;
}

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Visão geral do seu saldo e movimentações financeiras' },
  transactions: { title: 'Transações', subtitle: 'Gerencie todas as suas entradas, saídas e parcelamentos' },
  accounts: { title: 'Contas Correntes', subtitle: 'Gerencie suas contas bancárias e saldos' },
  cards: { title: 'Cartões de Crédito', subtitle: 'Acompanhe limites, limites disponíveis e datas de vencimento' },
  categories: { title: 'Categorias de Receitas e Despesas', subtitle: 'Classifique suas finanças por tipos e cores' },
  budgets: { title: 'Categorias de Orçamento', subtitle: 'Organize seu planejamento orçamentário' },
  settings: { title: 'Configurações', subtitle: 'Conexão Supabase e opções de banco de dados' },
};

export const Header: React.FC<HeaderProps> = ({ activeTab, onOpenMobileSidebar }) => {
  const currentTabInfo = TAB_TITLES[activeTab] || { title: 'FinControl', subtitle: '' };

  return (
    <header className="h-16 px-4 sm:px-6 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-800 leading-tight">{currentTabInfo.title}</h1>
          <p className="text-xs text-slate-500 hidden sm:block">{currentTabInfo.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">
        <Calendar className="w-4 h-4 text-emerald-600" />
        <span className="capitalize">{formatMonthYear()}</span>
      </div>
    </header>
  );
};
