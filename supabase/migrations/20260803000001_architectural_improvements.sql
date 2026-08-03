-- Migration: 20260803000001_architectural_improvements.sql
-- Description: Architectural database improvements (constraints, compound indexes, triggers, validation regex)

-- 1. Add Regex Check Constraint for YYYY-MM format on categorias_orcamento
ALTER TABLE public.categorias_orcamento 
    ADD CONSTRAINT chk_ano_mes_format 
    CHECK (ano_mes ~ '^[0-9]{4}-(0[1-9]|1[0-2])$');

-- 2. Add Unique Constraints for data integrity per user
ALTER TABLE public.categorias 
    ADD CONSTRAINT uk_categorias_user_nome_tipo UNIQUE (user_id, nome, tipo);

ALTER TABLE public.contas 
    ADD CONSTRAINT uk_contas_user_nome UNIQUE (user_id, nome);

ALTER TABLE public.cartoes 
    ADD CONSTRAINT uk_cartoes_user_nome UNIQUE (user_id, nome);

-- 3. Add Check Constraint for Installment consistency on transacoes
ALTER TABLE public.transacoes 
    ADD CONSTRAINT chk_parcelas_valid 
    CHECK (
        (grupo_parcelamento_id IS NULL AND numero_parcela IS NULL AND total_parcelas IS NULL) OR
        (grupo_parcelamento_id IS NOT NULL AND numero_parcela >= 1 AND total_parcelas >= 2 AND numero_parcela <= total_parcelas)
    );

-- 4. High-performance compound indexes for scalability
CREATE INDEX IF NOT EXISTS idx_transacoes_user_data_desc ON public.transacoes (user_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_transacoes_status_data ON public.transacoes (status, data);
CREATE INDEX IF NOT EXISTS idx_transacoes_categoria_data ON public.transacoes (categoria_id, data);
CREATE INDEX IF NOT EXISTS idx_splits_categoria ON public.transacoes_splits (categoria_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_ano_mes ON public.categorias_orcamento (ano_mes);

-- 5. Trigger function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_categorias_updated_at
    BEFORE UPDATE ON public.categorias
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
