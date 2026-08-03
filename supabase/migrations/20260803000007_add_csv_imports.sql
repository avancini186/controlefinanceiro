-- Migration: 20260803000007_add_csv_imports.sql
-- Description: Tabelas para modelos de mapeamento de colunas CSV e histórico de importações CSV

CREATE TABLE IF NOT EXISTS public.modelos_mapeamento_csv (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_modelo VARCHAR(255) NOT NULL,
    coluna_data VARCHAR(100) NOT NULL,
    coluna_descricao VARCHAR(100) NOT NULL,
    coluna_valor VARCHAR(100) NOT NULL,
    coluna_tipo VARCHAR(100),
    coluna_categoria VARCHAR(100),
    delimitador VARCHAR(10) DEFAULT ',',
    formato_data VARCHAR(20) DEFAULT 'YYYY-MM-DD',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.importacoes_csv (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_arquivo VARCHAR(255) NOT NULL,
    conta_id UUID REFERENCES public.contas(id) ON DELETE CASCADE,
    total_transacoes INT NOT NULL,
    valor_total_creditos NUMERIC(15, 2) DEFAULT 0,
    valor_total_debitos NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.modelos_mapeamento_csv ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir tudo modelos_mapeamento_csv" ON public.modelos_mapeamento_csv FOR ALL USING (true);

ALTER TABLE public.importacoes_csv ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir tudo importacoes_csv" ON public.importacoes_csv FOR ALL USING (true);
