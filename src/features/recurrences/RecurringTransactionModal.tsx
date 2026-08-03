import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { RecurringTransactionService } from '../../services/financial/RecurringTransactionService';
import { recurringTransactionSchema, type RecurringTransactionFormData } from '../../types/schemas';
import { TransactionType, RecurrenceFrequency } from '../../types/enums';
import type { RecurringTransaction, Category, Account, CreditCard } from '../../types';

export interface RecurringTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  recurrenceToEdit?: RecurringTransaction | null;
  categories: Category[];
  accounts: Account[];
  creditCards: CreditCard[];
  onSuccess: () => void;
}

export const RecurringTransactionModal: React.FC<RecurringTransactionModalProps> = ({
  isOpen,
  onClose,
  recurrenceToEdit,
  categories,
  accounts,
  creditCards,
  onSuccess,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RecurringTransactionFormData>({
    resolver: zodResolver(recurringTransactionSchema),
    defaultValues: {
      descricao: '',
      tipo: TransactionType.DESPESA,
      valor: 100,
      categoriaId: categories[0]?.id || '',
      contaId: accounts[0]?.id || '',
      cartaoId: '',
      dataInicio: new Date().toISOString().split('T')[0],
      dataFim: '',
      frequencia: RecurrenceFrequency.MENSAL,
      intervalo: 1,
      ativa: true,
    },
  });

  const selectedTipo = watch('tipo');

  useEffect(() => {
    if (recurrenceToEdit) {
      reset({
        descricao: recurrenceToEdit.descricao,
        tipo: recurrenceToEdit.tipo === TransactionType.RECEITA ? TransactionType.RECEITA : TransactionType.DESPESA,
        valor: recurrenceToEdit.valor,
        categoriaId: recurrenceToEdit.categoriaId || '',
        contaId: recurrenceToEdit.contaId || '',
        cartaoId: recurrenceToEdit.cartaoId || '',
        dataInicio: recurrenceToEdit.dataInicio,
        dataFim: recurrenceToEdit.dataFim || '',
        frequencia: recurrenceToEdit.frequencia,
        intervalo: recurrenceToEdit.intervalo,
        ativa: recurrenceToEdit.ativa,
      });
    } else {
      reset({
        descricao: '',
        tipo: TransactionType.DESPESA,
        valor: 100,
        categoriaId: categories[0]?.id || '',
        contaId: accounts[0]?.id || '',
        cartaoId: '',
        dataInicio: new Date().toISOString().split('T')[0],
        dataFim: '',
        frequencia: RecurrenceFrequency.MENSAL,
        intervalo: 1,
        ativa: true,
      });
    }
  }, [recurrenceToEdit, categories, accounts, reset, isOpen]);

  const onSubmit = async (data: RecurringTransactionFormData) => {
    try {
      const payload = {
        descricao: data.descricao,
        tipo: data.tipo as TransactionType,
        valor: data.valor,
        categoriaId: data.categoriaId || null,
        contaId: data.contaId || null,
        cartaoId: data.cartaoId || null,
        dataInicio: data.dataInicio,
        dataFim: data.dataFim || null,
        frequencia: data.frequencia,
        intervalo: data.intervalo,
        ativa: data.ativa,
      };

      if (recurrenceToEdit) {
        await RecurringTransactionService.update(recurrenceToEdit.id, payload as any);
      } else {
        await RecurringTransactionService.create(payload as any);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving recurring transaction:', err);
      alert('Erro ao salvar transação recorrente.');
    }
  };

  const filteredCategories = categories.filter((c) => c.tipo === selectedTipo);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={recurrenceToEdit ? 'Editar Recorrência' : 'Nova Transação Recorrente'}
      subtitle="Defina contas ou receitas que serão geradas automaticamente"
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit(onSubmit)}
            isLoading={isSubmitting}
          >
            Salvar Recorrência
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Tipo */}
        <div className="grid grid-cols-2 gap-3 p-1 bg-slate-950/60 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => reset({ ...watch(), tipo: TransactionType.DESPESA })}
            className={`py-2 rounded-lg text-xs font-semibold transition-all ${
              selectedTipo === TransactionType.DESPESA
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Despesa Recorrente
          </button>
          <button
            type="button"
            onClick={() => reset({ ...watch(), tipo: TransactionType.RECEITA })}
            className={`py-2 rounded-lg text-xs font-semibold transition-all ${
              selectedTipo === TransactionType.RECEITA
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Receita Recorrente
          </button>
        </div>

        <Input
          label="Descrição / Título"
          placeholder="Ex: Aluguel, Assinatura Netflix, Salário"
          {...register('descricao')}
          error={errors.descricao?.message}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Valor (R$)"
            type="number"
            step="0.01"
            {...register('valor', { valueAsNumber: true })}
            error={errors.valor?.message}
          />

          <Select
            label="Categoria"
            {...register('categoriaId')}
            error={errors.categoriaId?.message}
            options={filteredCategories.map((c) => ({ value: c.id, label: c.nome }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Conta Principal"
            {...register('contaId')}
            error={errors.contaId?.message}
            options={accounts.map((a) => ({ value: a.id, label: a.nome }))}
          />

          <Select
            label="Cartão (Opcional)"
            {...register('cartaoId')}
            error={errors.cartaoId?.message}
            options={[
              { value: '', label: 'Nenhum' },
              ...creditCards.map((c) => ({ value: c.id, label: c.nome })),
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Frequência"
            {...register('frequencia')}
            error={errors.frequencia?.message}
            options={[
              { value: RecurrenceFrequency.DIARIA, label: 'Diária' },
              { value: RecurrenceFrequency.SEMANAL, label: 'Semanal' },
              { value: RecurrenceFrequency.QUINZENAL, label: 'Quinzenal' },
              { value: RecurrenceFrequency.MENSAL, label: 'Mensal' },
              { value: RecurrenceFrequency.BIMESTRAL, label: 'Bimestral' },
              { value: RecurrenceFrequency.TRIMESTRAL, label: 'Trimestral' },
              { value: RecurrenceFrequency.SEMESTRAL, label: 'Semestral' },
              { value: RecurrenceFrequency.ANUAL, label: 'Anual' },
            ]}
          />

          <Input
            label="Intervalo (ex: a cada X períodos)"
            type="number"
            min="1"
            {...register('intervalo', { valueAsNumber: true })}
            error={errors.intervalo?.message}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Data de Início"
            type="date"
            {...register('dataInicio')}
            error={errors.dataInicio?.message}
          />

          <Input
            label="Data de Fim (Opcional)"
            type="date"
            {...register('dataFim')}
            error={errors.dataFim?.message}
          />
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="ativa"
            {...register('ativa')}
            className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
          />
          <label htmlFor="ativa" className="text-xs text-slate-300 cursor-pointer">
            Recorrência ativa (gerará movimentações automaticamente)
          </label>
        </div>
      </form>
    </Modal>
  );
};
