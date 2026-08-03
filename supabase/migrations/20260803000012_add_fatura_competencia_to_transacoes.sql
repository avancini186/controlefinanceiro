-- Migration: 20260803000012_add_fatura_competencia_to_transacoes.sql
-- Description: Adiciona campos de competência da fatura e vencimento em transações de cartão de crédito

ALTER TABLE public.transacoes
    ADD COLUMN IF NOT EXISTS fatura_competencia VARCHAR(7),
    ADD COLUMN IF NOT EXISTS fatura_ano INT,
    ADD COLUMN IF NOT EXISTS fatura_mes INT,
    ADD COLUMN IF NOT EXISTS fatura_vencimento DATE;

-- Preenche retroativamente as transações de cartão de crédito existentes
DO $$
DECLARE
    rec RECORD;
    comp_year INT;
    comp_month INT;
    comp_str VARCHAR(7);
    venc_year INT;
    venc_month INT;
    venc_day INT;
    venc_date DATE;
    days_in_venc_month INT;
BEGIN
    FOR rec IN 
        SELECT t.id, t.data, c.dia_fechamento, c.dia_vencimento
        FROM public.transacoes t
        JOIN public.cartoes c ON t.cartao_id = c.id
        WHERE t.cartao_id IS NOT NULL AND t.fatura_competencia IS NULL
    LOOP
        -- Extrai ano, mês e dia da compra
        comp_year := EXTRACT(YEAR FROM rec.data);
        comp_month := EXTRACT(MONTH FROM rec.data);

        -- Se dia da compra > dia de fechamento do cartão, avança para o próximo mês
        IF EXTRACT(DAY FROM rec.data) > rec.dia_fechamento THEN
            comp_month := comp_month + 1;
            IF comp_month > 12 THEN
                comp_month := 1;
                comp_year := comp_year + 1;
            END IF;
        END IF;

        comp_str := comp_year || '-' || LPAD(comp_month::text, 2, '0');

        -- Determina mês de vencimento
        venc_year := comp_year;
        venc_month := comp_month;
        IF rec.dia_vencimento <= rec.dia_fechamento THEN
            venc_month := venc_month + 1;
            IF venc_month > 12 THEN
                venc_month := 1;
                venc_year := venc_year + 1;
            END IF;
        END IF;

        -- Garante dia válido para o mês de vencimento
        venc_date := (venc_year || '-' || LPAD(venc_month::text, 2, '0') || '-01')::DATE + INTERVAL '1 month' - INTERVAL '1 day';
        days_in_venc_month := EXTRACT(DAY FROM venc_date);
        venc_day := LEAST(rec.dia_vencimento, days_in_venc_month);
        venc_date := (venc_year || '-' || LPAD(venc_month::text, 2, '0') || '-' || LPAD(venc_day::text, 2, '0'))::DATE;

        UPDATE public.transacoes
        SET fatura_competencia = comp_str,
            fatura_ano = comp_year,
            fatura_mes = comp_month,
            fatura_vencimento = venc_date
        WHERE id = rec.id;
    END LOOP;
END $$;
