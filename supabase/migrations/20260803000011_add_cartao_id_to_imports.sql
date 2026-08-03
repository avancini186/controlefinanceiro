-- Migration: 20260803000011_add_cartao_id_to_imports.sql
-- Description: Adiciona coluna cartao_id nas tabelas de histórico de importação OFX e CSV

ALTER TABLE public.importacoes_ofx
    ADD COLUMN IF NOT EXISTS cartao_id UUID REFERENCES public.cartoes(id) ON DELETE CASCADE;

ALTER TABLE public.importacoes_csv
    ADD COLUMN IF NOT EXISTS cartao_id UUID REFERENCES public.cartoes(id) ON DELETE CASCADE;
