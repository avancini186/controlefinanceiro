import React, { useState } from 'react';
import { useFinancialData } from '../../hooks/useFinancialData';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { CreditCardModal } from './CreditCardModal';
import { CreditCardService } from '../../services/financial/CreditCardService';
import type { CreditCard } from '../../types';
import { CreditCard as CardIcon, Plus, Calendar, ShieldCheck, Edit2, Trash2 } from 'lucide-react';

export const CreditCardsView: React.FC = () => {
  const { creditCards, accounts, refreshData } = useFinancialData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [cardToEdit, setCardToEdit] = useState<CreditCard | null>(null);

  const [cardToDelete, setCardToDelete] = useState<CreditCard | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleDelete = async () => {
    if (!cardToDelete) return;
    setIsDeleting(true);
    try {
      await CreditCardService.delete(cardToDelete.id);
      await refreshData();
      setCardToDelete(null);
    } catch (err) {
      console.error('Error deleting card:', err);
      alert('Erro ao excluir cartão.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-100">Cartões de Crédito</h3>
          <p className="text-xs text-slate-400">Controle de limites, faturas atuais e faturas vindouras</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setCardToEdit(null);
            setIsModalOpen(true);
          }}
        >
          Novo Cartão
        </Button>
      </div>

      {creditCards.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
          <p className="text-slate-400 text-sm">Nenhum cartão de crédito cadastrado ainda.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setCardToEdit(null);
              setIsModalOpen(true);
            }}
          >
            Cadastrar Primeiro Cartão
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {creditCards.map((card) => {
            const currentInvoice = card.faturaAtual || 0;
            const nextInvoice = card.faturaProxima || 0;
            const usedPercentage = Math.min(100, Math.round((currentInvoice / (card.limite || 1)) * 100));

            return (
              <div
                key={card.id}
                className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-5 hover:border-slate-700 transition-all shadow-lg group relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                      <CardIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-100">{card.nome}</h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Cartão Ativo
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: card.cor }} />
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setCardToEdit(card);
                          setIsModalOpen(true);
                        }}
                        className="p-1 text-slate-400 hover:text-indigo-400"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCardToDelete(card)}
                        className="p-1 text-slate-400 hover:text-rose-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Invoices Breakdown */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Fatura Atual (Aberta)</span>
                    <span className="text-sm font-bold font-mono text-amber-400">
                      {formatCurrency(currentInvoice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Próxima Fatura</span>
                    <span className="text-sm font-bold font-mono text-indigo-300">
                      {formatCurrency(nextInvoice)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Fatura Aberta: {formatCurrency(currentInvoice)}</span>
                    <span className="text-slate-400">Limite: {formatCurrency(card.limite)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${usedPercentage}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-right text-slate-500 font-mono">
                    {usedPercentage}% do limite utilizado nesta fatura
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-800/60 grid grid-cols-2 gap-4 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>Fechamento: Dia {card.diaFechamento}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>Vencimento: Dia {card.diaVencimento}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal CRUD Cartão */}
      <CreditCardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        cardToEdit={cardToEdit}
        accounts={accounts}
        onSuccess={refreshData}
      />

      {/* Confirm Exclusão */}
      <ConfirmModal
        isOpen={!!cardToDelete}
        onClose={() => setCardToDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Cartão de Crédito"
        message={`Deseja realmente excluir o cartão "${cardToDelete?.nome}"?`}
        isLoading={isDeleting}
      />
    </div>
  );
};
