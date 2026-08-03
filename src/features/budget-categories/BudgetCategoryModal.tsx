import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { BudgetService } from '../../services/financial/BudgetService';
import { budgetCategorySchema, type BudgetCategoryFormData } from '../../types/schemas';
import type { Category } from '../../types';

export interface BudgetCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  currentAnoMes: string; // YYYY-MM
  onSuccess: () => void;
}

export const BudgetCategoryModal: React.FC<BudgetCategoryModalProps> = ({
  isOpen,
  onClose,
  categories,
  currentAnoMes,
  onSuccess,
}) => {
  const expenseCategories = categories.filter((c) => c.tipo === 'DESPESA');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetCategoryFormData>({
    resolver: zodResolver(budgetCategorySchema),
    defaultValues: {
      categoriaId: expenseCategories[0]?.id || '',
      limiteMensal: 500,
      anoMes: currentAnoMes,
    },
  });

  useEffect(() => {
    reset({
      categoriaId: expenseCategories[0]?.id || '',
      limiteMensal: 500,
      anoMes: currentAnoMes,
    });
  }, [categories, currentAnoMes, reset, isOpen]);

  const onSubmit = async (data: BudgetCategoryFormData) => {
    try {
      await BudgetService.setBudget(data.categoriaId, data.limiteMensal, data.anoMes);
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving budget category:', err);
      alert('Erro ao salvar orçamento de categoria no banco de dados.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Definir Orçamento por Categoria"
      subtitle="Defina o limite máximo planejado para o mês de referência"
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} isLoading={isSubmitting}>
            Salvar Orçamento
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Select
          label="Categoria de Despesa"
          {...register('categoriaId')}
          error={errors.categoriaId?.message}
          options={expenseCategories.map((c) => ({ value: c.id, label: c.nome }))}
        />

        <Input
          label="Teto Máximo Mensal (R$)"
          type="number"
          step="0.01"
          {...register('limiteMensal', { valueAsNumber: true })}
          error={errors.limiteMensal?.message}
        />

        <Input
          label="Mês de Referência (YYYY-MM)"
          type="text"
          placeholder="2026-08"
          {...register('anoMes')}
          error={errors.anoMes?.message}
        />
      </form>
    </Modal>
  );
};
