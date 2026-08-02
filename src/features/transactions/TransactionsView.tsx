import React, { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { TransactionService, InstallmentService } from '../../services/financial';
import { TransactionType, type TransactionWithRelations } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table } from '../../components/ui/Table';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { TransactionModal } from './TransactionModal';
import { DynamicIcon } from '../../components/ui/IconPicker';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { Plus, Search, Edit2, Trash2, Layers, AlertCircle, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Split } from 'lucide-react';

export const TransactionsView: React.FC = () => {
  const { transactions, refreshData } = useFinancial();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');

  // Month Filter state (default: current YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionWithRelations | null>(null);

  // Deletion handling states
  const [deletingTx, setDeletingTx] = useState<TransactionWithRelations | null>(null);
  const [showInstallmentDeleteModal, setShowInstallmentDeleteModal] = useState(false);

  // Filter transactions by Search, Type and Selected Month
  const filteredTransactions = transactions.filter((tx) => {
    const descMatch = (tx.description || '').toLowerCase().includes(searchTerm.toLowerCase());
    const catMatch = (tx.category?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const splitCatMatch = tx.splits?.some(s => (s.category?.name || s.description || '').toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesSearch = descMatch || catMatch || Boolean(splitCatMatch);
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    
    // Month filtering: only show transactions belonging to the selected month (unless "all" is selected)
    const matchesMonth = selectedMonth === 'all' || (tx.date && tx.date.startsWith(selectedMonth));

    return matchesSearch && matchesType && matchesMonth;
  });

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (selectedMonth === 'all') {
      const now = new Date();
      setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
      return;
    }
    const [yearStr, monthStr] = selectedMonth.split('-');
    const date = new Date(Number(yearStr), Number(monthStr) - 1 - 1, 1);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    if (selectedMonth === 'all') {
      const now = new Date();
      setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
      return;
    }
    const [yearStr, monthStr] = selectedMonth.split('-');
    const date = new Date(Number(yearStr), Number(monthStr) - 1 + 1, 1);
    setSelectedMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  };

  const getMonthLabel = (monthStr: string) => {
    if (monthStr === 'all') return 'Todos os Meses';
    const [yearStr, monthNumStr] = monthStr.split('-');
    const date = new Date(Number(yearStr), Number(monthNumStr) - 1, 15);
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const handleDeleteClick = (tx: TransactionWithRelations) => {
    setDeletingTx(tx);
    if (tx.installment_group_id) {
      setShowInstallmentDeleteModal(true);
    }
  };

  const handleDeleteSingleConfirm = async () => {
    if (deletingTx) {
      await TransactionService.deleteTransaction(deletingTx.id);
      setDeletingTx(null);
      setShowInstallmentDeleteModal(false);
      await refreshData();
    }
  };

  const handleDeleteEntireGroupConfirm = async () => {
    if (deletingTx && deletingTx.installment_group_id) {
      await InstallmentService.deleteInstallmentGroup(deletingTx.installment_group_id);
      setDeletingTx(null);
      setShowInstallmentDeleteModal(false);
      await refreshData();
    }
  };

  const columns = [
    {
      header: 'Descrição',
      cell: (tx: TransactionWithRelations) => (
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0 shadow-xs"
            style={{ backgroundColor: tx.category?.color || '#94a3b8' }}
          >
            <DynamicIcon name={tx.splits && tx.splits.length > 0 ? 'Split' : (tx.category?.icon || 'Tag')} className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-slate-800">{tx.description || 'Sem Descrição'}</span>
            {tx.observation && <span className="text-xs text-slate-400 font-normal">{tx.observation}</span>}
          </div>
        </div>
      ),
    },
    {
      header: 'Categoria',
      cell: (tx: TransactionWithRelations) => (
        tx.splits && tx.splits.length > 0 ? (
          <Badge variant="purple">
            <Split className="w-3 h-3" />
            Dividida ({tx.splits.length} cat.)
          </Badge>
        ) : (
          <Badge variant="slate">
            {tx.category?.name || 'Sem Categoria'}
          </Badge>
        )
      ),
    },
    {
      header: 'Conta / Cartão',
      cell: (tx: TransactionWithRelations) => (
        <span className="text-xs font-medium text-slate-600">
          {tx.account ? (
            `🏦 ${tx.account.name}`
          ) : tx.card ? (
            `💳 ${tx.card.name}`
          ) : (
            '-'
          )}
        </span>
      ),
    },
    {
      header: 'Parcela',
      cell: (tx: TransactionWithRelations) =>
        tx.installment_number ? (
          <Badge variant="purple">
            <Layers className="w-3 h-3" />
            {tx.installment_number}
          </Badge>
        ) : (
          <span className="text-xs text-slate-400">-</span>
        ),
    },
    {
      header: 'Data',
      cell: (tx: TransactionWithRelations) => (
        <span className="text-xs font-mono text-slate-500">{formatDate(tx.date)}</span>
      ),
    },
    {
      header: 'Valor',
      className: 'text-right',
      cell: (tx: TransactionWithRelations) => {
        const isIncome = tx.type === TransactionType.INCOME;
        return (
          <span
            className={`font-bold font-mono text-sm ${
              isIncome ? 'text-emerald-600' : 'text-slate-800'
            }`}
          >
            {isIncome ? '+' : '-'} {formatCurrency(Number(tx.amount))}
          </span>
        );
      },
    },
    {
      header: 'Ações',
      className: 'text-right',
      cell: (tx: TransactionWithRelations) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingTx(tx);
              setIsModalOpen(true);
            }}
            title="Editar"
          >
            <Edit2 className="w-4 h-4 text-slate-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteClick(tx)}
            title="Excluir"
          >
            <Trash2 className="w-4 h-4 text-rose-600" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Month Navigator Toolbar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Mês anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-200">
            <CalendarIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-sm font-bold text-slate-800 min-w-36 text-center">
              {getMonthLabel(selectedMonth)}
            </span>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Próximo mês"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Month Options / Picker */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <input
            type="month"
            value={selectedMonth === 'all' ? '' : selectedMonth}
            onChange={(e) => {
              if (e.target.value) setSelectedMonth(e.target.value);
            }}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:border-slate-300 transition-colors cursor-pointer"
          />

          <button
            onClick={() => setSelectedMonth(selectedMonth === 'all' ? new Date().toISOString().slice(0, 7) : 'all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
              selectedMonth === 'all'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {selectedMonth === 'all' ? 'Filtrado por Mês' : 'Ver Todos os Meses'}
          </button>
        </div>
      </div>

      {/* Search and Type Filters Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-full max-w-xs">
            <Input
              placeholder="Pesquisar por descrição ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex items-center bg-slate-200/60 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setTypeFilter(TransactionType.INCOME)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                typeFilter === TransactionType.INCOME ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              Receitas
            </button>
            <button
              onClick={() => setTypeFilter(TransactionType.EXPENSE)}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                typeFilter === TransactionType.EXPENSE ? 'bg-white text-rose-700 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              Despesas
            </button>
          </div>
        </div>

        <Button
          onClick={() => {
            setEditingTx(null);
            setIsModalOpen(true);
          }}
          icon={<Plus className="w-4 h-4" />}
        >
          Nova Transação
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        data={filteredTransactions}
        keyExtractor={(tx) => tx.id}
        emptyMessage={
          selectedMonth === 'all'
            ? 'Nenhuma transação encontrada.'
            : `Nenhuma transação registrada em ${getMonthLabel(selectedMonth)}.`
        }
      />

      {/* Create / Edit Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refreshData}
        transactionToEdit={editingTx}
      />

      {/* Standard Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(deletingTx) && !showInstallmentDeleteModal}
        onClose={() => setDeletingTx(null)}
        onConfirm={handleDeleteSingleConfirm}
        title="Excluir Transação"
        message={`Tem certeza que deseja excluir a transação "${deletingTx?.description || 'sem descrição'}"?`}
      />

      {/* Special Installment Group Delete Options Modal */}
      <Modal
        isOpen={showInstallmentDeleteModal}
        onClose={() => setShowInstallmentDeleteModal(false)}
        title="Excluir Transação Parcelada"
        maxWidth="md"
      >
        <div className="flex flex-col gap-4 py-2 text-center items-center">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-base">Esta transação faz parte de um parcelamento</h4>
            <p className="text-xs text-slate-500 mt-1">
              Deseja remover apenas a parcela selecionada ({deletingTx?.installment_number}) ou excluir todo o grupo de parcelamento?
            </p>
          </div>

          <div className="flex flex-col gap-2.5 w-full mt-4">
            <Button variant="danger" onClick={handleDeleteEntireGroupConfirm} className="w-full">
              Excluir o parcelamento inteiro
            </Button>
            <Button variant="outline" onClick={handleDeleteSingleConfirm} className="w-full">
              Excluir apenas esta parcela
            </Button>
            <Button variant="secondary" onClick={() => setShowInstallmentDeleteModal(false)} className="w-full">
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
