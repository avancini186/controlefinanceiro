import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { IconPicker } from '../../components/ui/IconPicker';
import { CategoryService } from '../../services/financial/CategoryService';
import { categorySchema, type CategoryFormData } from '../../types/schemas';
import { CategoryType } from '../../types/enums';
import type { Category } from '../../types';

export interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryToEdit?: Category | null;
  onSuccess: () => void;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  categoryToEdit,
  onSuccess,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      nome: '',
      icone: 'Tag',
      cor: '#64748b',
      tipo: CategoryType.DESPESA,
    },
  });

  const selectedIcon = watch('icone');

  useEffect(() => {
    if (isOpen) {
      if (categoryToEdit) {
        reset({
          nome: categoryToEdit.nome,
          icone: categoryToEdit.icone,
          cor: categoryToEdit.cor,
          tipo: categoryToEdit.tipo,
        });
      } else {
        reset({
          nome: '',
          icone: 'Tag',
          cor: '#64748b',
          tipo: CategoryType.DESPESA,
        });
      }
    }
  }, [categoryToEdit, isOpen]);

  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (categoryToEdit) {
        await CategoryService.update(categoryToEdit.id, data);
      } else {
        await CategoryService.create(data);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving category:', err);
      alert('Erro ao salvar categoria no banco de dados.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={categoryToEdit ? 'Editar Categoria' : 'Nova Categoria'}
      subtitle="Classifique suas movimentações em receitas ou despesas"
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} isLoading={isSubmitting}>
            Salvar Categoria
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nome da Categoria"
          placeholder="Ex: Alimentação, Transporte"
          {...register('nome')}
          error={errors.nome?.message}
        />

        <Select
          label="Tipo da Categoria"
          {...register('tipo')}
          error={errors.tipo?.message}
          options={[
            { value: CategoryType.DESPESA, label: 'Despesa' },
            { value: CategoryType.RECEITA, label: 'Receita' },
          ]}
        />

        <IconPicker
          selectedIcon={selectedIcon || 'Tag'}
          onSelectIcon={(iconName) => setValue('icone', iconName)}
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-300">Cor Identificadora</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              {...register('cor')}
              className="w-10 h-10 rounded-xl bg-transparent border border-slate-800 cursor-pointer"
            />
            <span className="text-xs font-mono text-slate-400">{watch('cor')}</span>
          </div>
        </div>
      </form>
    </Modal>
  );
};
