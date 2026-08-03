-- Migration: 20260803000004_add_transfer_direction.sql
-- Description: Adiciona campo estruturado direcao_transferencia na tabela transacoes

ALTER TABLE public.transacoes
    ADD COLUMN IF NOT EXISTS direcao_transferencia VARCHAR(10) 
    CHECK (direcao_transferencia IN ('ENTRADA', 'SAIDA'));
