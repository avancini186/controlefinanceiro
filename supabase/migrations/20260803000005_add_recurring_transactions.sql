-- Migration: 20260803000005_add_recurring_transactions.sql
-- Description: Tabela transacoes_recorrentes para automação de receitas e despesas repetitivas

CREATE TABLE IF NOT EXISTS public.transacoes_recorrentes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('RECEITA', 'DESPESA')),
    descricao VARCHAR(255) NOT NULL,
    valor NUMERIC(15, 2) NOT NULL CHECK (valor > 0),
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
    conta_id UUID REFERENCES public.contas(id) ON DELETE SET NULL,
    cartao_id UUID REFERENCES public.cartoes(id) ON DELETE SET NULL,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    frequencia VARCHAR(20) NOT NULL CHECK (
        frequencia IN ('DIARIA', 'SEMANAL', 'QUINZENAL', 'MENSAL', 'BIMESTRAL', 'TRIMESTRAL', 'SEMESTRAL', 'ANUAL')
    ),
    intervalo INT NOT NULL DEFAULT 1 CHECK (intervalo >= 1),
    ativa BOOLEAN DEFAULT TRUE,
    ultima_execucao DATE,
    proxima_execucao DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chk_data_fim_valid CHECK (data_fim IS NULL OR data_fim >= data_inicio)
);

-- Indexes for recurring transactions
CREATE INDEX IF NOT EXISTS idx_recorrentes_proxima_exec ON public.transacoes_recorrentes (ativa, proxima_execucao);
CREATE INDEX IF NOT EXISTS idx_recorrentes_categoria ON public.transacoes_recorrentes (categoria_id);
CREATE INDEX IF NOT EXISTS idx_recorrentes_conta ON public.transacoes_recorrentes (conta_id);

-- Enable RLS
ALTER TABLE public.transacoes_recorrentes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir tudo transacoes_recorrentes" ON public.transacoes_recorrentes FOR ALL USING (true);

-- Trigger para updated_at
CREATE TRIGGER trg_transacoes_recorrentes_updated_at
    BEFORE UPDATE ON public.transacoes_recorrentes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
