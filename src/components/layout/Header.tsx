import React, { useRef } from 'react';
import { Search, Plus, ArrowLeftRight, Menu } from 'lucide-react';
import { Button } from '../ui/Button';
import { useApp } from '../../context/AppContext';
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts';

interface HeaderProps {
  title: string;
  subtitle?: string;
  globalSearchQuery?: string;
  onGlobalSearchChange?: (query: string) => void;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  globalSearchQuery = '',
  onGlobalSearchChange,
  onOpenMobileMenu,
}) => {
  const { openTransactionModal, openTransferModal, isTransactionModalOpen, isTransferModalOpen, closeTransactionModal, closeTransferModal } = useApp();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Register Global Keyboard Shortcuts (Ctrl+N, Ctrl+F, Esc)
  useKeyboardShortcuts({
    onNewTransaction: () => {
      openTransactionModal();
    },
    onFocusSearch: () => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
    },
    onCloseModal: () => {
      if (isTransactionModalOpen) closeTransactionModal();
      if (isTransferModalOpen) closeTransferModal();
    },
  });

  return (
    <header className="h-20 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-6 md:px-8 flex items-center justify-between gap-4 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
        <div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-400 font-medium">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Global Instant Search Bar */}
        <div className="relative hidden sm:block w-64 md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Pesquisar em tudo... (Ctrl+F)"
            value={globalSearchQuery}
            onChange={(e) => onGlobalSearchChange && onGlobalSearchChange(e.target.value)}
            className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-9 pr-12 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
            aria-label="Pesquisar instantânea global"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-slate-800 text-slate-400 text-[10px] font-mono px-1.5 py-0.5 rounded border border-slate-700 pointer-events-none">
            Ctrl+F
          </kbd>
        </div>

        {/* Global Quick Action Buttons */}
        <Button
          variant="outline"
          size="sm"
          icon={<ArrowLeftRight className="w-4 h-4" />}
          onClick={openTransferModal}
          aria-label="Transferência entre contas"
        >
          Transferir
        </Button>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => openTransactionModal()}
          aria-label="Nova transação (Ctrl+N)"
        >
          <span className="hidden md:inline">Nova Transação</span>
          <span className="md:hidden">Nova</span>
        </Button>
      </div>
    </header>
  );
};
