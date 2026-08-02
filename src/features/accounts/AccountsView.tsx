import React, { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { AccountService } from '../../services/financial';
import type { Account } from '../../types/database';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { AccountModal } from './AccountModal';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Search, Edit2, Trash2, Wallet, Landmark } from 'lucide-react';

export const AccountsView: React.FC = () => {
  const { accounts, refreshData } = useFinancial();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Account | null>(null);
  const [deletingItem, setDeletingItem] = useState<Account | null>(null);

  const filteredItems = accounts.filter(
    (acc) =>
      acc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.bank.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (data: Omit<Account, 'id'> & { id?: string }) => {
    await AccountService.saveAccount(data);
    await refreshData();
  };

  const handleDeleteConfirm = async () => {
    if (deletingItem) {
      await AccountService.deleteAccount(deletingItem.id);
      setDeletingItem(null);
      await refreshData();
    }
  };

  const columns = [
    {
      header: 'Conta',
      cell: (acc: Account) => (
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
            style={{ backgroundColor: acc.color }}
          >
            <Wallet className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800">{acc.name}</span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Landmark className="w-3 h-3" /> {acc.bank}
            </span>
          </div>
        </div>
      ),
    },
    {
      header: 'Banco',
      accessorKey: 'bank' as keyof Account,
    },
    {
      header: 'Saldo Inicial',
      cell: (acc: Account) => (
        <span className="font-mono font-semibold text-slate-800">
          {formatCurrency(Number(acc.initial_balance))}
        </span>
      ),
    },
    {
      header: 'Ações',
      className: 'text-right',
      cell: (acc: Account) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingItem(acc);
              setIsModalOpen(true);
            }}
            title="Editar"
          >
            <Edit2 className="w-4 h-4 text-slate-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeletingItem(acc)}
            title="Excluir"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="w-full max-w-xs">
          <Input
            placeholder="Pesquisar conta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            icon={<Search className="w-4 h-4" />}
          />
        </div>

        <Button
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          Nova Conta
        </Button>
      </div>

      <Table
        columns={columns}
        data={filteredItems}
        keyExtractor={(item) => item.id}
        emptyMessage="Nenhuma conta cadastrada."
      />

      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        itemToEdit={editingItem}
      />

      <ConfirmModal
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Conta Corrente"
        message={`Tem certeza que deseja excluir a conta "${deletingItem?.name}"?`}
      />
    </div>
  );
};
