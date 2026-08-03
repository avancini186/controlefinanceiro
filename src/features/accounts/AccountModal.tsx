import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { IconPicker } from '../../components/ui/IconPicker';
import { AccountService } from '../../services/financial/AccountService';
import { accountSchema, type AccountFormData } from '../../types/schemas';
import { AccountType } from '../../types/enums';
import type { Account } from '../../types';

export interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountToEdit?: Account | null;
  onSuccess: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  accountToEdit,
  onSuccess,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      nome: '',
      tipo: AccountType.CONTA_CORRENTE,
      saldoInicial: 0,
      cor: '#3b82f6',
      icone: 'Wallet',
      ativa: true,
    },
  });

  const selectedIcon = watch('icone');

  useEffect(() => {
    if (accountToEdit) {
      reset({
        nome: accountToEdit.nome,
        tipo: accountToEdit.tipo,
        saldoInicial: accountToEdit.saldoInicial,
        cor: accountToEdit.cor,
        icone: accountToEdit.icone,
        ativa: accountToEdit.ativa,
      });
    } else {
      reset({
        nome: '',
        tipo: AccountType.CONTA_CORRENTE,
        saldoInicial: 0,
        cor: '#3b82f6',
        icone: 'Wallet',
        ativa: true,
      });
    }
  }, [accountToEdit, reset, isOpen]);

  const onSubmit = async (data: AccountFormData) => {
    try {
      if (accountToEdit) {
        await AccountService.update(accountToEdit.id, data);
      } else {
        await AccountService.create(data);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving account:', err);
      alert('Erro ao salvar conta no banco de dados.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={accountToEdit ? 'Editar Conta' : 'Nova Conta'}
      subtitle="Cadastre contas correntes, investimentos ou reserva de emergência"
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} isLoading={isSubmitting}>
            Salvar Conta
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nome da Conta"
          placeholder="Ex: Nubank, Itaú, XP Investimentos"
          {...register('nome')}
          error={errors.nome?.message}
        />

        <Select
          label="Tipo da Conta"
          {...register('tipo')}
          error={errors.tipo?.message}
          options={[
            { value: AccountType.CONTA_CORRENTE, label: 'Conta Corrente' },
            { value: AccountType.POUPANCA, label: 'Poupança' },
            { value: AccountType.INVESTIMENTO, label: 'Investimento' },
            { value: AccountType.CARTEIRA, label: 'Carteira (Dinheiro)' },
            { value: AccountType.OUTROS, label: 'Outros' },
          ]}
        />

        <Input
          label="Saldo Inicial (R$)"
          type="number"
          step="0.01"
          {...register('saldoInicial', { valueAsNumber: true })}
          error={errors.saldoInicial?.message}
        />

        <IconPicker
          selectedIcon={selectedIcon || 'Wallet'}
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
