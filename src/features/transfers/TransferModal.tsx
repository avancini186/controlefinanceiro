import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { useFinancialData } from '../../hooks/useFinancialData';
import { TransferService } from '../../services/financial/TransferService';
import { ArrowLeftRight, AlertCircle } from 'lucide-react';

export interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { accounts, refreshData } = useFinancialData();

  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState<number>(100);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && accounts.length > 0) {
      setFromAccountId(accounts[0]?.id || '');
      setToAccountId(accounts[1]?.id || accounts[0]?.id || '');
      setAmount(100);
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('Transferência entre contas');
      setFormError(null);
    }
  }, [isOpen, accounts]);

  const handleSubmit = async () => {
    setFormError(null);
    if (!fromAccountId || !toAccountId) {
      setFormError('Selecione as contas de origem e destino.');
      return;
    }
    if (fromAccountId === toAccountId) {
      setFormError('A conta de origem e de destino devem ser diferentes.');
      return;
    }
    if (!amount || amount <= 0) {
      setFormError('Informe um valor de transferência válido maior que zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      await TransferService.executeTransfer({
        contaOrigemId: fromAccountId,
        contaDestinoId: toAccountId,
        valor: amount,
        data: date,
        descricao: description,
      });

      await refreshData();
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error executing transfer:', err);
      setFormError(err.message || 'Erro ao executar transferência.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Transferência entre Contas"
      subtitle="Movimente valores entre suas contas mantendo histórico vinculado por transferGroupId"
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} isLoading={isSubmitting}>
            Executar Transferência
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

        <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-3 text-indigo-300 text-xs">
          <ArrowLeftRight className="w-5 h-5 shrink-0" />
          <span>Gera uma transação de saída na origem e uma de entrada no destino compartilhando o mesmo transferGroupId.</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Conta Origem (Saída)"
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value)}
            options={accounts.map((acc) => ({ value: acc.id, label: acc.nome }))}
          />
          <Select
            label="Conta Destino (Entrada)"
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
            options={accounts.map((acc) => ({ value: acc.id, label: acc.nome }))}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Valor (R$)"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
          />
          <Input
            label="Data de Lançamento"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <Input
          label="Descrição"
          placeholder="Ex: Transferência para poupança"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
    </Modal>
  );
};
