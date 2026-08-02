import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useFinancial } from '../../context/FinancialContext';
import { TransactionService, InstallmentService } from '../../services/financial';
import { TransactionType, type TransactionWithRelations, type TransactionSplit } from '../../types';
import { validateRequired } from '../../utils/validation';
import { formatCurrency } from '../../utils/formatters';
import { Layers, Split, Plus, Trash2, AlertCircle } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  transactionToEdit?: TransactionWithRelations | null;
}

interface SplitRowState {
  categoryId: string;
  amount: string;
  description: string;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  transactionToEdit,
}) => {
  const { categories, accounts, cards } = useFinancial();

  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
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

  // Split transaction state
  const [isSplit, setIsSplit] = useState(false);
  const [splitRows, setSplitRows] = useState<SplitRowState[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available categories filtered by current transaction type
  const availableCategories = categories.filter((c) => c.type === type);

  useEffect(() => {
    if (transactionToEdit) {
      setType(transactionToEdit.type);
      setAmount(String(transactionToEdit.amount));
      setDate(transactionToEdit.date || new Date().toISOString().split('T')[0]);
      setCategoryId(transactionToEdit.category_id || (availableCategories[0]?.id || ''));
      
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

      if (transactionToEdit.splits && transactionToEdit.splits.length > 0) {
        setIsSplit(true);
        setSplitRows(
          transactionToEdit.splits.map((s) => ({
            categoryId: s.category_id,
            amount: String(s.amount),
            description: s.description || '',
          }))
        );
      } else {
        setIsSplit(false);
        setSplitRows([]);
      }
    } else {
      setType(TransactionType.EXPENSE);
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
      setIsSplit(false);
      setSplitRows([]);
    }
    setErrors({});
  }, [transactionToEdit, isOpen]);

  // Set default category when type changes
  useEffect(() => {
    if (!transactionToEdit && availableCategories.length > 0) {
      setCategoryId(availableCategories[0].id);
    }
  }, [type]);

  const handleToggleSplit = (enabled: boolean) => {
    setIsSplit(enabled);
    if (enabled && splitRows.length === 0) {
      const defaultCat = availableCategories[0]?.id || categories[0]?.id || '';
      const initialAmount = amount ? (parseFloat(amount.replace(',', '.')) || 0) : 0;
      setSplitRows([
        { categoryId: defaultCat, amount: initialAmount ? String(initialAmount) : '', description: '' },
        { categoryId: defaultCat, amount: '', description: '' },
      ]);
    }
  };

  const handleAddSplitRow = () => {
    const defaultCat = availableCategories[0]?.id || categories[0]?.id || '';
    setSplitRows([...splitRows, { categoryId: defaultCat, amount: '', description: '' }]);
  };

  const handleRemoveSplitRow = (index: number) => {
    if (splitRows.length <= 2) return;
    setSplitRows(splitRows.filter((_, i) => i !== index));
  };

  const handleUpdateSplitRow = (index: number, field: keyof SplitRowState, value: string) => {
    const updated = [...splitRows];
    updated[index] = { ...updated[index], [field]: value };
    setSplitRows(updated);
  };

  // Calculations for Split Transactions
  const totalAmountNum = parseFloat(amount.replace(',', '.')) || 0;
  const totalDistributedNum = isSplit
    ? splitRows.reduce((acc, r) => acc + (parseFloat(r.amount.replace(',', '.')) || 0), 0)
    : 0;
  const remainingNum = Math.round((totalAmountNum - totalDistributedNum) * 100) / 100;
  const isSplitAmountMismatch = isSplit && Math.abs(remainingNum) > 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const requiredFields: Record<string, any> = {
      amount,
      date,
    };

    if (!isSplit) {
      requiredFields.categoryId = categoryId;
    }

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

    if (isSplit) {
      if (splitRows.length < 2) {
        newErrors.splits = 'A transação dividida deve possuir ao menos 2 categorias';
      }
      if (isSplitAmountMismatch) {
        newErrors.splits = `O valor distribuído (${formatCurrency(totalDistributedNum)}) deve ser igual ao valor total (${formatCurrency(numAmount)}).`;
      }
      for (let i = 0; i < splitRows.length; i++) {
        const r = splitRows[i];
        const rVal = parseFloat(r.amount.replace(',', '.'));
        if (!r.categoryId) {
          newErrors.splits = `Selecione a categoria no item ${i + 1}`;
          break;
        }
        if (isNaN(rVal) || rVal <= 0) {
          newErrors.splits = `Informe um valor maior que zero no item ${i + 1}`;
          break;
        }
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      const splitsPayload: Omit<TransactionSplit, 'id' | 'transaction_id'>[] | undefined = isSplit
        ? splitRows.map((r) => ({
            category_id: r.categoryId,
            amount: parseFloat(r.amount.replace(',', '.')),
            description: r.description.trim() || undefined,
          }))
        : undefined;

      if (!transactionToEdit && isInstallment && sourceType === 'card') {
        // Multi-installment creation
        await InstallmentService.createInstallmentPurchase({
          description: description.trim() || 'Compra Parcelada',
          total_amount: numAmount,
          installments_count: Number(installmentsCount),
          first_date: date,
          category_id: isSplit ? splitsPayload![0].category_id : categoryId,
          card_id: cardId,
          observation: observation.trim() || undefined,
          splits: splitsPayload,
        });
      } else {
        // Single transaction creation or update
        await TransactionService.saveSingleTransaction(
          {
            id: transactionToEdit?.id,
            type,
            amount: numAmount,
            date,
            category_id: isSplit ? splitsPayload![0].category_id : categoryId,
            account_id: sourceType === 'account' ? accountId : null,
            card_id: sourceType === 'card' ? cardId : null,
            description: description.trim() || undefined,
            observation: observation.trim() || undefined,
          },
          splitsPayload
        );
      }

      await onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving transaction', err);
      setErrors({ submit: err.message || 'Erro ao salvar transação' });
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
            onClick={() => setType(TransactionType.EXPENSE)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              type === TransactionType.EXPENSE
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Despesa
          </button>
          <button
            type="button"
            onClick={() => setType(TransactionType.INCOME)}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              type === TransactionType.INCOME
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
            label={isInstallment ? 'Valor Total da Compra (R$)' : 'Valor Total (R$)'}
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
          {!isSplit ? (
            <Select
              label="Categoria"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={availableCategories.map((c) => ({ value: c.id, label: c.name }))}
              error={errors.categoryId}
              placeholder="Selecione uma categoria..."
            />
          ) : (
            <div className="flex flex-col gap-1.5 justify-center">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Categoria Principal</label>
              <div className="px-3 py-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-lg text-xs font-bold flex items-center gap-1.5">
                <Split className="w-4 h-4" />
                Múltiplas Categorias ({splitRows.length} itens)
              </div>
            </div>
          )}

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

        {/* Split Transactions Action Button & Container */}
        <div className="p-3.5 bg-purple-50/60 border border-purple-200/80 rounded-xl flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isSplit}
                onChange={(e) => handleToggleSplit(e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500"
              />
              <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Split className="w-4 h-4 text-purple-600" />
                Dividir por Categorias (Split)
              </span>
            </label>
            {isSplit && (
              <span className="text-xs font-mono text-purple-700 font-semibold">
                {splitRows.length} categorias
              </span>
            )}
          </div>

          {isSplit && (
            <div className="flex flex-col gap-3 pt-2 border-t border-purple-200/60">
              <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                {splitRows.map((row, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-lg shadow-2xs">
                    <div className="flex-1">
                      <select
                        value={row.categoryId}
                        onChange={(e) => handleUpdateSplitRow(idx, 'categoryId', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-medium text-slate-800"
                      >
                        {availableCategories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-28 sm:w-36">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="R$ 0.00"
                        value={row.amount}
                        onChange={(e) => handleUpdateSplitRow(idx, 'amount', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs font-mono font-semibold text-slate-800 placeholder:text-slate-300 text-right"
                      />
                    </div>

                    <div className="flex-1 hidden sm:block">
                      <input
                        type="text"
                        placeholder="Descrição item..."
                        value={row.description}
                        onChange={(e) => handleUpdateSplitRow(idx, 'description', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-md text-xs text-slate-700 placeholder:text-slate-300"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveSplitRow(idx)}
                      disabled={splitRows.length <= 2}
                      className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                      title="Remover item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddSplitRow}
                  icon={<Plus className="w-3.5 h-3.5" />}
                >
                  Adicionar Categoria
                </Button>

                {/* Live Totals & Mismatch Status */}
                <div className="flex items-center gap-3 text-xs font-mono">
                  <span className="text-slate-600">
                    Distribuído: <strong className="text-slate-900">{formatCurrency(totalDistributedNum)}</strong>
                  </span>
                  <span className={`font-bold ${isSplitAmountMismatch ? 'text-rose-600' : 'text-emerald-600'}`}>
                    Restante: {formatCurrency(remainingNum)}
                  </span>
                </div>
              </div>

              {isSplitAmountMismatch && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    O valor total ({formatCurrency(totalAmountNum)}) não é igual à soma das categorias ({formatCurrency(totalDistributedNum)}).
                    Ajuste {remainingNum > 0 ? `+${formatCurrency(remainingNum)}` : formatCurrency(remainingNum)} para salvar.
                  </span>
                </div>
              )}
            </div>
          )}
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

        {errors.splits && (
          <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-lg border border-rose-200">
            {errors.splits}
          </p>
        )}

        {errors.submit && (
          <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-lg border border-rose-200">
            {errors.submit}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || (isSplit && isSplitAmountMismatch)}>
            {isSubmitting ? 'Salvando...' : transactionToEdit ? 'Atualizar Transação' : 'Criar Transação'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
