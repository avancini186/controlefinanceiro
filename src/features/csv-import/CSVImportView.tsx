import React, { useState, useEffect, useCallback } from 'react';
import { useFinancialData } from '../../hooks/useFinancialData';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { CSVImportService } from '../../services/financial/CSVImportService';
import type { CSVParsedRow, CSVMappingTemplate, CSVImportRecord, CSVColumnMapping } from '../../types';
import { FileSpreadsheet, UploadCloud, CheckCircle2, AlertTriangle, History, CheckSquare, Square, Save, CreditCard } from 'lucide-react';

export const CSVImportView: React.FC = () => {
  const { accounts, creditCards, refreshData } = useFinancialData();

  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [selectedTarget, setSelectedTarget] = useState<string>('');
  const [importCardCredits, setImportCardCredits] = useState<boolean>(false);
  const [filename, setFilename] = useState<string>('');
  const [rawCsvText, setRawCsvText] = useState<string>('');
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);

  // Mapping state
  const [mapping, setMapping] = useState<CSVColumnMapping>({
    colunaData: '',
    colunaDescricao: '',
    colunaValor: '',
    colunaTipo: '',
    delimitador: ',',
    formatoData: 'DD/MM/YYYY',
  });

  // Templates
  const [templates, setTemplates] = useState<CSVMappingTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [newTemplateName, setNewTemplateName] = useState<string>('');

  // Preview & History
  const [parsedRows, setParsedRows] = useState<CSVParsedRow[]>([]);
  const [history, setHistory] = useState<CSVImportRecord[]>([]);

  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const parseTargetInfo = (val: string) => {
    if (val.startsWith('CARTAO:')) {
      return { type: 'CARTAO' as const, id: val.replace('CARTAO:', '') };
    }
    if (val.startsWith('CONTA:')) {
      return { type: 'CONTA' as const, id: val.replace('CONTA:', '') };
    }
    const isCard = creditCards.some((c) => c.id === val);
    if (isCard) return { type: 'CARTAO' as const, id: val };
    return { type: 'CONTA' as const, id: val };
  };

  const currentTargetInfo = parseTargetInfo(selectedTarget);

  const loadData = useCallback(async () => {
    try {
      const [tmplList, histList] = await Promise.all([
        CSVImportService.getTemplates(),
        CSVImportService.getImportHistory(),
      ]);
      setTemplates(tmplList);
      setHistory(histList);
    } catch (err) {
      console.error('Error loading CSV import data:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
    if (!selectedTarget) {
      if (accounts.length > 0) {
        setSelectedTarget(`CONTA:${accounts[0].id}`);
      } else if (creditCards.length > 0) {
        setSelectedTarget(`CARTAO:${creditCards[0].id}`);
      }
    }
  }, [accounts, creditCards, loadData, selectedTarget]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setFilename(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setRawCsvText(text);

        // Detect delimiter and headers
        const firstLine = text.split(/\r?\n/)[0] || '';
        const delimiter = firstLine.includes(';') ? ';' : firstLine.includes('\t') ? '\t' : ',';

        const headers = firstLine.split(delimiter).map((h) => h.replace(/^["']|["']$/g, '').trim());
        setDetectedHeaders(headers);

        // Auto-guess mapping fields
        const dateCol = headers.find((h) => h.toLowerCase().includes('data') || h.toLowerCase().includes('date')) || headers[0] || '';
        const descCol = headers.find((h) => h.toLowerCase().includes('desc') || h.toLowerCase().includes('hist') || h.toLowerCase().includes('memo')) || headers[1] || '';
        const valCol = headers.find((h) => h.toLowerCase().includes('valor') || h.toLowerCase().includes('amount') || h.toLowerCase().includes('val')) || headers[2] || '';
        const tipoCol = headers.find((h) => h.toLowerCase().includes('tipo') || h.toLowerCase().includes('type')) || '';

        setMapping({
          colunaData: dateCol,
          colunaDescricao: descCol,
          colunaValor: valCol,
          colunaTipo: tipoCol,
          delimitador: delimiter,
          formatoData: 'DD/MM/YYYY',
        });

        setStep('mapping');
      } catch (err) {
        console.error('Error reading CSV:', err);
        setErrorMsg('Erro ao ler arquivo CSV.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tmpl = templates.find((t) => t.id === templateId);
    if (tmpl) {
      setMapping({
        colunaData: tmpl.colunaData,
        colunaDescricao: tmpl.colunaDescricao,
        colunaValor: tmpl.colunaValor,
        colunaTipo: tmpl.colunaTipo || '',
        colunaCategoria: tmpl.colunaCategoria || '',
        delimitador: tmpl.delimitador,
        formatoData: tmpl.formatoData,
      });
    }
  };

  const handleSaveTemplate = async () => {
    if (!newTemplateName.trim()) return;
    try {
      const created = await CSVImportService.saveTemplate(newTemplateName, mapping);
      setTemplates([...templates, created]);
      setSelectedTemplateId(created.id);
      setNewTemplateName('');
      alert('Modelo de mapeamento salvo com sucesso!');
    } catch (err) {
      console.error('Error saving template:', err);
      alert('Erro ao salvar modelo de mapeamento.');
    }
  };

  const handleGeneratePreview = async () => {
    setErrorMsg(null);
    try {
      const targetInfo = parseTargetInfo(selectedTarget);
      const { rows } = CSVImportService.parseCSV(rawCsvText, mapping, {
        isCreditCard: targetInfo.type === 'CARTAO',
        importCardCredits,
      });

      if (rows.length === 0) {
        setErrorMsg('Nenhuma linha válida pôde ser lida com o mapeamento configurado.');
        return;
      }

      const checked = await CSVImportService.checkDuplicates(rows, targetInfo.id);
      setParsedRows(checked);
      setStep('preview');
    } catch (err: any) {
      console.error('Error parsing CSV with mapping:', err);
      setErrorMsg(err.message || 'Erro ao processar CSV.');
    }
  };

  const handleToggleSelect = (index: number) => {
    setParsedRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, selected: !row.selected } : row))
    );
  };

  const handleExecuteImport = async () => {
    const validCount = parsedRows.filter((r) => r.selected).length;
    if (validCount === 0) {
      setErrorMsg('Selecione pelo menos uma transação para importar.');
      return;
    }

    setIsImporting(true);
    setErrorMsg(null);
    try {
      const targetInfo = parseTargetInfo(selectedTarget);
      const record = await CSVImportService.importTransactions(
        parsedRows.filter((r) => r.selected),
        targetInfo,
        filename
      );
      setSuccessMsg(`Importação CSV realizada com sucesso! ${record.totalTransacoes || record.qtdTransacoes} transações criadas.`);
      setParsedRows([]);
      setRawCsvText('');
      setFilename('');
      setStep('upload');
      await refreshData();
      await loadData();
    } catch (err: any) {
      console.error('Error executing CSV import:', err);
      setErrorMsg(err.message || 'Erro ao executar importação CSV.');
    } finally {
      setIsImporting(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const selectedItems = parsedRows.filter((r) => r.selected);
  const totalCreditos = selectedItems.filter((r) => r.tipo === 'RECEITA').reduce((a, b) => a + b.valor, 0);
  const totalDebitos = selectedItems.filter((r) => r.tipo === 'DESPESA').reduce((a, b) => a + b.valor, 0);

  const destinationOptions = [
    ...accounts.map((a) => ({ value: `CONTA:${a.id}`, label: `🏦 Conta: ${a.nome}` })),
    ...creditCards.map((c) => ({ value: `CARTAO:${c.id}`, label: `💳 Cartão de Crédito: ${c.nome}` })),
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-100">Importação de Extrato CSV</h3>
          <p className="text-xs text-slate-400">Importe arquivos CSV com mapeamento dinâmico de colunas para contas ou cartões de crédito</p>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* STEP 1: Upload */}
      {step === 'upload' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <h4 className="font-semibold text-slate-100 text-sm">1. Destino da Importação</h4>
            <Select
              label="Conta ou Cartão de Destino"
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              options={destinationOptions}
            />

            {currentTargetInfo.type === 'CARTAO' && (
              <div className="p-4 bg-slate-950/70 border border-indigo-500/30 rounded-xl space-y-3 animate-fade-in">
                <span className="text-xs font-semibold text-slate-200 block flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  Importar créditos e estornos na fatura?
                </span>
                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="importCardCredits"
                      checked={importCardCredits === false}
                      onChange={() => setImportCardCredits(false)}
                      className="text-indigo-500 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                    />
                    <span><strong>Não (Recomendado)</strong> — Importa apenas compras como despesas</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                    <input
                      type="radio"
                      name="importCardCredits"
                      checked={importCardCredits === true}
                      onChange={() => setImportCardCredits(true)}
                      className="text-indigo-500 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                    />
                    <span><strong>Sim</strong> — Importar estornos e pagamentos</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="md:col-span-2 bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <h4 className="font-semibold text-slate-100 text-sm">2. Carregar Arquivo CSV</h4>
            <label className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950/40 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all">
              <UploadCloud className="w-8 h-8 text-indigo-400 mb-2" />
              <span className="text-xs font-semibold text-slate-200">
                {filename ? filename : 'Clique ou arraste um arquivo .CSV'}
              </span>
              <span className="text-[10px] text-slate-500 mt-1">Extrato delimitado por vírgula, ponto e vírgula ou tabulação</span>
              <input type="file" accept=".csv" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        </div>
      )}

      {/* STEP 2: Column Mapping */}
      {step === 'mapping' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h4 className="font-bold text-slate-100 text-base">Mapeamento de Colunas do CSV</h4>
              <p className="text-xs text-slate-400">Associe os cabeçalhos identificados no arquivo aos campos do sistema</p>
            </div>

            {templates.length > 0 && (
              <div className="w-64">
                <Select
                  label="Carregar Modelo Salvo"
                  value={selectedTemplateId}
                  onChange={(e) => handleSelectTemplate(e.target.value)}
                  options={[
                    { value: '', label: 'Nenhum (Personalizado)' },
                    ...templates.map((t) => ({ value: t.id, label: t.nomeModelo })),
                  ]}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Delimitador de Colunas"
              value={mapping.delimitador}
              onChange={(e) => setMapping({ ...mapping, delimitador: e.target.value })}
              options={[
                { value: ',', label: 'Vírgula (,)' },
                { value: ';', label: 'Ponto e Vírgula (;)' },
                { value: '\t', label: 'Tabulação (TAB)' },
              ]}
            />

            <Select
              label="Formato de Data"
              value={mapping.formatoData}
              onChange={(e) => setMapping({ ...mapping, formatoData: e.target.value })}
              options={[
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Select
              label="Coluna de Data *"
              value={mapping.colunaData || ''}
              onChange={(e) => setMapping({ ...mapping, colunaData: e.target.value })}
              options={detectedHeaders.map((h) => ({ value: h, label: h }))}
            />

            <Select
              label="Coluna de Descrição *"
              value={mapping.colunaDescricao || ''}
              onChange={(e) => setMapping({ ...mapping, colunaDescricao: e.target.value })}
              options={detectedHeaders.map((h) => ({ value: h, label: h }))}
            />

            <Select
              label="Coluna de Valor *"
              value={mapping.colunaValor || ''}
              onChange={(e) => setMapping({ ...mapping, colunaValor: e.target.value })}
              options={detectedHeaders.map((h) => ({ value: h, label: h }))}
            />

            <Select
              label="Coluna de Tipo (opcional)"
              value={mapping.colunaTipo || ''}
              onChange={(e) => setMapping({ ...mapping, colunaTipo: e.target.value })}
              options={[
                { value: '', label: 'Nenhuma (Determinar pelo sinal + / -)' },
                ...detectedHeaders.map((h) => ({ value: h, label: h })),
              ]}
            />
          </div>

          {/* Save Template Bar */}
          <div className="p-4 bg-slate-950/50 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
            <div className="flex-1 flex items-center gap-3">
              <Input
                placeholder="Nome do modelo (Ex: Extrato Banco do Brasil)"
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="max-w-xs"
              />
              <Button variant="outline" size="sm" icon={<Save className="w-3.5 h-3.5" />} onClick={handleSaveTemplate}>
                Salvar Modelo
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Voltar
              </Button>
              <Button variant="primary" onClick={handleGeneratePreview}>
                Gerar Pré-visualização
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Preview */}
      {step === 'preview' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h4 className="font-bold text-slate-100 text-base">Pré-visualização do Extrato CSV</h4>
              <p className="text-xs text-slate-400">
                {selectedItems.length} de {parsedRows.length} transações selecionadas para importação
              </p>
            </div>

            <Button variant="outline" size="sm" onClick={() => setStep('mapping')}>
              Ajustar Mapeamento
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-mono text-center">
            <div>
              <span className="text-slate-500 block text-[10px]">A Importar</span>
              <span className="font-bold text-indigo-400">{selectedItems.length} itens</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Total Créditos</span>
              <span className="font-bold text-emerald-400">+{formatCurrency(totalCreditos)}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Total Débitos</span>
              <span className="font-bold text-rose-400">-{formatCurrency(totalDebitos)}</span>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3 text-center">Sel.</th>
                  <th className="p-3">Data</th>
                  <th className="p-3">Descrição</th>
                  <th className="p-3">Status / Hash</th>
                  <th className="p-3 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {parsedRows.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      row.isDuplicate || row.isCreditIgnored ? 'opacity-50 bg-slate-950/40' : ''
                    }`}
                  >
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleSelect(idx)}
                        className="text-slate-400 hover:text-indigo-400"
                      >
                        {row.selected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                    <td className="p-3 font-mono text-slate-300">{row.data}</td>
                    <td className="p-3 font-semibold text-slate-100">{row.descricao}</td>
                    <td className="p-3">
                      {row.isCreditIgnored ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                          Estorno/Crédito Ignorado (Cartão)
                        </span>
                      ) : row.isDuplicate ? (
                        <Badge variant="warning" size="sm">
                          Duplicada (Já existe no banco)
                        </Badge>
                      ) : (
                        <Badge variant="success" size="sm">
                          Nova Transação
                        </Badge>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold">
                      <span className={row.tipo === 'RECEITA' ? 'text-emerald-400' : 'text-slate-100'}>
                        {row.tipo === 'RECEITA' ? '+' : '-'} {formatCurrency(row.valor)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setStep('mapping')}>
              Voltar ao Mapeamento
            </Button>
            <Button
              variant="primary"
              onClick={handleExecuteImport}
              isLoading={isImporting}
              disabled={selectedItems.length === 0}
            >
              Confirmar Importação de {selectedItems.length} Transação(ões)
            </Button>
          </div>
        </div>
      )}

      {/* History Log Section */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-4">
        <h4 className="font-bold text-slate-100 text-base flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-400" />
          <span>Histórico de Importações CSV</span>
        </h4>

        {history.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
            Nenhum lote de extrato CSV importado até o momento.
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((record) => (
              <div
                key={record.id}
                className="p-4 bg-slate-950/50 border border-slate-800/80 rounded-xl flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-100 block">{record.nomeArquivo}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {record.creditCard ? `Cartão: ${record.creditCard.nome}` : `Conta: ${record.account?.nome || record.contaId}`} • Data: {record.createdAt?.split('T')[0] || ''}
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
