import React, { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { FinancialService } from '../../services/financialService';
import type { BudgetCategory } from '../../types/database';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { BudgetCategoryModal } from './BudgetCategoryModal';
import { DynamicIcon } from '../../components/ui/IconPicker';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';

export const BudgetCategoriesView: React.FC = () => {
  const { budgetCategories, refreshData } = useFinancial();
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetCategory | null>(null);
  const [deletingItem, setDeletingItem] = useState<BudgetCategory | null>(null);

  const filteredItems = budgetCategories.filter((bCat) =>
    bCat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = async (data: Omit<BudgetCategory, 'id'> & { id?: string }) => {
    await FinancialService.saveBudgetCategory(data);
    await refreshData();
  };

  const handleDeleteConfirm = async () => {
    if (deletingItem) {
      await FinancialService.deleteBudgetCategory(deletingItem.id);
      setDeletingItem(null);
      await refreshData();
    }
  };

  const columns = [
    {
      header: 'Categoria de Orçamento',
      cell: (bCat: BudgetCategory) => (
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
            style={{ backgroundColor: bCat.color }}
          >
            <DynamicIcon name={bCat.icon} className="w-5 h-5" />
          </div>
          <span className="font-semibold text-slate-800">{bCat.name}</span>
        </div>
      ),
    },
    {
      header: 'Cor',
      cell: (bCat: BudgetCategory) => (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: bCat.color }} />
          <span className="text-xs font-mono text-slate-500">{bCat.color}</span>
        </div>
      ),
    },
    {
      header: 'Ações',
      className: 'text-right',
      cell: (bCat: BudgetCategory) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingItem(bCat);
              setIsModalOpen(true);
            }}
            title="Editar"
          >
            <Edit2 className="w-4 h-4 text-slate-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeletingItem(bCat)}
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
            placeholder="Pesquisar orçamento..."
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
          Novo Orçamento
        </Button>
      </div>

      <Table
        columns={columns}
        data={filteredItems}
        keyExtractor={(item) => item.id}
        emptyMessage="Nenhuma categoria de orçamento cadastrada."
      />

      <BudgetCategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        itemToEdit={editingItem}
      />

      <ConfirmModal
        isOpen={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Categoria de Orçamento"
        message={`Tem certeza que deseja excluir "${deletingItem?.name}"?`}
      />
    </div>
  );
};
