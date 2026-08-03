-- Migration: 20260803000010_fix_transacoes_type_check.sql
-- Description: Align CHECK constraints and column names on transacoes, transacoes_splits, and categorias with PT-BR enums

DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transacoes_splits' AND column_name='transaction_id') THEN
    ALTER TABLE public.transacoes_splits RENAME COLUMN transaction_id TO transacao_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transacoes_splits' AND column_name='category_id') THEN
    ALTER TABLE public.transacoes_splits RENAME COLUMN category_id TO categoria_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transacoes_splits' AND column_name='amount') THEN
    ALTER TABLE public.transacoes_splits RENAME COLUMN amount TO valor;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transacoes_splits' AND column_name='description') THEN
    ALTER TABLE public.transacoes_splits RENAME COLUMN description TO descricao;
  END IF;
END $$;

ALTER TABLE public.categorias DROP CONSTRAINT IF EXISTS categorias_type_check;

UPDATE public.categorias SET tipo = 'DESPESA' WHERE tipo = 'expense';
UPDATE public.categorias SET tipo = 'RECEITA' WHERE tipo = 'income';

ALTER TABLE public.categorias ADD CONSTRAINT categorias_tipo_check CHECK (tipo IN ('RECEITA', 'DESPESA'));

ALTER TABLE public.transacoes DROP CONSTRAINT IF EXISTS transacoes_type_check;
ALTER TABLE public.transacoes ADD CONSTRAINT transacoes_tipo_check CHECK (tipo IN ('RECEITA', 'DESPESA', 'TRANSFERENCIA'));
