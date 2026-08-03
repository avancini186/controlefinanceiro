import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useFinancialData } from '../../hooks/useFinancialData';
import { TransactionService } from '../../services/financial/TransactionService';
import { InstallmentService } from '../../services/financial/InstallmentService';
import { ClassificationService, type CategorySuggestion } from '../../services/financial/ClassificationService';
import { NotificationService } from '../../services/NotificationService';
import { TransactionType, TransactionStatus } from '../../types/enums';
import type { Transaction } from '../../types';
import { OCRScannerModal } from '../ocr/OCRScannerModal';
import type { OCRScanResult } from '../../services/financial/OCRScannerService';
import { SplitTransactionEditor, type SplitRow } from './components/SplitTransactionEditor';
import { InstallmentSection } from './components/InstallmentSection';
import { Layers, AlertCircle, ScanText, Sparkles } from 'lucide-react';

export interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  transactionToEdit?: Transaction | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  transactionToEdit,
}) => {
  const { categories, accounts, creditCards, refreshData } = useFinancialData();

  const [transactionType, setTransactionType] = useState<TransactionType>(TransactionType.DESPESA);
  const [paymentMethod, setPaymentMethod] = useState<'CONTA' | 'CARTAO'>('CONTA');

  const [totalAmount, setTotalAmount] = useState<number>(100);
  const [description, setDescription] = useState('');
  const [observacao, setObservacao] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [cardId, setCardId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  // AI Suggestions
  const [suggestions, setSuggestions] = useState<CategorySuggestion[]>([]);

  // Installment Mode
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState<number>(2);

  // Split Transaction mode & rows
  const [isSplitMode, setIsSplitMode] = useState(false);
  const [splits, setSplits] = useState<SplitRow[]>([]);

  // OCR Modal state
  const [isOCRModalOpen, setIsOCRModalOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (transactionToEdit) {
        setTransactionType(transactionToEdit.tipo || TransactionType.DESPESA);
        setPaymentMethod(transactionToEdit.cartaoId ? 'CARTAO' : 'CONTA');
        setTotalAmount(transactionToEdit.valor);
        setDescription(transactionToEdit.descricao);
        setObservacao(transactionToEdit.observacao || '');
        setDate(transactionToEdit.data);
        setAccountId(transactionToEdit.contaId || accounts[0]?.id || '');
        setCardId(transactionToEdit.cartaoId || creditCards[0]?.id || '');
        setCategoryId(transactionToEdit.categoriaId || categories[0]?.id || '');
        const hasSplits = Boolean(transactionToEdit.splits && transactionToEdit.splits.length > 0);
        setIsSplitMode(hasSplits);
        setSplits(
          hasSplits
            ? (transactionToEdit.splits || []).map((s) => ({
                id: s.id,
                categoryId: s.categoryId,
                amount: s.amount,
                description: s.description || '',
              }))
            : []
        );
        setIsInstallment(Boolean(transactionToEdit.grupoParcelamentoId));
        setInstallmentsCount(transactionToEdit.totalParcelas || 2);
        setFormError(null);
        setSuggestions([]);
      } else {
        setAccountId(accounts[0]?.id || '');
        setCardId(creditCards[0]?.id || '');
        setCategoryId(categories[0]?.id || '');
        setDate(new Date().toISOString().split('T')[0]);
        setDescription('');
        setObservacao('');
        setTotalAmount(100);
        setIsSplitMode(false);
        setIsInstallment(false);
        setInstallmentsCount(2);
        setSplits([]);
        setFormError(null);
        setSuggestions([]);
      }
    }
  }, [isOpen, transactionToEdit, accounts, creditCards, categories]);

  // Live Category Intelligence Suggestion
  useEffect(() => {
    if (!description.trim() || description.length < 3) {
      setSuggestions([]);
      return;
    }

    let isCurrent = true;
    ClassificationService.suggestCategory(description).then((suggs) => {
      if (isCurrent) setSuggestions(suggs);
    });

    return () => {
      isCurrent = false;
    };
  }, [description]);

  const handleOCRResult = (result: OCRScanResult) => {
    if (result.valor) setTotalAmount(result.valor);
    if (result.data) setDate(result.data);
    if (result.estabelecimento) setDescription(result.estabelecimento);
    if (result.tipo) setTransactionType(result.tipo);
    setObservacao('Lançamento preenchido via OCR de Comprovante');
    NotificationService.info('Comprovante lido com sucesso!', 'Verifique os dados preenchidos.');
  };

  const distributedAmount = splits.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const remainingAmount = Number((totalAmount - distributedAmount).toFixed(2));
  const isSplitValid = Math.abs(remainingAmount) < 0.01;

  const handleAddSplitRow = () => {
    setSplits([
      ...splits,
      { id: Date.now().toString(), categoryId: categories[0]?.id || '', amount: 0, description: '' },
    ]);
  };

  const handleRemoveSplitRow = (id: string) => {
    setSplits(splits.filter((s) => s.id !== id));
  };

  const handleUpdateSplit = (id: string, field: keyof SplitRow, value: unknown) => {
    setSplits(splits.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleSubmit = async () => {
    setFormError(null);
    if (!description.trim()) {
      setFormError('Informe a descrição da transação.');
      return;
    }
    if (!totalAmount || totalAmount <= 0) {
      setFormError('Informe um valor válido maior que zero.');
      return;
    }

    if (isSplitMode && !isSplitValid) {
      setFormError('A soma dos splits deve ser exatamente igual ao valor total da transação.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (transactionToEdit) {
        // Update existing transaction
        const formattedSplits = isSplitMode
          ? splits.map((s) => ({
              id: s.id,
              transactionId: transactionToEdit.id,
              categoryId: s.categoryId,
              amount: s.amount,
              description: s.description,
            }))
          : [];

        await TransactionService.update(
          transactionToEdit.id,
          {
            tipo: transactionType,
            valor: totalAmount,
            data: date,
            categoriaId: isSplitMode ? null : categoryId || null,
            contaId: paymentMethod === 'CONTA' ? accountId || null : null,
            cartaoId: paymentMethod === 'CARTAO' ? cardId || null : null,
            descricao: description,
            observacao: observacao || null,
          },
          formattedSplits
        );

        NotificationService.success('Transação atualizada com sucesso!');
      } else if (isInstallment && installmentsCount > 1) {
        // Create Installment Series
        await InstallmentService.createInstallmentPurchase(
          {
            tipo: transactionType,
            valor: totalAmount,
            data: date,
            categoriaId: isSplitMode ? undefined : categoryId || undefined,
            contaId: paymentMethod === 'CONTA' ? accountId || undefined : undefined,
            cartaoId: paymentMethod === 'CARTAO' ? cardId || undefined : undefined,
            descricao: description,
            observacao: observacao || undefined,
            status: TransactionStatus.CONCLUIDO,
          },
          installmentsCount
        );
        NotificationService.success('Transação cadastrada com sucesso!');
      } else {
        // Create Single or Split Transaction
        const formattedSplits = isSplitMode
          ? splits.map((s) => ({ categoryId: s.categoryId, amount: s.amount, description: s.description }))
          : undefined;

        await TransactionService.create(
          {
            tipo: transactionType,
            valor: totalAmount,
            data: date,
            categoriaId: isSplitMode ? undefined : categoryId || undefined,
            contaId: paymentMethod === 'CONTA' ? accountId || undefined : undefined,
            cartaoId: paymentMethod === 'CARTAO' ? cardId || undefined : undefined,
            descricao: description,
            observacao: observacao || undefined,
            status: TransactionStatus.CONCLUIDO,
          },
          formattedSplits
        );
        NotificationService.success('Transação cadastrada com sucesso!');
      }

      await refreshData();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar transação no banco de dados.';
      console.error('Error saving transaction:', err);
      setFormError(msg);
      NotificationService.error('Erro ao salvar transação', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={transactionToEdit ? 'Editar Transação' : 'Nova Transação'}
        subtitle={
          transactionToEdit
            ? 'Atualize os dados da movimentação selecionada'
            : 'Cadastre movimentações simples, parceladas ou divididas por categoria'
        }
        maxWidth="lg"
        footer={
          <>
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              disabled={isSplitMode && !isSplitValid}
              onClick={handleSubmit}
              isLoading={isSubmitting}
            >
              {transactionToEdit ? 'Salvar Alterações' : 'Salvar Transação'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* OCR Scanner Button */}
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-300 text-xs">
              <ScanText className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Possui um comprovante em foto ou PDF?</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<ScanText className="w-3.5 h-3.5 text-indigo-400" />}
              onClick={() => setIsOCRModalOpen(true)}
            >
              Escanear OCR
            </Button>
          </div>

          {/* Tipo de Transação */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-950/60 border border-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setTransactionType(TransactionType.DESPESA)}
              className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                transactionType === TransactionType.DESPESA
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => setTransactionType(TransactionType.RECEITA)}
              className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                transactionType === TransactionType.RECEITA
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Receita
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Valor Total (R$)"
              type="number"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
            />
            <Input
              label="Data de Lançamento"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Input
              label="Descrição"
              placeholder="Ex: Mercado Carrefour, Posto Shell, Amazon"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {/* AI Category Suggestion Badges */}
            {suggestions.length > 0 && !isSplitMode && (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1.5 animate-fade-in">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" /> Sugestões Inteligentes de Categoria (Clique para aplicar):
                </span>
                <div className="flex flex-wrap gap-2">
                  {suggestions.slice(0, 3).map((sugg) => (
                    <button
                      key={sugg.categoryId}
                      type="button"
                      onClick={() => setCategoryId(sugg.categoryId)}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-all"
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: sugg.category.cor }} />
                      <span>{sugg.category.nome}</span>
                      <span className="text-[10px] font-mono text-indigo-400">({sugg.probability}%)</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Formas de Pagamento (Conta ou Cartão) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Meio de Pagamento"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as 'CONTA' | 'CARTAO')}
              options={[
                { value: 'CONTA', label: 'Conta Bancária / Carteira' },
                { value: 'CARTAO', label: 'Cartão de Crédito' },
              ]}
            />

            {paymentMethod === 'CONTA' ? (
              <Select
                label="Conta de Origem/Destino"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                options={accounts.map((acc) => ({ value: acc.id, label: acc.nome }))}
              />
            ) : (
              <Select
                label="Cartão de Crédito"
                value={cardId}
                onChange={(e) => setCardId(e.target.value)}
                options={creditCards.map((card) => ({ value: card.id, label: card.nome }))}
              />
            )}
          </div>

          {!isSplitMode && (
            <Select
              label="Categoria"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              options={categories.map((cat) => ({ value: cat.id, label: cat.nome }))}
            />
          )}

          {/* Componente Isolado: Parcelamento */}
          <InstallmentSection
            isInstallment={isInstallment}
            installmentsCount={installmentsCount}
            totalAmount={totalAmount}
            onToggleInstallment={setIsInstallment}
            onChangeInstallmentsCount={setInstallmentsCount}
            formatCurrency={formatCurrency}
          />

          {/* Action Button: Dividir por Categorias */}
          <div className="pt-1">
            <Button
              type="button"
              variant={isSplitMode ? 'secondary' : 'outline'}
              size="sm"
              icon={<Layers className="w-4 h-4 text-indigo-400" />}
              onClick={() => {
                if (!isSplitMode && splits.length === 0) {
                  handleAddSplitRow();
                }
                setIsSplitMode(!isSplitMode);
              }}
              className="w-full border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10"
            >
              {isSplitMode ? 'Desativar Divisão por Categorias' : 'Dividir por Categorias (Split Transaction)'}
            </Button>
          </div>

          {/* Componente Isolado: Split Transactions */}
          {isSplitMode && (
            <SplitTransactionEditor
              splits={splits}
              totalAmount={totalAmount}
              categories={categories}
              onAddSplitRow={handleAddSplitRow}
              onRemoveSplitRow={handleRemoveSplitRow}
              onUpdateSplit={handleUpdateSplit}
              formatCurrency={formatCurrency}
            />
          )}
        </div>
      </Modal>

      {/* Modal do Scanner OCR */}
      <OCRScannerModal
        isOpen={isOCRModalOpen}
        onClose={() => setIsOCRModalOpen(false)}
        onScanComplete={handleOCRResult}
      />
    </>
  );
};
