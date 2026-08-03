import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { IntegrityService, type IntegrityIssue } from '../../services/financial/IntegrityService';
import { useFinancialData } from '../../hooks/useFinancialData';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Wrench,
  Info,
} from 'lucide-react';

export const IntegrityView: React.FC = () => {
  const { refreshData } = useFinancialData();

  const [issues, setIssues] = useState<IntegrityIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fixingIssue, setFixingIssue] = useState<IntegrityIssue | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const runAudit = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await IntegrityService.runFullAudit();
      setIssues(result);
    } catch (err) {
      console.error('Error running integrity audit:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    runAudit();
  }, [runAudit]);

  const handleConfirmFix = async () => {
    if (!fixingIssue) return;
    setIsFixing(true);
    try {
      await IntegrityService.autoFixIssue(fixingIssue.id);
      setSuccessMsg(`Inconsistência "${fixingIssue.title}" corrigida com sucesso!`);
      setFixingIssue(null);
      await refreshData();
      await runAudit();
    } catch (err: any) {
      console.error('Error auto fixing issue:', err);
      alert(err.message || 'Erro ao executar reparação automática.');
    } finally {
      setIsFixing(false);
    }
  };

  const highSeverityCount = issues.filter((i) => i.severity === 'ALTA').length;
  const mediumSeverityCount = issues.filter((i) => i.severity === 'MEDIA').length;
  const lowSeverityCount = issues.filter((i) => i.severity === 'BAIXA').length;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-100">Integridade e Auditoria do Banco</h3>
          <p className="text-xs text-slate-400">
            Diagnóstico e reparação contínua de inconsistências de dados e relacionamentos
          </p>
        </div>

        <Button
          variant="primary"
          icon={<RotateCcw className="w-4 h-4" />}
          onClick={runAudit}
          isLoading={isLoading}
        >
          Re-executar Auditoria Completa
        </Button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Audit Summary KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" /> Total de Apontamentos
          </span>
          <span className="text-2xl font-bold font-mono text-slate-100 block">
            {issues.length} ocorrências
          </span>
        </div>

        <div className="p-4 bg-slate-900/60 border border-rose-500/30 rounded-2xl space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-rose-400 block flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Alta Gravidade
          </span>
          <span className="text-2xl font-bold font-mono text-rose-400 block">
            {highSeverityCount}
          </span>
        </div>

        <div className="p-4 bg-slate-900/60 border border-amber-500/30 rounded-2xl space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400 block flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" /> Média Gravidade
          </span>
          <span className="text-2xl font-bold font-mono text-amber-400 block">
            {mediumSeverityCount}
          </span>
        </div>

        <div className="p-4 bg-slate-900/60 border border-sky-500/30 rounded-2xl space-y-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400 block flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> Baixa Gravidade
          </span>
          <span className="text-2xl font-bold font-mono text-sky-400 block">
            {lowSeverityCount}
          </span>
        </div>
      </div>

      {/* Audit Report List */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 text-xs font-mono animate-pulse">
          Executando regras de auditoria no banco de dados...
        </div>
      ) : issues.length === 0 ? (
        <div className="p-12 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
          <h4 className="font-bold text-emerald-400 text-lg">Banco de Dados 100% Íntegro!</h4>
          <p className="text-xs text-slate-300 max-w-md mx-auto">
            Nenhuma inconsistência, transação órfã ou divergência encontrada. Todos os relacionamentos e regras estão consistentes.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h4 className="font-bold text-slate-100 text-base">Relatório de Inconsistências Detectadas</h4>

          <div className="space-y-4">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className="p-5 bg-slate-900/60 border border-slate-800 rounded-2xl backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={
                        issue.severity === 'ALTA'
                          ? 'danger'
                          : issue.severity === 'MEDIA'
                          ? 'warning'
                          : 'info'
                      }
                      size="sm"
                    >
                      Gravidade {issue.severity}
                    </Badge>
                    <span className="font-mono text-xs text-slate-500">[{issue.code}]</span>
                    <span className="font-bold text-slate-100 text-sm">{issue.title}</span>
                  </div>

                  <p className="text-xs text-slate-300">{issue.description}</p>

                  <div className="flex items-center gap-4 text-xs font-mono pt-1">
                    <span className="text-slate-400">
                      Afetados: <strong className="text-indigo-400">{issue.affectedCount}</strong> itens
                    </span>
                    <span className="text-slate-500 italic">Sugestão: {issue.suggestion}</span>
                  </div>
                </div>

                {issue.canAutoFix && (
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Wrench className="w-4 h-4" />}
                    onClick={() => setFixingIssue(issue)}
                    className="shrink-0"
                  >
                    Corrigir automaticamente
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Modal before Auto-Repair */}
      <ConfirmModal
        isOpen={!!fixingIssue}
        onClose={() => setFixingIssue(null)}
        onConfirm={handleConfirmFix}
        title="Confirmar Reparação Automática"
        message={`Deseja realmente executar a correção automática para "${fixingIssue?.title}"? ${fixingIssue?.suggestion}`}
        isLoading={isFixing}
      />
    </div>
  );
};
