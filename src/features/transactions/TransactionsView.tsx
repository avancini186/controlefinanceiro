import React, { useState } from 'react';
import { useFinancialData } from '../../hooks/useFinancialData';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { TransactionService } from '../../services/financial/TransactionService';
import type { Transaction } from '../../types';
import { useTablePreferences } from '../../hooks/useTablePreferences';
import { useApp } from '../../context/AppContext';
import { TransactionType } from '../../types/enums';
import { formatDate, getTransactionDisplayStatus } from '../../utils/formatters';
import {
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Layers,
  Trash2,
  Filter,
  SlidersHorizontal,
  RotateCcw,
  Eye,
  EyeOff,
  Search,
  Calendar,
  TrendingUp,
  TrendingDown,
  Wallet,
  Edit2,
  CreditCard,
  X,
} from 'lucide-react';

import { MonthSelector } from '../../components/ui/MonthSelector';

interface TransactionFilterState {
  startDate: string;
  endDate: string;
  categoriaId: string;
  contaId: string;
  cartaoId: string;
  tipo: string;
  status: string;
  minValor: string;
  maxValor: string;
}

export const TransactionsView: React.FC = () => {
  const { transactions, categories, accounts, creditCards, refreshData } = useFinancialData();
  const { openTransactionModal, selectedMonth, setSelectedMonth } = useApp();

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [filterByMonthActive, setFilterByMonthActive] = useState<boolean>(true);

  // Table Preferences Persistence via localStorage
  const { preferences, setSearchQuery, setSort, toggleColumnVisibility, setFilters, resetPreferences } =
    useTablePreferences<TransactionFilterState>('transactions', {
      searchQuery: '',
      sortBy: 'data',
      sortDirection: 'desc',
      hiddenColumns: [],
      filters: {
        startDate: '',
        endDate: '',
        categoriaId: '',
        contaId: '',
        cartaoId: '',
        tipo: '',
        status: '',
        minValor: '',
        maxValor: '',
      },
    });

  const { searchQuery, sortBy, sortDirection, hiddenColumns, filters } = preferences;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleDelete = async () => {
    if (!txToDelete) return;
    setIsDeleting(true);
    try {
      await TransactionService.delete(txToDelete.id);
      await refreshData();
      setTxToDelete(null);
    } catch (err) {
      console.error('Error deleting transaction:', err);
      alert('Erro ao excluir transação.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowIds.length === 0) return;
    if (!confirm(`Deseja realmente excluir as ${selectedRowIds.length} transações selecionadas?`)) return;

    try {
      for (const id of selectedRowIds) {
        await TransactionService.delete(id);
      }
      setSelectedRowIds([]);
      await refreshData();
    } catch (err) {
      console.error('Error deleting batch transactions:', err);
      alert('Erro ao excluir transações selecionadas.');
    }
  };

  // Filter & Search Logic
  const filteredTransactions = transactions.filter((tx) => {
    // Filter by selected month if month filter is active
    if (filterByMonthActive && selectedMonth) {
      if (!TransactionService.belongsToCompetencia(tx, selectedMonth)) {
        return false;
      }
    }

    // Search Query across descrição, observação, categoria, conta, cartão
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const descMatch = tx.descricao.toLowerCase().includes(q);
      const obsMatch = (tx.observacao || '').toLowerCase().includes(q);
      const catMatch = (tx.category?.nome || '').toLowerCase().includes(q);
      const accMatch = (tx.account?.nome || '').toLowerCase().includes(q);
      const cardMatch = (tx.creditCard?.nome || '').toLowerCase().includes(q);

      if (!descMatch && !obsMatch && !catMatch && !accMatch && !cardMatch) {
        return false;
      }
    }

    // Advanced Filters
    if (filters.startDate && tx.data < filters.startDate) return false;
    if (filters.endDate && tx.data > filters.endDate) return false;
    if (filters.categoriaId) {
      if (filters.categoriaId === 'NONE') {
        if (tx.categoriaId) return false;
      } else if (tx.categoriaId !== filters.categoriaId) {
        return false;
      }
    }
    if (filters.contaId && tx.contaId !== filters.contaId) return false;
    if (filters.cartaoId && tx.cartaoId !== filters.cartaoId) return false;
    if (filters.tipo && tx.tipo !== filters.tipo) return false;
    if (filters.status && tx.status !== filters.status) return false;
    if (filters.minValor && tx.valor < parseFloat(filters.minValor)) return false;
    if (filters.maxValor && tx.valor > parseFloat(filters.maxValor)) return false;

    return true;
  });

  // Monthly Metrics Calculations
  const totalReceitas = filteredTransactions
    .filter((t) => t.tipo === 'RECEITA')
    .reduce((acc, t) => acc + t.valor, 0);

  const totalDespesasConta = filteredTransactions
    .filter((t) => t.tipo === 'DESPESA' && !t.cartaoId)
    .reduce((acc, t) => acc + t.valor, 0);

  const totalCartaoFatura = filteredTransactions
    .filter((t) => t.tipo === 'DESPESA' && Boolean(t.cartaoId))
    .reduce((acc, t) => acc + t.valor, 0);

  const saldoCaixa = totalReceitas - totalDespesasConta;

  // Sorting Logic
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let valA: any = (a as any)[sortBy] || '';
    let valB: any = (b as any)[sortBy] || '';

    if (sortBy === 'categoria') {
      valA = a.category?.nome || '';
      valB = b.category?.nome || '';
    }

    if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
    if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const columns: Column<Transaction>[] = [
    {
      header: 'Descrição & Categoria',
      accessorKey: 'descricao',
      sortable: true,
      className: 'min-w-[160px] max-w-[260px]',
      cell: (tx) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              tx.tipo === 'RECEITA'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : tx.tipo === 'TRANSFERENCIA'
                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}
          >
            {tx.tipo === 'RECEITA' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="font-semibold text-slate-100 text-xs truncate" title={tx.descricao}>
                {tx.descricao}
              </p>
              {tx.splits && tx.splits.length > 0 && (
                <Badge variant="info" size="sm" className="gap-1 shrink-0">
                  <Layers className="w-3 h-3" /> ({tx.splits.length})
                </Badge>
              )}
            </div>
            <p
              className="text-[11px] text-slate-400 mt-0.5 truncate"
              title={
                tx.splits && tx.splits.length > 0
                  ? tx.splits.map((s) => s.description || 'Item').join(', ')
                  : tx.category?.nome || 'Sem Categoria'
              }
            >
              {tx.splits && tx.splits.length > 0
                ? tx.splits.map((s) => s.description || 'Item').join(', ')
                : tx.category?.nome || 'Sem Categoria'}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'Data',
      accessorKey: 'data',
      sortable: true,
      className: 'whitespace-nowrap w-24',
      cell: (tx) => <span className="text-slate-400 font-mono text-xs">{formatDate(tx.data)}</span>,
    },
    {
      header: 'Conta / Cartão',
      accessorKey: 'conta',
      className: 'whitespace-nowrap w-32',
      cell: (tx) => (
        <div className="flex items-center gap-2">
          {tx.account ? (
            <Badge variant="neutral" size="sm">
              🏦 {tx.account.nome}
            </Badge>
          ) : tx.creditCard ? (
            <Badge variant="info" size="sm">
              💳 {tx.creditCard.nome}
            </Badge>
          ) : (
            <span className="text-slate-500 text-xs">-</span>
          )}
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      sortable: true,
      className: 'whitespace-nowrap w-28',
      cell: (tx) => {
        const { label, variant } = getTransactionDisplayStatus(tx);
        return (
          <Badge variant={variant} size="sm">
            {label}
          </Badge>
        );
      },
    },
    {
      header: 'Valor',
      accessorKey: 'valor',
      sortable: true,
      className: 'whitespace-nowrap w-28 text-right',
      cell: (tx) => (
        <span
          className={`font-mono font-bold text-xs ${
            tx.tipo === TransactionType.RECEITA
              ? 'text-emerald-400'
              : tx.tipo === TransactionType.TRANSFERENCIA
              ? 'text-sky-400'
              : 'text-rose-400'
          }`}
        >
          {tx.tipo === TransactionType.RECEITA ? '+' : '-'} {formatCurrency(tx.valor)}
        </span>
      ),
    },
    {
      header: 'Ações',
      className: 'whitespace-nowrap w-16 text-center',
      cell: (tx) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => openTransactionModal(tx)}
            className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Editar transação"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setTxToDelete(tx)}
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Excluir transação"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search and Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <Input
            placeholder="Pesquisar por descrição, observação, categoria, conta..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Seletor Simples de Mês */}
          {filterByMonthActive ? (
            <MonthSelector value={selectedMonth} onChange={setSelectedMonth} />
          ) : (
            <Button
              variant="outline"
              size="sm"
              icon={<Calendar className="w-4 h-4" />}
              onClick={() => setFilterByMonthActive(true)}
            >
              Exibindo: Todos os Meses
            </Button>
          )}

          <Button
            variant={filterByMonthActive ? 'outline' : 'primary'}
            size="sm"
            onClick={() => setFilterByMonthActive(!filterByMonthActive)}
          >
            {filterByMonthActive ? 'Ver Todos' : 'Filtrar Mês'}
          </Button>

          <Button
            variant={showAdvancedFilters ? 'primary' : 'outline'}
            size="sm"
            icon={<Filter className="w-4 h-4" />}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            Filtros
          </Button>

          {(searchQuery || Object.values(filters).some(Boolean)) && (
            <Button variant="ghost" size="sm" icon={<X className="w-4 h-4" />} onClick={resetPreferences}>
              Limpar
            </Button>
          )}
        </div>
      </div>

      {/* Month Summary Cards */}
      {filterByMonthActive && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Receitas em Conta</p>
              <p className="text-lg font-bold font-mono text-emerald-400 mt-1">{formatCurrency(totalReceitas)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Despesas em Conta</p>
              <p className="text-lg font-bold font-mono text-rose-400 mt-1">{formatCurrency(totalDespesasConta)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Fatura de Cartão</p>
              <p className="text-lg font-bold font-mono text-amber-400 mt-1">{formatCurrency(totalCartaoFatura)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Saldo de Caixa</p>
              <p
                className={`text-lg font-bold font-mono mt-1 ${
                  saldoCaixa >= 0 ? 'text-indigo-400' : 'text-rose-400'
                }`}
              >
                {formatCurrency(saldoCaixa)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-100">Gerenciador de Transações</h3>
          <p className="text-xs text-slate-400">
            {sortedTransactions.length} transações encontradas • Filtros e ordenação salvos automaticamente
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Table Search Input */}
          <div className="relative w-48 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filtrar tabela..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/70 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {selectedRowIds.length > 0 && (
            <Button variant="danger" size="sm" icon={<Trash2 className="w-4 h-4" />} onClick={handleBatchDelete}>
              Excluir ({selectedRowIds.length})
            </Button>
          )}

          <Button
            variant={showAdvancedFilters ? 'primary' : 'outline'}
            size="sm"
            icon={<Filter className="w-4 h-4" />}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          >
            Filtros Avançados
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<SlidersHorizontal className="w-4 h-4" />}
            onClick={() => setShowColumnPicker(!showColumnPicker)}
          >
            Colunas
          </Button>

          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => openTransactionModal()}>
            Nova Transação
          </Button>
        </div>
      </div>

      {/* Column Picker Dropdown */}
      {showColumnPicker && (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-wrap items-center gap-4 text-xs">
          <span className="font-semibold text-slate-300">Exibir Colunas:</span>
          {columns.map((col) => {
            const keyStr = String(col.accessorKey);
            const isVisible = !hiddenColumns.includes(keyStr);
            return (
              <button
                key={keyStr}
                onClick={() => toggleColumnVisibility(keyStr)}
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 transition-all ${
                  isVisible
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
              >
                {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{col.header}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4 backdrop-blur-md animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Filtros Combinados</h4>
            <button
              onClick={resetPreferences}
              className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Limpar Filtros
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Data Inicial</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ startDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Data Final</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ endDate: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Categoria</label>
              <select
                value={filters.categoriaId}
                onChange={(e) => setFilters({ categoriaId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              >
                <option value="">Todas as Categorias</option>
                <option value="NONE">Sem Categoria</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Conta Bancária</label>
              <select
                value={filters.contaId}
                onChange={(e) => setFilters({ contaId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              >
                <option value="">Todas as Contas</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Cartão de Crédito</label>
              <select
                value={filters.cartaoId}
                onChange={(e) => setFilters({ cartaoId: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              >
                <option value="">Todos os Cartões</option>
                {creditCards.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Tipo de Lançamento</label>
              <select
                value={filters.tipo}
                onChange={(e) => setFilters({ tipo: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
              >
                <option value="">Todos os Tipos</option>
                <option value="RECEITA">Receita</option>
                <option value="DESPESA">Despesa</option>
                <option value="TRANSFERENCIA">Transferência</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Valor Mínimo (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={filters.minValor}
                onChange={(e) => setFilters({ minValor: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Valor Máximo (R$)</label>
              <input
                type="number"
                step="0.01"
                placeholder="9999.00"
                value={filters.maxValor}
                onChange={(e) => setFilters({ maxValor: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Data Table */}
      <Table
        columns={columns}
        data={sortedTransactions}
        keyExtractor={(row) => row.id}
        selectedRowIds={selectedRowIds}
        onSelectRow={(id) =>
          setSelectedRowIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
          )
        }
        onSelectAllRows={setSelectedRowIds}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={setSort}
        hiddenColumns={hiddenColumns}
      />

      {/* Confirm Modal Exclusão */}
      <ConfirmModal
        isOpen={!!txToDelete}
        onClose={() => setTxToDelete(null)}
        onConfirm={handleDelete}
        title="Excluir Transação"
        message={`Deseja realmente excluir a transação "${txToDelete?.descricao}"?`}
        isLoading={isDeleting}
      />
    </div>
  );
};
