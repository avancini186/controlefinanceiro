import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Modal } from '../../components/ui/Modal';
import { RecurringTransactionService } from '../../services/financial/RecurringTransactionService';
import { useFinancialData } from '../../hooks/useFinancialData';
import { RecurringTransactionModal } from './RecurringTransactionModal';
import type { RecurringTransaction } from '../../types';
import {
  Repeat,
  Plus,
  PlayCircle,
  PauseCircle,
  Trash2,
  Edit2,
  Calendar,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';

export const RecurringTransactionsView: React.FC = () => {
  const { categories, accounts, creditCards, refreshData } = useFinancialData();

  const [recurrences, setRecurrences] = useState<RecurringTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recurrenceToEdit, setRecurrenceToEdit] = useState<RecurringTransaction | null>(null);
  const [recurrenceToDelete, setRecurrenceToDelete] = useState<RecurringTransaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadRecurrences = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await RecurringTransactionService.getAll();
      setRecurrences(data);
    } catch (err) {
      console.error('Error loading recurrences:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecurrences();
  }, [loadRecurrences]);

  const handleTogglePause = async (rec: RecurringTransaction) => {
    try {
      await RecurringTransactionService.update(rec.id, { ativa: !rec.ativa });
      await loadRecurrences();
      await refreshData();
    } catch (err) {
      console.error('Error toggling recurrence status:', err);
      alert('Erro ao alterar status da recorrência.');
    }
  };

  const handleDelete = async () => {
    if (!recurrenceToDelete) return;
    setIsDeleting(true);
    try {
      await RecurringTransactionService.delete(recurrenceToDelete.id);
      await loadRecurrences();
      await refreshData();
      setRecurrenceToDelete(null);
    } catch (err) {
      console.error('Error deleting recurrence:', err);
      alert('Erro ao excluir recorrência.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleProcessNow = async () => {
    setIsProcessing(true);
    try {
      const { createdCount } = await RecurringTransactionService.processPendingRecurrences();
      alert(createdCount > 0 ? `${createdCount} transação(ões) gerada(s) com sucesso!` : 'Nenhuma recorrência pendente para execução hoje.');
      await loadRecurrences();
      await refreshData();
    } catch (err) {
      console.error('Error processing recurrences:', err);
      alert('Erro ao processar transações recorrentes.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const columns: Column<RecurringTransaction>[] = [
    {
      header: 'Descrição',
      accessorKey: 'descricao',
      cell: (rec) => (
        <div>
          <span className="font-semibold text-slate-100 block">{rec.descricao}</span>
          <span className="text-[10px] text-slate-400 font-mono">
            Início: {rec.dataInicio} {rec.dataFim ? `| Fim: ${rec.dataFim}` : '| Sem data fim'}
          </span>
        </div>
      ),
    },
    {
      header: 'Tipo',
      accessorKey: 'tipo',
      cell: (rec) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            rec.tipo === 'RECEITA' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          {rec.tipo}
        </span>
      ),
    },
    {
      header: 'Valor',
      accessorKey: 'valor',
      cell: (rec) => (
        <span className="font-mono font-bold text-slate-200">{formatCurrency(rec.valor)}</span>
      ),
    },
    {
      header: 'Frequência',
      accessorKey: 'frequencia',
      cell: (rec) => (
        <span className="text-xs text-slate-300">
          {rec.frequencia} {rec.intervalo > 1 ? `(a cada ${rec.intervalo})` : ''}
        </span>
      ),
    },
    {
      header: 'Próxima Execução',
      accessorKey: 'proximaExecucao',
      cell: (rec) => (
        <span className="font-mono text-xs text-indigo-400 font-medium flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {rec.proximaExecucao}
        </span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'ativa',
      cell: (rec) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 w-fit ${
            rec.ativa ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-400'
          }`}
        >
          {rec.ativa ? <CheckCircle2 className="w-3 h-3" /> : <PauseCircle className="w-3 h-3" />}
          {rec.ativa ? 'Ativa' : 'Pausada'}
        </span>
      ),
    },
    {
      header: 'Ações',
      cell: (rec) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleTogglePause(rec)}
            title={rec.ativa ? 'Pausar Recorrência' : 'Ativar Recorrência'}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            {rec.ativa ? <PauseCircle className="w-4 h-4 text-amber-400" /> : <PlayCircle className="w-4 h-4 text-emerald-400" />}
          </button>
          <button
            onClick={() => {
              setRecurrenceToEdit(rec);
              setIsModalOpen(true);
            }}
            title="Editar"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <Edit2 className="w-4 h-4 text-indigo-400" />
          </button>
          <button
            onClick={() => setRecurrenceToDelete(rec)}
            title="Excluir"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Repeat className="w-6 h-6 text-indigo-400" /> Transações Recorrentes
          </h2>
          <p className="text-xs text-slate-400">
            Cadastre contas fixas e receitas que se repetem automaticamente no sistema
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className="w-4 h-4 text-indigo-400" />}
            onClick={handleProcessNow}
            isLoading={isProcessing}
            className="w-full sm:w-auto"
          >
            Processar Pendentes Hoje
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setRecurrenceToEdit(null);
              setIsModalOpen(true);
            }}
            className="w-full sm:w-auto"
          >
            Nova Recorrência
          </Button>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
        <Table data={recurrences} columns={columns} isLoading={isLoading} emptyMessage="Nenhuma transação recorrente cadastrada." />
      </div>

      {/* Modal de Formulário */}
      <RecurringTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        recurrenceToEdit={recurrenceToEdit}
        categories={categories}
        accounts={accounts}
        creditCards={creditCards}
        onSuccess={() => {
          loadRecurrences();
          refreshData();
        }}
      />

      {/* Modal de Exclusão */}
      <Modal
        isOpen={!!recurrenceToDelete}
        onClose={() => setRecurrenceToDelete(null)}
        title="Confirmar Exclusão"
        subtitle="A exclusão cancelará execuções futuras desta recorrência"
        footer={
          <>
            <Button variant="outline" onClick={() => setRecurrenceToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
              Excluir Recorrência
            </Button>
          </>
        }
      >
        <p className="text-xs text-slate-300">
          Tem certeza de que deseja remover a regra recorrente para{' '}
          <strong className="text-slate-100">{recurrenceToDelete?.descricao}</strong>?
        </p>
      </Modal>
    </div>
  );
};
