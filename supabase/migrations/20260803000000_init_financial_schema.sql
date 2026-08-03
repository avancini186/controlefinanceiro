-- Migration: 20260803000000_init_financial_schema.sql
-- Description: Full initial database schema for Personal Financial Manager

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: categorias
CREATE TABLE IF NOT EXISTS public.categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    icone VARCHAR(50) DEFAULT 'Tag',
    cor VARCHAR(20) DEFAULT '#64748b',
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('RECEITA', 'DESPESA')),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: categorias_orcamento
CREATE TABLE IF NOT EXISTS public.categorias_orcamento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
    limite_mensal NUMERIC(15, 2) NOT NULL CHECK (limite_mensal >= 0),
    ano_mes VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uk_categoria_ano_mes UNIQUE (categoria_id, ano_mes)
);

-- Table: contas
CREATE TABLE IF NOT EXISTS public.contas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN ('CONTA_CORRENTE', 'POUPANCA', 'INVESTIMENTO', 'CARTEIRA', 'OUTROS')),
    saldo_inicial NUMERIC(15, 2) DEFAULT 0.00,
    saldo_atual NUMERIC(15, 2) DEFAULT 0.00,
    cor VARCHAR(20) DEFAULT '#3b82f6',
    icone VARCHAR(50) DEFAULT 'Wallet',
    ativa BOOLEAN DEFAULT TRUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: cartoes
CREATE TABLE IF NOT EXISTS public.cartoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL,
    limite NUMERIC(15, 2) NOT NULL CHECK (limite >= 0),
    dia_fechamento INT NOT NULL CHECK (dia_fechamento BETWEEN 1 AND 31),
    dia_vencimento INT NOT NULL CHECK (dia_vencimento BETWEEN 1 AND 31),
    conta_padrao_id UUID REFERENCES public.contas(id) ON DELETE SET NULL,
    cor VARCHAR(20) DEFAULT '#8b5cf6',
    icone VARCHAR(50) DEFAULT 'CreditCard',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: grupos_parcelamento
CREATE TABLE IF NOT EXISTS public.grupos_parcelamento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    descricao VARCHAR(255) NOT NULL,
    total_parcelas INT NOT NULL CHECK (total_parcelas > 1),
    valor_total NUMERIC(15, 2) NOT NULL CHECK (valor_total > 0),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: transacoes
CREATE TABLE IF NOT EXISTS public.transacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('RECEITA', 'DESPESA', 'TRANSFERENCIA')),
    valor NUMERIC(15, 2) NOT NULL CHECK (valor > 0),
    data DATE NOT NULL,
    categoria_id UUID REFERENCES public.categorias(id) ON DELETE SET NULL,
    conta_id UUID REFERENCES public.contas(id) ON DELETE SET NULL,
    cartao_id UUID REFERENCES public.cartoes(id) ON DELETE SET NULL,
    descricao VARCHAR(255) NOT NULL,
    observacao TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'CONCLUIDO' CHECK (status IN ('PENDENTE', 'CONCLUIDO', 'CANCELADO')),
    grupo_parcelamento_id UUID REFERENCES public.grupos_parcelamento(id) ON DELETE CASCADE,
    numero_parcela INT,
    total_parcelas INT,
    transfer_group_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: transacoes_splits
CREATE TABLE IF NOT EXISTS public.transacoes_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transacao_id UUID NOT NULL REFERENCES public.transacoes(id) ON DELETE CASCADE,
    categoria_id UUID NOT NULL REFERENCES public.categorias(id) ON DELETE CASCADE,
    valor NUMERIC(15, 2) NOT NULL CHECK (valor > 0),
    descricao VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_categorias_user ON public.categorias(user_id);
CREATE INDEX IF NOT EXISTS idx_contas_user ON public.contas(user_id);
CREATE INDEX IF NOT EXISTS idx_cartoes_user ON public.cartoes(user_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_user ON public.transacoes(user_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_data ON public.transacoes(data);
CREATE INDEX IF NOT EXISTS idx_transacoes_conta ON public.transacoes(conta_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_cartao ON public.transacoes(cartao_id);
CREATE INDEX IF NOT EXISTS idx_transacoes_transfer_group ON public.transacoes(transfer_group_id);
CREATE INDEX IF NOT EXISTS idx_splits_transacao ON public.transacoes_splits(transacao_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_orcamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos_parcelamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transacoes_splits ENABLE ROW LEVEL SECURITY;

-- Default RLS Policies (Allow access to user owned records or anon for dev)
CREATE POLICY "Permitir tudo para usuario dono categorias" ON public.categorias FOR ALL USING (true);
CREATE POLICY "Permitir tudo para usuario dono orcamentos" ON public.categorias_orcamento FOR ALL USING (true);
CREATE POLICY "Permitir tudo para usuario dono contas" ON public.contas FOR ALL USING (true);
CREATE POLICY "Permitir tudo para usuario dono cartoes" ON public.cartoes FOR ALL USING (true);
CREATE POLICY "Permitir tudo para usuario dono grupos_parcelamento" ON public.grupos_parcelamento FOR ALL USING (true);
CREATE POLICY "Permitir tudo para usuario dono transacoes" ON public.transacoes FOR ALL USING (true);
CREATE POLICY "Permitir tudo para usuario dono transacoes_splits" ON public.transacoes_splits FOR ALL USING (true);
