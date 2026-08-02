import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import type { CreditCard } from '../../types/database';
import { validateRequired, validateNumberRange } from '../../utils/validation';

interface CreditCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<CreditCard, 'id'> & { id?: string }) => Promise<void>;
  itemToEdit?: CreditCard | null;
}

const PRESET_COLORS = [
  '#18181b', '#f97316', '#8b5cf6', '#3b82f6', 
  '#10b981', '#ec4899', '#ef4444', '#64748b'
];

export const CreditCardModal: React.FC<CreditCardModalProps> = ({
  isOpen,
  onClose,
  onSave,
  itemToEdit,
}) => {
  const [name, setName] = useState('');
  const [bank, setBank] = useState('');
  const [limitAmount, setLimitAmount] = useState<string>('5000.00');
  const [closingDay, setClosingDay] = useState<number>(5);
  const [dueDay, setDueDay] = useState<number>(12);
  const [color, setColor] = useState('#18181b');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name);
      setBank(itemToEdit.bank);
      setLimitAmount(String(itemToEdit.limit_amount));
      setClosingDay(itemToEdit.closing_day);
      setDueDay(itemToEdit.due_day);
      setColor(itemToEdit.color);
    } else {
      setName('');
      setBank('');
      setLimitAmount('5000.00');
      setClosingDay(5);
      setDueDay(12);
      setColor('#18181b');
    }
    setErrors({});
  }, [itemToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateRequired({ name, bank, limitAmount });
    const newErrors = { ...validation.errors };

    const closingErr = validateNumberRange(closingDay, 1, 31);
    if (closingErr) newErrors.closingDay = closingErr;

    const dueErr = validateNumberRange(dueDay, 1, 31);
    if (dueErr) newErrors.dueDay = dueErr;

    const numLimit = parseFloat(limitAmount.replace(',', '.'));
    if (isNaN(numLimit)) {
      newErrors.limitAmount = 'Informe um valor limite válido';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        id: itemToEdit?.id,
        name: name.trim(),
        bank: bank.trim(),
        limit_amount: numLimit,
        closing_day: Number(closingDay),
        due_day: Number(dueDay),
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
      title={itemToEdit ? 'Editar Cartão de Crédito' : 'Novo Cartão de Crédito'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nome do Cartão"
          placeholder="Ex: Cartão Black, Visa Gold..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />

        <Input
          label="Banco Emissor"
          placeholder="Ex: Nubank, Itaú, Bradesco..."
          value={bank}
          onChange={(e) => setBank(e.target.value)}
          error={errors.bank}
        />

        <Input
          label="Limite de Crédito (R$)"
          type="number"
          step="0.01"
          placeholder="5000.00"
          value={limitAmount}
          onChange={(e) => setLimitAmount(e.target.value)}
          error={errors.limitAmount}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Dia Fechamento (1-31)"
            type="number"
            min="1"
            max="31"
            value={closingDay}
            onChange={(e) => setClosingDay(Number(e.target.value))}
            error={errors.closingDay}
          />
          <Input
            label="Dia Vencimento (1-31)"
            type="number"
            min="1"
            max="31"
            value={dueDay}
            onChange={(e) => setDueDay(Number(e.target.value))}
            error={errors.dueDay}
          />
        </div>

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
            {isSubmitting ? 'Salvando...' : itemToEdit ? 'Atualizar' : 'Criar Cartão'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
