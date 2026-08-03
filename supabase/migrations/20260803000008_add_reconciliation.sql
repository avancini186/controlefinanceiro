-- Migration: 20260803000008_add_reconciliation.sql
-- Description: Adiciona campos para controle de conciliação bancária na tabela transacoes

ALTER TABLE public.transacoes
    ADD COLUMN IF NOT EXISTS conciliada BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS data_conciliacao TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_transacoes_conciliada ON public.transacoes (conciliada);
