import React, { useState } from 'react';
import { useFinancialData } from '../../hooks/useFinancialData';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { AccountModal } from './AccountModal';
import { AccountService } from '../../services/financial/AccountService';
import type { Account } from '../../types';
import { Wallet, Plus, Edit2, Trash2 } from 'lucide-react';

export const AccountsView: React.FC = () => {
  const { accounts, refreshData } = useFinancialData();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null);

  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleDelete = async () => {
    if (!accountToDelete) return;
    setIsDeleting(true);
    try {
      await AccountService.delete(accountToDelete.id);
      await refreshData();
      setAccountToDelete(null);
    } catch (err) {
      console.error('Error deleting account:', err);
      alert('Erro ao excluir conta.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-100">Contas Financeiras</h3>
          <p className="text-xs text-slate-400">Gerencie suas contas correntes, investimentos e carteiras</p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            setAccountToEdit(null);
            setIsModalOpen(true);
          }}
        >
          Nova Conta
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
          <p className="text-slate-400 text-sm">Nenhuma conta bancária cadastrada ainda.</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => {
              setAccountToEdit(null);
              setIsModalOpen(true);
            }}
          >
            Cadastrar Primeira Conta
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md relative overflow-hidden flex flex-col justify-between h-52 hover:border-slate-700 transition-all shadow-lg group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-slate-800/80 border border-slate-700/60 rounded-xl text-indigo-400">
                    <Wallet className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-100">{acc.nome}</h4>
                    <Badge variant="neutral" size="sm" className="mt-1">
                      {acc.tipo.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: acc.cor }} />
                </div>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">Saldo Atual (Calculado)</span>
                <span className="text-2xl font-bold font-mono text-slate-100">
                  {formatCurrency(acc.saldoAtual)}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                <span>Saldo Inicial: {formatCurrency(acc.saldoInicial)}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => {
                      setAccountToEdit(acc);
                      setIsModalOpen(true);
                    }}
                    className="p-1 text-slate-400 hover:text-indigo-400"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setAccountToDelete(acc)}
                    className="p-1 text-slate-400 hover:text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal CRUD Conta */}
      <AccountModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        accountToEdit={accountToEdit}
        onSuccess={refreshData}
      />

      {/* Confirm Exclusão */}
      <ConfirmModal
        isOpen={!!accountToDelete}
        onClose={() => setAccountToDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Conta"
        message={`Deseja realmente excluir a conta "${accountToDelete?.nome}"?`}
        isLoading={isDeleting}
      />
    </div>
  );
};
