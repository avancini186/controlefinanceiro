import React, { useState, useEffect, useCallback } from 'react';
import { useFinancialData } from '../../hooks/useFinancialData';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { ReconciliationService, type ReconciliationSummary } from '../../services/financial/ReconciliationService';
import { TransactionService } from '../../services/financial/TransactionService';
import type { Transaction } from '../../types';
import {
  CheckCircle2,
  XCircle,
  CheckCheck,
  Scale,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

export const ReconciliationView: React.FC = () => {
  const { accounts, refreshData } = useFinancialData();

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'RECONCILED' | 'UNRECONCILED'>('UNRECONCILED');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [sum, allTx] = await Promise.all([
        ReconciliationService.getReconciliationSummary(selectedAccountId || undefined),
        TransactionService.getAll(selectedAccountId ? { contaId: selectedAccountId } : undefined),
      ]);
      setSummary(sum);
      setTransactions(allTx);
    } catch (err) {
      console.error('Error loading reconciliation data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleReconcile = async (tx: Transaction) => {
    try {
      if (tx.conciliada) {
        await ReconciliationService.unreconcileTransaction(tx.id);
      } else {
        await ReconciliationService.reconcileTransaction(tx.id);
      }
      await loadData();
      await refreshData();
    } catch (err) {
      console.error('Error updating reconciliation status:', err);
      alert('Erro ao atualizar conciliação.');
    }
  };

  const handleBatchReconcile = async () => {
    if (selectedRowIds.length === 0) return;
    try {
      await ReconciliationService.batchReconcile(selectedRowIds);
      setSelectedRowIds([]);
      await loadData();
      await refreshData();
    } catch (err) {
      console.error('Error batch reconciling:', err);
      alert('Erro ao conciliar itens em lote.');
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Filtered transactions
  const displayedTransactions = transactions.filter((tx) => {
    if (filterMode === 'RECONCILED') return tx.conciliada === true;
    if (filterMode === 'UNRECONCILED') return !tx.conciliada;
    return true;
  });

  const columns: Column<Transaction>[] = [
    {
      header: 'Status Conciliação',
      accessorKey: 'conciliada',
      cell: (tx) => (
        <div className="flex items-center gap-2">
          {tx.conciliada ? (
            <Badge variant="success" size="sm" className="gap-1">
              <CheckCircle2 className="w-3 h-3" /> Conciliada
            </Badge>
          ) : (
            <Badge variant="warning" size="sm" className="gap-1">
              <XCircle className="w-3 h-3" /> Pendente
            </Badge>
          )}
        </div>
      ),
    },
    {
      header: 'Data',
      accessorKey: 'data',
      cell: (tx) => <span className="text-slate-400 font-mono text-xs">{tx.data}</span>,
    },
    {
      header: 'Descrição',
      accessorKey: 'descricao',
      cell: (tx) => (
        <div>
          <span className="font-semibold text-slate-100 block">{tx.descricao}</span>
          <span className="text-xs text-slate-400 block">{tx.account?.nome || 'Sem Conta'}</span>
        </div>
      ),
    },
    {
      header: 'Valor',
      accessorKey: 'valor',
      className: 'text-right',
      cell: (tx) => (
        <span
          className={`font-semibold font-mono text-base ${
            tx.tipo === 'RECEITA' ? 'text-emerald-400' : 'text-slate-100'
          }`}
        >
          {tx.tipo === 'RECEITA' ? '+' : '-'} {formatCurrency(tx.valor)}
        </span>
      ),
    },
    {
      header: 'Ação',
      accessorKey: 'id',
      className: 'text-center',
      cell: (tx) => (
        <Button
          variant={tx.conciliada ? 'outline' : 'primary'}
          size="sm"
          onClick={() => handleToggleReconcile(tx)}
        >
          {tx.conciliada ? 'Desfazer' : 'Conciliar'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-100">Conciliação Bancária</h3>
          <p className="text-xs text-slate-400">
            Confera e concilie as movimentações do seu sistema com os extratos do seu banco
          </p>
        </div>

        <div className="w-64">
          <Select
            label="Filtrar por Conta Bancária"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            options={[
              { value: '', label: 'Todas as Contas' },
              ...accounts.map((a) => ({ value: a.id, label: a.nome })),
            ]}
          />
        </div>
      </div>

      {/* Summary Resumo Panel */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-indigo-400" /> Saldo do Sistema
            </span>
            <span className="text-xl font-bold font-mono text-slate-100 block">
              {formatCurrency(summary.saldoSistema)}
            </span>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Saldo Conciliado
            </span>
            <span className="text-xl font-bold font-mono text-emerald-400 block">
              {formatCurrency(summary.saldoConciliado)}
            </span>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" /> Diferença
            </span>
            <span
              className={`text-xl font-bold font-mono block ${
                summary.diferenca === 0 ? 'text-slate-300' : 'text-amber-400'
              }`}
            >
              {formatCurrency(summary.diferenca)}
            </span>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block flex items-center gap-1.5">
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" /> Qtd. Conciliada
            </span>
            <span className="text-xl font-bold font-mono text-slate-100 block">
              {summary.qtdConciliada} transações
            </span>
          </div>

          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block flex items-center gap-1.5">
              <ArrowUpRight className="w-3.5 h-3.5 text-rose-400" /> Qtd. Pendente
            </span>
            <span className="text-xl font-bold font-mono text-slate-100 block">
              {summary.qtdPendente} transações
            </span>
          </div>
        </div>
      )}

      {/* Filter Tabs & Batch Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-slate-950/60 border border-slate-800 rounded-xl w-fit">
          <button
            onClick={() => setFilterMode('UNRECONCILED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'UNRECONCILED'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Somente Não Conciliadas
          </button>
          <button
            onClick={() => setFilterMode('RECONCILED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'RECONCILED'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Somente Conciliadas
          </button>
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterMode === 'ALL'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todas as Transações
          </button>
        </div>

        {selectedRowIds.length > 0 && (
          <Button
            variant="primary"
            size="sm"
            icon={<CheckCheck className="w-4 h-4" />}
            onClick={handleBatchReconcile}
          >
            Conciliar em Lote ({selectedRowIds.length})
          </Button>
        )}
      </div>

      {/* Transactions Reconciliation Table */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 text-xs font-mono animate-pulse">
          Carregando dados de conciliação bancária...
        </div>
      ) : (
        <Table
          columns={columns}
          data={displayedTransactions}
          keyExtractor={(t) => t.id}
          selectedRowIds={selectedRowIds}
          onSelectRow={(id) =>
            setSelectedRowIds((prev) =>
              prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
            )
          }
          onSelectAllRows={setSelectedRowIds}
        />
      )}
    </div>
  );
};
