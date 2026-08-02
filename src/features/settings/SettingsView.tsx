import React, { useState } from 'react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useFinancial } from '../../context/FinancialContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Database, RefreshCw, CheckCircle2, AlertCircle, Server } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { resetToSeed } = useFinancial();
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetToSeed();
      setResetMessage('Dados de exemplo restaurados com sucesso!');
      setTimeout(() => setResetMessage(''), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Supabase Connection Status Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Conexão com Banco de Dados</h3>
              <p className="text-xs text-slate-500">Status do Supabase PostgreSQL / Armazenamento</p>
            </div>
          </div>

          <Badge variant={isSupabaseConfigured ? 'emerald' : 'amber'}>
            {isSupabaseConfigured ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" /> Supabase Conectado
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5" /> Modo Local (Fallback)
              </>
            )}
          </Badge>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          {isSupabaseConfigured
            ? 'O aplicativo está conectado e sincronizado diretamente com seu projeto no Supabase.'
            : 'Atualmente o aplicativo está utilizando o armazenamento local do navegador (LocalStorage). As informações serão salvas localmente para que você possa testar todas as funcionalidades imediatamente sem pré-configurações.'}
        </p>

        {!isSupabaseConfigured && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 flex flex-col gap-2">
            <span className="font-sans font-bold text-slate-800 text-sm">Para conectar com seu Supabase:</span>
            <span>1. Crie um arquivo <code className="bg-slate-200 px-1 py-0.5 rounded">.env</code> na raiz do projeto.</span>
            <span>2. Adicione as seguintes variáveis com as credenciais do seu projeto:</span>
            <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg overflow-x-auto text-[11px] mt-1">
              VITE_SUPABASE_URL=https://seu-projeto.supabase.co{'\n'}
              VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
            </pre>
            <span>3. Execute o script SQL presente em <code className="bg-slate-200 px-1 py-0.5 rounded">supabase/migrations/20260802_initial_schema.sql</code> no SQL Editor do Supabase.</span>
          </div>
        )}
      </div>

      {/* Demo Seed Data Reset Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">Dados de Demonstração</h3>
            <p className="text-xs text-slate-500">Restauração de categorias, contas e transações iniciais</p>
          </div>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          Se desejar reiniciar o estado da aplicação com categorias, contas e transações de teste recomendadas para navegação rápida, clique no botão abaixo.
        </p>

        {resetMessage && (
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> {resetMessage}
          </div>
        )}

        <div className="flex items-center justify-start pt-2">
          <Button
            variant="secondary"
            onClick={handleReset}
            disabled={isResetting}
            icon={<RefreshCw className={`w-4 h-4 ${isResetting ? 'animate-spin' : ''}`} />}
          >
            {isResetting ? 'Restaurando...' : 'Restaurar Dados de Exemplo'}
          </Button>
        </div>
      </div>
    </div>
  );
};
