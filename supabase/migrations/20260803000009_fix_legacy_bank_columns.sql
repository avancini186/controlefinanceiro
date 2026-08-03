-- Migration: 20260803000009_fix_legacy_bank_columns.sql
-- Description: Drop NOT NULL constraint on legacy bank columns in cartoes and contas, and align categorias_orcamento schema

ALTER TABLE public.cartoes ALTER COLUMN bank DROP NOT NULL;
ALTER TABLE public.contas ALTER COLUMN bank DROP NOT NULL;

ALTER TABLE public.categorias_orcamento ALTER COLUMN name DROP NOT NULL;
ALTER TABLE public.categorias_orcamento ALTER COLUMN color DROP NOT NULL;
ALTER TABLE public.categorias_orcamento ALTER COLUMN icon DROP NOT NULL;

ALTER TABLE public.categorias_orcamento ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES public.categorias(id) ON DELETE CASCADE;
ALTER TABLE public.categorias_orcamento ADD COLUMN IF NOT EXISTS limite_mensal NUMERIC(15, 2) DEFAULT 0.00;
ALTER TABLE public.categorias_orcamento ADD COLUMN IF NOT EXISTS ano_mes VARCHAR(7);
