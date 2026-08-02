import React, { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { CategoryService } from '../../services/financial';
import { TransactionType, type Category } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { CategoryModal } from './CategoryModal';
import { DynamicIcon } from '../../components/ui/IconPicker';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';

export const CategoriesView: React.FC = () => {
  const { categories, refreshData } = useFinancial();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const filteredCategories = categories.filter((cat) => {
    const matchesSearch = cat.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || cat.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const handleSave = async (categoryData: Omit<Category, 'id'> & { id?: string }) => {
    await CategoryService.saveCategory(categoryData);
    await refreshData();
  };

  const handleDeleteConfirm = async () => {
    if (deletingCategory) {
      await CategoryService.deleteCategory(deletingCategory.id);
      setDeletingCategory(null);
      await refreshData();
    }
  };

  const columns = [
    {
      header: 'Categoria',
      cell: (cat: Category) => (
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
            style={{ backgroundColor: cat.color }}
          >
            <DynamicIcon name={cat.icon} className="w-5 h-5" />
          </div>
          <span className="font-semibold text-slate-800">{cat.name}</span>
        </div>
      ),
    },
    {
      header: 'Tipo',
      cell: (cat: Category) => (
        <Badge variant={cat.type === TransactionType.INCOME ? 'emerald' : 'rose'}>
          {cat.type === TransactionType.INCOME ? 'Receita' : 'Despesa'}
        </Badge>
      ),
    },
    {
      header: 'Cor',
      cell: (cat: Category) => (
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border border-slate-200" style={{ backgroundColor: cat.color }} />
          <span className="text-xs font-mono text-slate-500">{cat.color}</span>
        </div>
      ),
    },
    {
      header: 'Ações',
      className: 'text-right',
      cell: (cat: Category) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingCategory(cat);
              setIsModalOpen(true);
            }}
            title="Editar"
          >
            <Edit2 className="w-4 h-4 text-slate-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeletingCategory(cat)}
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
      {/* Header Bar Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-full max-w-xs">
            <Input
              placeholder="Pesquisar categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="flex items-center bg-slate-200/60 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setTypeFilter(TransactionType.INCOME)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                typeFilter === TransactionType.INCOME ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              Receitas
            </button>
            <button
              onClick={() => setTypeFilter(TransactionType.EXPENSE)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                typeFilter === TransactionType.EXPENSE ? 'bg-white text-rose-700 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              Despesas
            </button>
          </div>
        </div>

        <Button
          onClick={() => {
            setEditingCategory(null);
            setIsModalOpen(true);
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          Nova Categoria
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredCategories}
        keyExtractor={(cat) => cat.id}
        emptyMessage="Nenhuma categoria encontrada."
      />

      {/* Create / Edit Modal */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        categoryToEdit={editingCategory}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingCategory)}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Categoria"
        message={`Tem certeza que deseja excluir a categoria "${deletingCategory?.name}"? Transações vinculadas a ela perderão o vínculo.`}
      />
    </div>
  );
};
