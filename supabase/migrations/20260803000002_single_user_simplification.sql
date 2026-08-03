-- Migration: 20260803000002_single_user_simplification.sql
-- Description: Simplificação para aplicação monousuário sem autenticação (Remoção completa de user_id)

-- 1. Remover constraints que envolviam user_id
ALTER TABLE public.categorias DROP CONSTRAINT IF EXISTS uk_categorias_user_nome_tipo;
ALTER TABLE public.contas DROP CONSTRAINT IF EXISTS uk_contas_user_nome;
ALTER TABLE public.cartoes DROP CONSTRAINT IF EXISTS uk_cartoes_user_nome;

-- 2. Remover índices baseados em user_id
DROP INDEX IF EXISTS idx_categorias_user;
DROP INDEX IF EXISTS idx_contas_user;
DROP INDEX IF EXISTS idx_cartoes_user;
DROP INDEX IF EXISTS idx_transacoes_user;
DROP INDEX IF EXISTS idx_transacoes_user_data_desc;

-- 3. Remover colunas user_id de todas as tabelas
ALTER TABLE public.categorias DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.categorias_orcamento DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.contas DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.cartoes DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.grupos_parcelamento DROP COLUMN IF EXISTS user_id;
ALTER TABLE public.transacoes DROP COLUMN IF EXISTS user_id;

-- 4. Adicionar novas constraints de unicidade para ambiente monousuário
ALTER TABLE public.categorias ADD CONSTRAINT uk_categorias_nome_tipo UNIQUE (nome, tipo);
ALTER TABLE public.contas ADD CONSTRAINT uk_contas_nome UNIQUE (nome);
ALTER TABLE public.cartoes ADD CONSTRAINT uk_cartoes_nome UNIQUE (nome);

-- 5. Adicionar índice de alta performance por data para o usuário único
CREATE INDEX IF NOT EXISTS idx_transacoes_data_desc ON public.transacoes (data DESC);
