import React, { useState } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { OCRScannerService, type OCRScanResult } from '../../services/financial/OCRScannerService';
import { ScanText, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface OCRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (result: OCRScanResult) => void;
}

export const OCRScannerModal: React.FC<OCRScannerModalProps> = ({
  isOpen,
  onClose,
  onScanComplete,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [extractedResult, setExtractedResult] = useState<OCRScanResult | null>(null);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setErrorMsg(null);
    setExtractedResult(null);

    try {
      const result = await OCRScannerService.scanReceiptFile(file);
      if (!result.valor && !result.estabelecimento) {
        setErrorMsg('Não foi possível reconhecer os dados do comprovante. Tente outra imagem mais nítida.');
        setIsScanning(false);
        return;
      }
      setExtractedResult(result);
    } catch (err: any) {
      console.error('Error scanning receipt:', err);
      setErrorMsg(err.message || 'Erro ao processar imagem do comprovante.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleApplyToForm = () => {
    if (extractedResult) {
      onScanComplete(extractedResult);
      onClose();
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Leitura de Comprovante (OCR)"
      subtitle="Selecione um comprovante em imagem ou PDF para preencher a transação automaticamente"
      maxWidth="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          {extractedResult && (
            <Button variant="primary" onClick={handleApplyToForm}>
              Preencher Formulário de Transação
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-5">
        <label className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 bg-slate-950/40 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all">
          <ScanText className="w-10 h-10 text-indigo-400 mb-3" />
          <span className="text-sm font-semibold text-slate-200">
            Selecione uma imagem (PNG, JPG, WEBP) ou PDF
          </span>
          <span className="text-xs text-slate-500 mt-1">
            Extrai automaticamente Valor, Data e Estabelecimento
          </span>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileSelected}
            className="hidden"
          />
        </label>

        {isScanning && (
          <div className="p-6 text-center text-slate-400 text-xs font-mono">
            Escaneando comprovante e reconhecendo caracteres...
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {extractedResult && (
          <div className="p-4 bg-slate-950/60 border border-emerald-500/30 rounded-2xl space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Dados Reconhecidos do Comprovante</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Estabelecimento</span>
                <span className="font-semibold text-slate-100 block truncate">
                  {extractedResult.estabelecimento || 'Não identificado'}
                </span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Valor Reconhecido</span>
                <span className="font-bold font-mono text-emerald-400 block">
                  {extractedResult.valor ? formatCurrency(extractedResult.valor) : 'Não identificado'}
                </span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Data da Transação</span>
                <span className="font-mono text-slate-300 block">
                  {extractedResult.data || 'Não identificada'}
                </span>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px]">Tipo Sugerido</span>
                <span className="font-semibold text-slate-200 block">
                  {extractedResult.tipo}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-amber-400/90 italic pt-1">
              ⚠️ A transação NÃO será salva automaticamente. Ao clicar em "Preencher Formulário", você poderá revisar todos os campos antes de confirmar.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
