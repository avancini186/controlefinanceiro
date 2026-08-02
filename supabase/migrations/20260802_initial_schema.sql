-- Initial Database Schema for Financial Manager
-- Migration: 20260802_initial_schema.sql

-- 1. Categorias de Receitas e Despesas
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    color TEXT NOT NULL DEFAULT '#3b82f6',
    icon TEXT NOT NULL DEFAULT 'Tag',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Categorias de Orçamento
CREATE TABLE IF NOT EXISTS public.categorias_orcamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#8b5cf6',
    icon TEXT NOT NULL DEFAULT 'PieChart',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Contas Correntes
CREATE TABLE IF NOT EXISTS public.contas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    bank TEXT NOT NULL,
    initial_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    color TEXT NOT NULL DEFAULT '#10b981',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Cartões de Crédito
CREATE TABLE IF NOT EXISTS public.cartoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    bank TEXT NOT NULL,
    limit_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    closing_day INT NOT NULL CHECK (closing_day BETWEEN 1 AND 31),
    due_day INT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
    color TEXT NOT NULL DEFAULT '#ef4444',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Grupos de Parcelamento
CREATE TABLE IF NOT EXISTS public.grupos_parcelamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT NOT NULL,
    total_amount NUMERIC(12, 2) NOT NULL,
    installments_count INT NOT NULL CHECK (installments_count > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Transações
CREATE TABLE IF NOT EXISTS public.transacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC(12, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    category_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
    account_id UUID REFERENCES public.contas(id) ON DELETE SET NULL,
    card_id UUID REFERENCES public.cartoes(id) ON DELETE SET NULL,
    description TEXT,
    observation TEXT,
    installment_group_id UUID REFERENCES public.grupos_parcelamento(id) ON DELETE CASCADE,
    installment_number TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security (RLS) and grant open access for public API
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_orcamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos_parcelamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read and write on categorias" ON public.categorias FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read and write on categorias_orcamento" ON public.categorias_orcamento FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read and write on contas" ON public.contas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read and write on cartoes" ON public.cartoes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read and write on grupos_parcelamento" ON public.grupos_parcelamento FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read and write on transacoes" ON public.transacoes FOR ALL USING (true) WITH CHECK (true);
