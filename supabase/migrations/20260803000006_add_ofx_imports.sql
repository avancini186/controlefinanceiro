-- Migration: 20260803000006_add_ofx_imports.sql
-- Description: Adiciona controle de hash para duplicações e tabela de histórico de importações OFX

-- Add import_hash column to transacoes table
ALTER TABLE public.transacoes
    ADD COLUMN IF NOT EXISTS import_hash VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_transacoes_import_hash ON public.transacoes (import_hash);

-- Create importacoes_ofx table for history logging
CREATE TABLE IF NOT EXISTS public.importacoes_ofx (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_arquivo VARCHAR(255) NOT NULL,
    conta_id UUID REFERENCES public.contas(id) ON DELETE CASCADE,
    total_transacoes INT NOT NULL,
    valor_total_creditos NUMERIC(15, 2) DEFAULT 0,
    valor_total_debitos NUMERIC(15, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.importacoes_ofx ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir tudo importacoes_ofx" ON public.importacoes_ofx FOR ALL USING (true);
