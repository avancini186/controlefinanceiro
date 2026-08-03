import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { IconPicker } from '../../components/ui/IconPicker';
import { CreditCardService } from '../../services/financial/CreditCardService';
import { creditCardSchema, type CreditCardFormData } from '../../types/schemas';
import type { CreditCard, Account } from '../../types';

export interface CreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  cardToEdit?: CreditCard | null;
  accounts: Account[];
  onSuccess: () => void;
}

export const CreditCardModal: React.FC<CreditCardModalProps> = ({
  isOpen,
  onClose,
  cardToEdit,
  accounts,
  onSuccess,
}) => {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreditCardFormData>({
    resolver: zodResolver(creditCardSchema),
    defaultValues: {
      nome: '',
      limite: 1000,
      diaFechamento: 5,
      diaVencimento: 12,
      contaPadraoId: '',
      cor: '#8b5cf6',
      icone: 'CreditCard',
    },
  });

  const selectedIcon = watch('icone');

  useEffect(() => {
    if (cardToEdit) {
      reset({
        nome: cardToEdit.nome,
        limite: cardToEdit.limite,
        diaFechamento: cardToEdit.diaFechamento,
        diaVencimento: cardToEdit.diaVencimento,
        contaPadraoId: cardToEdit.contaPadraoId || '',
        cor: cardToEdit.cor,
        icone: cardToEdit.icone,
      });
    } else {
      reset({
        nome: '',
        limite: 1000,
        diaFechamento: 5,
        diaVencimento: 12,
        contaPadraoId: accounts[0]?.id || '',
        cor: '#8b5cf6',
        icone: 'CreditCard',
      });
    }
  }, [cardToEdit, accounts, reset, isOpen]);

  const onSubmit = async (data: CreditCardFormData) => {
    try {
      if (cardToEdit) {
        await CreditCardService.update(cardToEdit.id, data);
      } else {
        await CreditCardService.create(data);
      }
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving credit card:', err);
      alert('Erro ao salvar cartão no banco de dados.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={cardToEdit ? 'Editar Cartão' : 'Novo Cartão de Crédito'}
      subtitle="Defina limites e datas para controle automatizado de faturas"
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit(onSubmit)} isLoading={isSubmitting}>
            Salvar Cartão
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Nome do Cartão"
          placeholder="Ex: Nubank Violeta, XP Visa Infinite"
          {...register('nome')}
          error={errors.nome?.message}
        />

        <Input
          label="Limite Total de Crédito (R$)"
          type="number"
          step="0.01"
          {...register('limite', { valueAsNumber: true })}
          error={errors.limite?.message}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Dia de Fechamento"
            type="number"
            min="1"
            max="31"
            {...register('diaFechamento', { valueAsNumber: true })}
            error={errors.diaFechamento?.message}
          />
          <Input
            label="Dia de Vencimento"
            type="number"
            min="1"
            max="31"
            {...register('diaVencimento', { valueAsNumber: true })}
            error={errors.diaVencimento?.message}
          />
        </div>

        <Select
          label="Conta Padrão para Débito da Fatura"
          {...register('contaPadraoId')}
          error={errors.contaPadraoId?.message}
          options={[
            { value: '', label: 'Nenhuma (Selecionar ao pagar)' },
            ...accounts.map((acc) => ({ value: acc.id, label: acc.nome })),
          ]}
        />

        <IconPicker
          selectedIcon={selectedIcon || 'CreditCard'}
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
