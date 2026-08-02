-- Split Transactions Migration
-- Migration: 20260802_split_transactions.sql

CREATE TABLE IF NOT EXISTS public.transacoes_splits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transacoes(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_transacoes_splits_transaction_id ON public.transacoes_splits(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_splits_category_id ON public.transacoes_splits(category_id);

-- Enable Row Level Security (RLS) and grant open access for public API
ALTER TABLE public.transacoes_splits ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'transacoes_splits' AND policyname = 'Allow public read and write on transacoes_splits'
    ) THEN
        CREATE POLICY "Allow public read and write on transacoes_splits" 
        ON public.transacoes_splits FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
