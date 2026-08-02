import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import type { Account } from '../../types/database';
import { validateRequired } from '../../utils/validation';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<Account, 'id'> & { id?: string }) => Promise<void>;
  itemToEdit?: Account | null;
}

const PRESET_COLORS = [
  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', 
  '#ec4899', '#f59e0b', '#ef4444', '#64748b'
];

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  itemToEdit,
}) => {
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [initialBalance, setInitialBalance] = useState<string>('0.00');
  const [color, setColor] = useState('#10b981');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name);
      setBank(itemToEdit.bank);
      setInitialBalance(String(itemToEdit.initial_balance));
      setColor(itemToEdit.color);
    } else {
      setName('');
      setBank('');
      setInitialBalance('0.00');
      setColor('#10b981');
    }
    setErrors({});
  }, [itemToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateRequired({ name, bank, initialBalance });
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    const numBalance = parseFloat(initialBalance.replace(',', '.'));
    if (isNaN(numBalance)) {
      setErrors({ initialBalance: 'Informe um saldo numérico válido' });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        id: itemToEdit?.id,
        name: name.trim(),
        bank: bank.trim(),
        initial_balance: numBalance,
        color,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={itemToEdit ? 'Editar Conta Corrente' : 'Nova Conta Corrente'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nome da Conta"
          placeholder="Ex: Conta Corrente Principal, Reserva..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />

        <Input
          label="Banco / Instituição"
          placeholder="Ex: Banco do Brasil, Nubank, Itaú..."
          value={bank}
          onChange={(e) => setBank(e.target.value)}
          error={errors.bank}
        />

        <Input
          label="Saldo Inicial (R$)"
          type="number"
          step="0.01"
          placeholder="0.00"
          value={initialBalance}
          onChange={(e) => setInitialBalance(e.target.value)}
          error={errors.initialBalance}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Cor de Identificação</label>
          <div className="flex items-center gap-2">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-transform ${
                  color === c ? 'scale-125 ring-2 ring-offset-2 ring-slate-800' : 'hover:scale-110'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded-lg cursor-pointer border border-slate-200 bg-transparent p-0 ml-2"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : itemToEdit ? 'Atualizar' : 'Criar Conta'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
