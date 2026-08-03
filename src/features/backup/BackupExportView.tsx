import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { BackupExportService, type BackupPayload } from '../../services/financial/BackupExportService';
import { useFinancialData } from '../../hooks/useFinancialData';
import {
  Download,
  UploadCloud,
  FileJson,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Database,
  HardDrive,
  ShieldCheck,
} from 'lucide-react';

export const BackupExportView: React.FC = () => {
  const { refreshData } = useFinancialData();

  const [validatedBackup, setValidatedBackup] = useState<BackupPayload | null>(null);
  const [backupFilename, setBackupFilename] = useState<string>('');

  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isConfirmRestoreOpen, setIsConfirmRestoreOpen] = useState(false);

  const handleExportJSON = async () => {
    setIsExporting(true);
    setErrorMsg(null);
    try {
      await BackupExportService.exportFullBackupJSON();
      setSuccessMsg('Backup JSON exportado com sucesso!');
    } catch (err: any) {
      console.error('Error exporting JSON backup:', err);
      setErrorMsg('Erro ao exportar arquivo de backup.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async (
    entity: 'configuracoes' | 'categorias' | 'contas' | 'cartoes' | 'transacoes' | 'orcamentos'
  ) => {
    setErrorMsg(null);
    try {
      await BackupExportService.exportEntityCSV(entity);
      setSuccessMsg(`Tabela de ${entity} exportada em formato CSV com sucesso!`);
    } catch (err: any) {
      console.error(`Error exporting CSV for ${entity}:`, err);
      setErrorMsg(err.message || `Erro ao exportar CSV de ${entity}.`);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setBackupFilename(file.name);

    try {
      const payload = await BackupExportService.validateBackupFile(file);
      setValidatedBackup(payload);
    } catch (err: any) {
      console.error('Validation error:', err);
      setErrorMsg(err.message || 'Arquivo de backup inválido.');
      setValidatedBackup(null);
    }
  };

  const handleConfirmRestore = async () => {
    if (!validatedBackup) return;
    setIsRestoring(true);
    setErrorMsg(null);
    try {
      const result = await BackupExportService.restoreBackup(validatedBackup);
      setSuccessMsg(`Restauração concluída com sucesso! ${result.restoredCount} registros processados.`);
      setValidatedBackup(null);
      setBackupFilename('');
      setIsConfirmRestoreOpen(false);
      await refreshData();
    } catch (err: any) {
      console.error('Error restoring backup:', err);
      setErrorMsg(err.message || 'Erro ao restaurar backup no banco de dados.');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-slate-100">Backup & Exportação de Dados</h3>
        <p className="text-xs text-slate-400">
          Gere cópias de segurança em JSON, exporte tabelas em CSV e restaure dados de forma consistente
        </p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 1. EXPORTAÇÃO */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-base">Exportar Dados</h4>
              <p className="text-xs text-slate-400">Baixe cópias dos seus dados financeiros</p>
            </div>
          </div>

          {/* Full JSON Dump Button */}
          <div className="p-4 bg-slate-950/60 border border-indigo-500/30 rounded-xl space-y-3">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs">
              <FileJson className="w-4 h-4 text-indigo-400" />
              <span>Backup Completo em JSON</span>
            </div>
            <p className="text-xs text-slate-400">
              Contém a base completa (Configurações, Categorias, Contas, Cartões, Transações, Recorrências e Orçamentos).
            </p>
            <Button
              variant="primary"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportJSON}
              isLoading={isExporting}
              className="w-full"
            >
              Exportar Backup Completo (.JSON)
            </Button>
          </div>

          {/* Individual CSV Export Section */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Exportar Tabelas Individuais em CSV</span>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <Button variant="outline" size="sm" onClick={() => handleExportCSV('transacoes')}>
                Transações (.CSV)
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportCSV('contas')}>
                Contas (.CSV)
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportCSV('cartoes')}>
                Cartões (.CSV)
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportCSV('categorias')}>
                Categorias (.CSV)
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportCSV('orcamentos')}>
                Orçamentos (.CSV)
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleExportCSV('configuracoes')}>
                Configurações (.CSV)
              </Button>
            </div>
          </div>
        </div>

        {/* 2. RESTAURAÇÃO DE BACKUP */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-md space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-base">Restaurar Backup</h4>
              <p className="text-xs text-slate-400">Valide e restaure um arquivo de backup JSON prévio</p>
            </div>
          </div>

          <label className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950/40 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all">
            <Database className="w-8 h-8 text-indigo-400 mb-2" />
            <span className="text-xs font-semibold text-slate-200">
              {backupFilename ? backupFilename : 'Selecione um arquivo .JSON de backup'}
            </span>
            <span className="text-[10px] text-slate-500 mt-1">Validação automática de consistência prévia</span>
            <input type="file" accept=".json" onChange={handleFileSelected} className="hidden" />
          </label>

          {/* Backup Preview Card */}
          {validatedBackup && (
            <div className="p-4 bg-slate-950/70 border border-emerald-500/30 rounded-xl space-y-3 animate-fade-in">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Backup Validado com Sucesso!</span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Versão</span>
                  <span>{validatedBackup.version}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Data Exportação</span>
                  <span className="truncate block">{validatedBackup.exportedAt.split('T')[0]}</span>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Transações</span>
                  <span>{validatedBackup.data.transacoes?.length || 0} itens</span>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-500 block">Categorias</span>
                  <span>{validatedBackup.data.categorias?.length || 0} itens</span>
                </div>
              </div>

              <Button
                variant="primary"
                icon={<HardDrive className="w-4 h-4" />}
                onClick={() => setIsConfirmRestoreOpen(true)}
                className="w-full"
              >
                Iniciar Restauração de Dados
              </Button>
            </div>
          )}

          <p className="text-[11px] text-slate-500 italic">
            🛡️ A restauração executa a atualização consistente dos registros no banco sem apagar dados indevidamente.
          </p>
        </div>
      </div>

      {/* Confirmation Modal before Restoration */}
      <ConfirmModal
        isOpen={isConfirmRestoreOpen}
        onClose={() => setIsConfirmRestoreOpen(false)}
        onConfirm={handleConfirmRestore}
        title="Confirmar Restauração de Backup"
        message="Atenção: Todos os dados do arquivo de backup selecionado serão importados para o sistema. Deseja realmente prosseguir com a restauração?"
        isLoading={isRestoring}
      />
    </div>
  );
};
