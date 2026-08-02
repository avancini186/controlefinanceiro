import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useFinancial } from '../../context/FinancialContext';
import { DataService } from '../../services/dataService';
import type { TransactionWithRelations, TransactionType } from '../../types/database';
import { validateRequired } from '../../utils/validation';
import { formatCurrency } from '../../utils/formatters';
import { Layers } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  transactionToEdit?: TransactionWithRelations | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  transactionToEdit,
}) => {
  const { categories, accounts, cards } = useFinancial();

  const [type, setType] = useState<TransactionType>('expense');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [sourceType, setSourceType] = useState<'account' | 'card'>('account');
  const [accountId, setAccountId] = useState<string>('');
  const [cardId, setCardId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [observation, setObservation] = useState('');

  // Installment specific state
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState<number>(12);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available categories filtered by current transaction type
  const availableCategories = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setAmount(String(transactionToEdit.amount));
      setDate(transactionToEdit.date || new Date().toISOString().split('T')[0]);
      setCategoryId(transactionToEdit.category_id || '');
      
      if (transactionToEdit.card_id) {
        setSourceType('card');
        setCardId(transactionToEdit.card_id);
        setAccountId('');
      } else {
        setSourceType('account');
        setAccountId(transactionToEdit.account_id || (accounts[0]?.id || ''));
        setCardId('');
      }

      setDescription(transactionToEdit.description || '');
      setObservation(transactionToEdit.observation || '');
      setIsInstallment(false);
    } else {
      setType('expense');
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategoryId(availableCategories[0]?.id || categories[0]?.id || '');
      setSourceType('account');
      setAccountId(accounts[0]?.id || '');
      setCardId(cards[0]?.id || '');
      setDescription('');
      setObservation('');
      setIsInstallment(false);
      setInstallmentsCount(12);
    }
    setErrors({});
  }, [transactionToEdit, isOpen]);

  // Set default category when type changes
  useEffect(() => {
    if (!transactionToEdit && availableCategories.length > 0) {
      setCategoryId(availableCategories[0].id);
    }
  }, [type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requiredFields: Record<string, any> = {
      amount,
      date,
      categoryId,
    };

    if (sourceType === 'account') {
      requiredFields.accountId = accountId;
    } else {
      requiredFields.cardId = cardId;
    }

    const validation = validateRequired(requiredFields);
    const newErrors = { ...validation.errors };

    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Informe um valor maior que zero';
    }

    if (isInstallment && sourceType === 'card') {
      if (!installmentsCount || installmentsCount < 2 || installmentsCount > 99) {
        newErrors.installmentsCount = 'Informe entre 2 e 99 parcelas';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (!transactionToEdit && isInstallment && sourceType === 'card') {
        // Multi-installment creation
        await DataService.createInstallmentPurchase({
          description: description.trim() || 'Compra Parcelada',
          total_amount: numAmount,
          installments_count: Number(installmentsCount),
          first_date: date,
          category_id: categoryId,
          card_id: cardId,
          observation: observation.trim() || undefined,
        });
      } else {
        // Single transaction creation or update
        await DataService.saveSingleTransaction({
          id: transactionToEdit?.id,
          type,
          amount: numAmount,
          date,
          category_id: categoryId,
          account_id: sourceType === 'account' ? accountId : null,
          card_id: sourceType === 'card' ? cardId : null,
          description: description.trim() || undefined,
          observation: observation.trim() || undefined,
        });
      }

      await onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving transaction', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculatedInstallmentValue = 
    amount && Number(amount) > 0 && installmentsCount > 0 
      ? Number(amount) / installmentsCount 
      : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={transactionToEdit ? 'Editar Transação' : 'Nova Transação'}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Type Toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              type === 'expense'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Despesa
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              type === 'income'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Receita
          </button>
        </div>

        {/* Amount & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={isInstallment ? 'Valor Total da Compra (R$)' : 'Valor (R$)'}
            type="number"
            step="0.01"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={errors.amount}
          />

          <Input
            label="Data"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={errors.date}
          />
        </div>

        {/* Category & Payment Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Categoria"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            options={availableCategories.map((c) => ({ value: c.id, label: c.name }))}
            error={errors.categoryId}
            placeholder="Selecione uma categoria..."
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Forma de Pagamento</label>
            <div className="flex items-center gap-2">
              <select
                value={sourceType}
                onChange={(e) => {
                  const val = e.target.value as 'account' | 'card';
                  setSourceType(val);
                  if (val === 'account' && !accountId && accounts[0]) setAccountId(accounts[0].id);
                  if (val === 'card' && !cardId && cards[0]) setCardId(cards[0].id);
                  if (val === 'account') setIsInstallment(false);
                }}
                className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700"
              >
                <option value="account">Conta Corrente</option>
                <option value="card">Cartão de Crédito</option>
              </select>

              {sourceType === 'account' ? (
                <div className="flex-1">
                  <Select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    options={accounts.map((a) => ({ value: a.id, label: a.name }))}
                    error={errors.accountId}
                    placeholder="Selecione a conta..."
                  />
                </div>
              ) : (
                <div className="flex-1">
                  <Select
                    value={cardId}
                    onChange={(e) => setCardId(e.target.value)}
                    options={cards.map((c) => ({ value: c.id, label: c.name }))}
                    error={errors.cardId}
                    placeholder="Selecione o cartão..."
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Credit Card Installment Purchase Checkbox */}
        {sourceType === 'card' && !transactionToEdit && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col gap-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isInstallment}
                onChange={(e) => setIsInstallment(e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-600" />
                Marcar como compra parcelada
              </span>
            </label>

            {isInstallment && (
              <div className="flex flex-col sm:flex-row items-center gap-4 pt-2 border-t border-slate-200/80">
                <div className="w-full sm:w-1/2">
                  <Input
                    label="Número de Parcelas"
                    type="number"
                    min="2"
                    max="99"
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(Number(e.target.value))}
                    error={errors.installmentsCount}
                  />
                </div>
                <div className="w-full sm:w-1/2 p-3 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-700 flex flex-col gap-0.5">
                  <span className="font-sans font-semibold text-slate-500 uppercase text-[10px]">Cálculo das Parcelas:</span>
                  <span className="text-emerald-700 font-bold text-sm">
                    {installmentsCount}x de {formatCurrency(calculatedInstallmentValue)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Description & Observation */}
        <Input
          label="Descrição (opcional)"
          placeholder="Ex: Supermercado, Aluguel, Compra de Celular..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Observação (opcional)</label>
          <textarea
            rows={2}
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            placeholder="Detalhes adicionais sobre esta movimentação..."
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : transactionToEdit ? 'Atualizar Transação' : 'Criar Transação'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
