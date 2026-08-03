import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { Table } from '../../components/ui/Table';
import type { Column } from '../../components/ui/Table';
import { Select } from '../../components/ui/Select';
import { OFXImportService } from '../../services/financial/OFXImportService';
import { useFinancialData } from '../../hooks/useFinancialData';
import type { OFXParsedTransaction, OFXImportRecord } from '../../types';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  History,
} from 'lucide-react';

export const OFXImportView: React.FC = () => {
  const { accounts, refreshData } = useFinancialData();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedTransactions, setParsedTransactions] = useState<OFXParsedTransaction[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importHistory, setImportHistory] = useState<OFXImportRecord[]>([]);

  const [step, setStep] = useState<'SELECT' | 'PREVIEW' | 'SUCCESS'>('SELECT');
  const [importResultSummary, setImportResultSummary] = useState<{ count: number } | null>(null);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts, selectedAccount]);

  const loadHistory = async () => {
    try {
      const history = await OFXImportService.getImportHistory();
      setImportHistory(history);
    } catch (err) {
      console.error('Error loading import history:', err);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setIsParsing(true);

    try {
      const text = await file.text();
      const parsed = OFXImportService.parseOFX(text);

      if (parsed.length === 0) {
        alert('Nenhuma transação válida encontrada no arquivo OFX.');
        setIsParsing(false);
        return;
      }

      // Check duplicates against existing database transactions
      const checked = await OFXImportService.checkDuplicates(parsed);
      setParsedTransactions(checked);
      setStep('PREVIEW');
    } catch (err: any) {
      console.error('Error parsing OFX:', err);
      alert('Erro ao ler arquivo OFX. Certifique-se de que é um formato válido.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleToggleSelect = (hash: string) => {
    setParsedTransactions((prev) =>
      prev.map((item) => (item.hash === hash ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleSelectAll = (select: boolean) => {
    setParsedTransactions((prev) =>
      prev.map((item) => (item.isDuplicate ? item : { ...item, selected: select }))
    );
  };

  const handleConfirmImport = async () => {
    if (!selectedAccount) {
      alert('Selecione a conta bancária de destino.');
      return;
    }

    const itemsToImport = parsedTransactions.filter((i) => i.selected);
    if (itemsToImport.length === 0) {
      alert('Selecione ao menos uma transação para importar.');
      return;
    }

    setIsImporting(true);
    try {
      const res = await OFXImportService.importTransactions(
        parsedTransactions,
        selectedAccount,
        selectedFile?.name || 'extrato.ofx'
      );

      setImportResultSummary({ count: res.totalTransacoes || res.qtdTransacoes || itemsToImport.length });
      setStep('SUCCESS');
      await refreshData();
      await loadHistory();
    } catch (err: any) {
      console.error('Error importing transactions:', err);
      alert(err.message || 'Erro ao importar transações.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setParsedTransactions([]);
    setStep('SELECT');
    setImportResultSummary(null);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const selectedCount = parsedTransactions.filter((i) => i.selected).length;
  const duplicateCount = parsedTransactions.filter((i) => i.isDuplicate).length;

  const columns: Column<OFXParsedTransaction>[] = [
    {
      header: 'Importar',
      cell: (item) => (
        <input
          type="checkbox"
          checked={item.selected}
          disabled={item.isDuplicate}
          onChange={() => handleToggleSelect(item.hash)}
          className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 disabled:opacity-40"
        />
      ),
    },
    {
      header: 'Data',
      accessorKey: 'data',
      cell: (item) => <span className="font-mono text-xs text-slate-300">{item.data}</span>,
    },
    {
      header: 'Descrição',
      accessorKey: 'descricao',
      cell: (item) => (
        <div>
          <span className="font-semibold text-slate-100 block">{item.descricao}</span>
          {item.memo && <span className="text-[10px] text-slate-400 font-mono block">{item.memo}</span>}
          {item.isDuplicate && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded mt-0.5">
              <AlertCircle className="w-3 h-3" /> Transação Duplicada (Ignorada)
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Tipo',
      accessorKey: 'tipo',
      cell: (item) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            item.tipo === 'RECEITA'
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          {item.tipo}
        </span>
      ),
    },
    {
      header: 'Valor',
      accessorKey: 'valor',
      cell: (item) => (
        <span
          className={`font-mono font-bold ${
            item.tipo === 'RECEITA' ? 'text-emerald-400' : 'text-slate-200'
          }`}
        >
          {item.tipo === 'RECEITA' ? '+' : '-'}{formatCurrency(item.valor)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Info */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <UploadCloud className="w-6 h-6 text-indigo-400" /> Importação de Extratos OFX
        </h2>
        <p className="text-xs text-slate-400">
          Importe arquivos OFX do seu internet banking com pré-visualização e filtro automático de duplicações
        </p>
      </div>

      {step === 'SELECT' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="p-8 text-center border-dashed border-2 border-indigo-500/30 bg-slate-900/40 rounded-2xl">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-base">Selecione um Arquivo OFX</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Suporta extratos bancários padrão de bancos como Itaú, Bradesco, Santander, Nubank, Banco do Brasil, Inter, Caixa.
                  </p>
                </div>

                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".ofx,.OFX"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button variant="primary" size="md" isLoading={isParsing} icon={<UploadCloud className="w-4 h-4" />}>
                    Escolher Arquivo OFX
                  </Button>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4 backdrop-blur-md">
            <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Proteção Anti-Duplicação
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              O sistema calcula um identificador único de segurança (Hash) baseado em <strong className="text-slate-200">Data + Valor + Descrição</strong>.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Qualquer transação que já existir no seu banco será identificada e desmarcada automaticamente.
            </p>
          </div>
        </div>
      )}

      {step === 'PREVIEW' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="w-48">
                <Select
                  label="Conta de Destino"
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  options={accounts.map((acc) => ({ value: acc.id, label: acc.nome }))}
                />
              </div>

              <div className="flex items-center gap-2 pt-5">
                <Button variant="ghost" size="sm" onClick={() => handleSelectAll(true)}>
                  Marcar Todas
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleSelectAll(false)}>
                  Desmarcar
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-slate-400">Total no arquivo: <strong>{parsedTransactions.length}</strong></span>
              <span className="text-amber-400">Duplicadas: <strong>{duplicateCount}</strong></span>
              <span className="text-emerald-400 font-bold">Selecionadas: <strong>{selectedCount}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmImport}
                isLoading={isImporting}
                disabled={selectedCount === 0}
                icon={<CheckCircle2 className="w-4 h-4" />}
              >
                Confirmar Importação ({selectedCount})
              </Button>
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md">
            <Table
              data={parsedTransactions}
              columns={columns}
              emptyMessage="Nenhuma transação encontrada no arquivo."
            />
          </div>
        </div>
      )}

      {step === 'SUCCESS' && (
        <div className="p-8 text-center max-w-lg mx-auto space-y-4 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-slate-100 text-lg">Importação Concluída com Sucesso!</h3>
          <p className="text-xs text-slate-300">
            Foram criadas <strong className="text-emerald-400 font-mono text-sm">{importResultSummary?.count}</strong> novas transações conciliadas no seu banco de dados.
          </p>
          <Button variant="primary" onClick={handleReset} className="mx-auto">
            Realizar Nova Importação
          </Button>
        </div>
      )}

      {/* Import History */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-400" /> Histórico de Importações OFX
        </h3>

        {importHistory.length === 0 ? (
          <p className="text-xs text-slate-500 py-6">Nenhum histórico de importação encontrado.</p>
        ) : (
          <div className="space-y-3">
            {importHistory.map((record) => (
              <div
                key={record.id}
                className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-200 text-sm block">{record.nomeArquivo}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {record.account?.nome ? `Conta: ${record.account.nome} | ` : ''}
                      Data: {record.createdAt ? new Date(record.createdAt).toLocaleString('pt-BR') : ''}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 font-mono text-right">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Itens Importados</span>
                    <span className="font-bold text-slate-200">{record.totalTransacoes || record.qtdTransacoes || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Total Créditos</span>
                    <span className="font-bold text-emerald-400">+{formatCurrency(record.valorTotalCreditos || 0)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Total Débitos</span>
                    <span className="font-bold text-rose-400">-{formatCurrency(record.valorTotalDebitos || 0)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
