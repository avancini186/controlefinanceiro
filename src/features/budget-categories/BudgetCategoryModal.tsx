import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { IconPicker, DynamicIcon } from '../../components/ui/IconPicker';
import type { BudgetCategory } from '../../types/database';
import { validateRequired } from '../../utils/validation';

interface BudgetCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<BudgetCategory, 'id'> & { id?: string }) => Promise<void>;
  itemToEdit?: BudgetCategory | null;
}

const PRESET_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', 
  '#ec4899', '#ef4444', '#06b6d4', '#64748b'
];

export const BudgetCategoryModal: React.FC<BudgetCategoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  itemToEdit,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#8b5cf6');
  const [icon, setIcon] = useState('PieChart');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name);
      setColor(itemToEdit.color);
      setIcon(itemToEdit.icon);
    } else {
      setName('');
      setColor('#8b5cf6');
      setIcon('PieChart');
    }
    setErrors({});
  }, [itemToEdit, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateRequired({ name });
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        id: itemToEdit?.id,
        name: name.trim(),
        color,
        icon,
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
      title={itemToEdit ? 'Editar Categoria de Orçamento' : 'Nova Categoria de Orçamento'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nome do Orçamento"
          placeholder="Ex: Reserva de Emergência, Gastos Fixos..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
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

        <IconPicker value={icon} onChange={setIcon} label="Ícone de Exibição" />

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">Pré-visualização:</span>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: color }}
          >
            <DynamicIcon name={icon} className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold text-slate-800">{name || 'Nome do Orçamento'}</span>
        </div>

        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : itemToEdit ? 'Atualizar' : 'Criar Orçamento'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
