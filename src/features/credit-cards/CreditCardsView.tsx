import React, { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { FinancialService } from '../../services/financialService';
import type { CreditCard } from '../../types/database';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { CreditCardModal } from './CreditCardModal';
import { formatCurrency } from '../../utils/formatters';
import { Plus, Search, Edit2, Trash2, CreditCard as CardIcon, Calendar } from 'lucide-react';

export const CreditCardsView: React.FC = () => {
  const { cards, refreshData } = useFinancial();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CreditCard | null>(null);
  const [deletingItem, setDeletingItem] = useState<CreditCard | null>(null);

  const filteredItems = cards.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.bank.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (data: Omit<CreditCard, 'id'> & { id?: string }) => {
    await FinancialService.saveCreditCard(data);
    await refreshData();
  };

  const handleDeleteConfirm = async () => {
    if (deletingItem) {
      await FinancialService.deleteCreditCard(deletingItem.id);
      setDeletingItem(null);
      await refreshData();
    }
  };

  const columns = [
    {
      header: 'Cartão',
      cell: (c: CreditCard) => (
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
            style={{ backgroundColor: c.color }}
          >
            <CardIcon className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800">{c.name}</span>
            <span className="text-xs text-slate-400 font-medium">{c.bank}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Banco',
      accessorKey: 'bank' as keyof CreditCard,
    },
    {
      header: 'Limite',
      cell: (c: CreditCard) => (
        <span className="font-mono font-semibold text-slate-800">
          {formatCurrency(Number(c.limit_amount))}
        </span>
      ),
    },
    {
      header: 'Fechamento / Vencimento',
      cell: (c: CreditCard) => (
        <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Dia {c.closing_day} / Dia {c.due_day}</span>
        </div>
      ),
    },
    {
      header: 'Ações',
      className: 'text-right',
      cell: (c: CreditCard) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingItem(c);
              setIsModalOpen(true);
            }}
            title="Editar"
          >
            <Edit2 className="w-4 h-4 text-slate-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeletingItem(c)}
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
            placeholder="Pesquisar cartão..."
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
          Novo Cartão
        </Button>
      </div>

      <Table
        columns={columns}
        data={filteredItems}
        keyExtractor={(item) => item.id}
        emptyMessage="Nenhum cartão de crédito cadastrado."
      />

      <CreditCardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        itemToEdit={editingItem}
      />

      <ConfirmModal
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Cartão de Crédito"
        message={`Tem certeza que deseja excluir o cartão "${deletingItem?.name}"?`}
      />
    </div>
  );
};
