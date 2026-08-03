import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useApp } from '../../context/AppContext';
import { TransactionModal } from '../../features/transactions/TransactionModal';
import { TransferModal } from '../../features/transfers/TransferModal';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, title, subtitle }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const {
    activeTab,
    setActiveTab,
    isTransactionModalOpen,
    editingTransaction,
    closeTransactionModal,
    isTransferModalOpen,
    closeTransferModal,
    refreshData,
  } = useApp();

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans antialiased overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={title}
          subtitle={subtitle}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={closeTransactionModal}
        onSuccess={refreshData}
        transactionToEdit={editingTransaction}
      />
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={closeTransferModal}
        onSuccess={refreshData}
      />
    </div>
  );
};
