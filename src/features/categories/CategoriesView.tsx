import React, { useState } from 'react';
import { useFinancialData } from '../../hooks/useFinancialData';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { CategoryModal } from './CategoryModal';
import { CategoryService } from '../../services/financial/CategoryService';
import type { Category } from '../../types';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import * as Icons from 'lucide-react';

export const CategoriesView: React.FC = () => {
  const { categories, refreshData } = useFinancialData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);

  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const renderIcon = (name: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const IconComponent = (Icons as any)[name] || Icons.Tag;
    return <IconComponent className="w-5 h-5" />;
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      await CategoryService.delete(categoryToDelete.id);
      await refreshData();
      setCategoryToDelete(null);
    } catch (err) {
      console.error('Error deleting category:', err);
      alert('Erro ao excluir categoria.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-100">Categorias de Transações</h3>
          <p className="text-xs text-slate-400">Classificação de receitas e despesas</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setCategoryToEdit(null);
            setIsModalOpen(true);
          }}
        >
          Nova Categoria
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
          <p className="text-slate-400 text-sm">Nenhuma categoria cadastrada ainda.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setCategoryToEdit(null);
              setIsModalOpen(true);
            }}
          >
            Cadastrar Primeira Categoria
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md flex items-center justify-between hover:border-slate-700 transition-all shadow-sm group"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-100 shadow-md shrink-0"
                  style={{ backgroundColor: `${cat.cor}25`, borderColor: cat.cor, color: cat.cor }}
                >
                  {renderIcon(cat.icone)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-100">{cat.nome}</p>
                  <Badge variant={cat.tipo === 'RECEITA' ? 'success' : 'danger'} size="sm" className="mt-0.5">
                    {cat.tipo}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setCategoryToEdit(cat);
                    setIsModalOpen(true);
                  }}
                  className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCategoryToDelete(cat)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal CRUD Categoria */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categoryToEdit={categoryToEdit}
        onSuccess={refreshData}
      />

      {/* Confirm Exclusão */}
      <ConfirmModal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Categoria"
        message={`Deseja realmente excluir a categoria "${categoryToDelete?.nome}"?`}
        isLoading={isDeleting}
      />
    </div>
  );
};
