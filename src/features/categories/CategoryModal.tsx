import React, { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { IconPicker, DynamicIcon } from '../../components/ui/IconPicker';
import { TransactionType, type Category } from '../../types';
import { validateRequired } from '../../utils/validation';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: Omit<Category, 'id'> & { id?: string }) => Promise<void>;
  categoryToEdit?: Category | null;
}

const PRESET_COLORS = [
  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', 
  '#ec4899', '#f59e0b', '#ef4444', '#64748b', '#18181b'
];

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categoryToEdit,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [color, setColor] = useState('#3b82f6');
  const [icon, setIcon] = useState('Tag');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setType(categoryToEdit.type);
      setColor(categoryToEdit.color);
      setIcon(categoryToEdit.icon);
    } else {
      setName('');
      setType(TransactionType.EXPENSE);
      setColor('#3b82f6');
      setIcon('Tag');
    }
    setErrors({});
  }, [categoryToEdit, isOpen]);

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
        id: categoryToEdit?.id,
        name: name.trim(),
        type,
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
      title={categoryToEdit ? 'Editar Categoria' : 'Nova Categoria'}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nome da Categoria"
          placeholder="Ex: Alimentação, Salário..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />

        <Select
          label="Tipo"
          value={type}
          onChange={(e) => setType(e.target.value as TransactionType)}
          options={[
            { value: TransactionType.EXPENSE, label: 'Despesa' },
            { value: TransactionType.INCOME, label: 'Receita' },
          ]}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Cor da Categoria</label>
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
              title="Cor customizada"
            />
          </div>
        </div>

        <IconPicker value={icon} onChange={setIcon} label="Ícone da Categoria" />

        {/* Preview Card */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">Pré-visualização:</span>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: color }}
          >
            <DynamicIcon name={icon} className="w-4 h-4" />
          </div>
          <span className="text-sm font-semibold text-slate-800">{name || 'Nome da Categoria'}</span>
        </div>

        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : categoryToEdit ? 'Atualizar' : 'Criar Categoria'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
