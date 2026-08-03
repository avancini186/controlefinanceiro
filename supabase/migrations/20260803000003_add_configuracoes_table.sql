-- Migration: 20260803000003_add_configuracoes_table.sql
-- Description: Tabela de configurações globais da aplicação (moeda, primeiro dia do mês financeiro, etc)

CREATE TABLE IF NOT EXISTS public.configuracoes (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    moeda VARCHAR(10) NOT NULL DEFAULT 'BRL',
    primeiro_dia_mes INT NOT NULL DEFAULT 1 CHECK (primeiro_dia_mes BETWEEN 1 AND 31),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir registro único inicial se não existir
INSERT INTO public.configuracoes (id, moeda, primeiro_dia_mes)
VALUES (1, 'BRL', 1)
ON CONFLICT (id) DO NOTHING;

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER trg_configuracoes_updated_at
    BEFORE UPDATE ON public.configuracoes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
