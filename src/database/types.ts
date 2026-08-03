export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      configuracoes: {
        Row: {
          id: number
          moeda: string
          primeiro_dia_mes: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          moeda?: string
          primeiro_dia_mes?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          moeda?: string
          primeiro_dia_mes?: number
          created_at?: string
          updated_at?: string
        }
      }
      categorias: {
        Row: {
          id: string
          nome: string
          icone: string
          cor: string
          tipo: 'RECEITA' | 'DESPESA'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nome: string
          icone?: string
          cor?: string
          tipo: 'RECEITA' | 'DESPESA'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          icone?: string
          cor?: string
          tipo?: 'RECEITA' | 'DESPESA'
          created_at?: string
          updated_at?: string
        }
      }
      categorias_orcamento: {
        Row: {
          id: string
          categoria_id: string
          limite_mensal: number
          ano_mes: string
          created_at: string
        }
        Insert: {
          id?: string
          categoria_id: string
          limite_mensal: number
          ano_mes: string
          created_at?: string
        }
        Update: {
          id?: string
          categoria_id?: string
          limite_mensal?: number
          ano_mes?: string
          created_at?: string
        }
      }
      contas: {
        Row: {
          id: string
          nome: string
          tipo: 'CONTA_CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'CARTEIRA' | 'OUTROS'
          saldo_inicial: number
          saldo_atual: number
          cor: string
          icone: string
          ativa: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          tipo: 'CONTA_CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'CARTEIRA' | 'OUTROS'
          saldo_inicial?: number
          saldo_atual?: number
          cor?: string
          icone?: string
          ativa?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          tipo?: 'CONTA_CORRENTE' | 'POUPANCA' | 'INVESTIMENTO' | 'CARTEIRA' | 'OUTROS'
          saldo_inicial?: number
          saldo_atual?: number
          cor?: string
          icone?: string
          ativa?: boolean
          created_at?: string
        }
      }
      cartoes: {
        Row: {
          id: string
          nome: string
          limite: number
          dia_fechamento: number
          dia_vencimento: number
          conta_padrao_id: string | null
          cor: string
          icone: string
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          limite: number
          dia_fechamento: number
          dia_vencimento: number
          conta_padrao_id?: string | null
          cor?: string
          icone?: string
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          limite?: number
          dia_fechamento?: number
          dia_vencimento?: number
          conta_padrao_id?: string | null
          cor?: string
          icone?: string
          created_at?: string
        }
      }
      grupos_parcelamento: {
        Row: {
          id: string
          descricao: string
          total_parcelas: number
          valor_total: number
          created_at: string
        }
        Insert: {
          id?: string
          descricao: string
          total_parcelas: number
          valor_total: number
          created_at?: string
        }
        Update: {
          id?: string
          descricao?: string
          total_parcelas?: number
          valor_total?: number
          created_at?: string
        }
      }
      transacoes: {
        Row: {
          id: string
          tipo: 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA'
          valor: number
          data: string
          categoria_id: string | null
          conta_id: string | null
          cartao_id: string | null
          descricao: string
          observacao: string | null
          status: 'PENDENTE' | 'CONCLUIDO' | 'CANCELADO'
          grupo_parcelamento_id: string | null
          numero_parcela: number | null
          total_parcelas: number | null
          transfer_group_id: string | null
          direcao_transferencia: 'ENTRADA' | 'SAIDA' | null
          import_hash: string | null
          conciliada: boolean
          data_conciliacao: string | null
          created_at: string
        }
        Insert: {
          id?: string
          tipo: 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA'
          valor: number
          data: string
          categoria_id?: string | null
          conta_id?: string | null
          cartao_id?: string | null
          descricao: string
          observacao?: string | null
          status?: 'PENDENTE' | 'CONCLUIDO' | 'CANCELADO'
          grupo_parcelamento_id?: string | null
          numero_parcela?: number | null
          total_parcelas?: number | null
          transfer_group_id?: string | null
          direcao_transferencia?: 'ENTRADA' | 'SAIDA' | null
          import_hash?: string | null
          conciliada?: boolean
          data_conciliacao?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          tipo?: 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA'
          valor?: number
          data?: string
          categoria_id?: string | null
          conta_id?: string | null
          cartao_id?: string | null
          descricao?: string
          observacao?: string | null
          status?: 'PENDENTE' | 'CONCLUIDO' | 'CANCELADO'
          grupo_parcelamento_id?: string | null
          numero_parcela?: number | null
          total_parcelas?: number | null
          transfer_group_id?: string | null
          direcao_transferencia?: 'ENTRADA' | 'SAIDA' | null
          import_hash?: string | null
          conciliada?: boolean
          data_conciliacao?: string | null
          created_at?: string
        }
      }
      transacoes_recorrentes: {
        Row: {
          id: string
          tipo: 'RECEITA' | 'DESPESA'
          descricao: string
          valor: number
          categoria_id: string | null
          conta_id: string | null
          cartao_id: string | null
          data_inicio: string
          data_fim: string | null
          frequencia: 'DIARIA' | 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL'
          intervalo: number
          ativa: boolean
          ultima_execucao: string | null
          proxima_execucao: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tipo: 'RECEITA' | 'DESPESA'
          descricao: string
          valor: number
          categoria_id?: string | null
          conta_id?: string | null
          cartao_id?: string | null
          data_inicio: string
          data_fim?: string | null
          frequencia: 'DIARIA' | 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL'
          intervalo?: number
          ativa?: boolean
          ultima_execucao?: string | null
          proxima_execucao: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tipo?: 'RECEITA' | 'DESPESA'
          descricao?: string
          valor?: number
          categoria_id?: string | null
          conta_id?: string | null
          cartao_id?: string | null
          data_inicio?: string
          data_fim?: string | null
          frequencia?: 'DIARIA' | 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'SEMESTRAL' | 'ANUAL'
          intervalo?: number
          ativa?: boolean
          ultima_execucao?: string | null
          proxima_execucao?: string
          created_at?: string
          updated_at?: string
        }
      }
      transacoes_splits: {
        Row: {
          id: string
          transacao_id: string
          categoria_id: string
          valor: number
          descricao: string | null
          created_at: string
        }
        Insert: {
          id?: string
          transacao_id: string
          categoria_id: string
          valor: number
          descricao?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          transacao_id?: string
          categoria_id?: string
          valor?: number
          descricao?: string | null
          created_at?: string
        }
      }
      importacoes_ofx: {
        Row: {
          id: string
          nome_arquivo: string
          conta_id: string
          total_transacoes: number
          valor_total_creditos: number
          valor_total_debitos: number
          created_at: string
        }
        Insert: {
          id?: string
          nome_arquivo: string
          conta_id: string
          total_transacoes: number
          valor_total_creditos?: number
          valor_total_debitos?: number
          created_at?: string
        }
        Update: {
          id?: string
          nome_arquivo?: string
          conta_id?: string
          total_transacoes?: number
          valor_total_creditos?: number
          valor_total_debitos?: number
          created_at?: string
        }
      }
      modelos_mapeamento_csv: {
        Row: {
          id: string
          nome_modelo: string
          coluna_data: string
          coluna_descricao: string
          coluna_valor: string
          coluna_tipo: string | null
          coluna_categoria: string | null
          delimitador: string
          formato_data: string
          created_at: string
        }
        Insert: {
          id?: string
          nome_modelo: string
          coluna_data: string
          coluna_descricao: string
          coluna_valor: string
          coluna_tipo?: string | null
          coluna_categoria?: string | null
          delimitador?: string
          formato_data?: string
          created_at?: string
        }
        Update: {
          id?: string
          nome_modelo?: string
          coluna_data?: string
          coluna_descricao?: string
          coluna_valor?: string
          coluna_tipo?: string | null
          coluna_categoria?: string | null
          delimitador?: string
          formato_data?: string
          created_at?: string
        }
      }
      importacoes_csv: {
        Row: {
          id: string
          nome_arquivo: string
          conta_id: string
          total_transacoes: number
          valor_total_creditos: number
          valor_total_debitos: number
          created_at: string
        }
        Insert: {
          id?: string
          nome_arquivo: string
          conta_id: string
          total_transacoes: number
          valor_total_creditos?: number
          valor_total_debitos?: number
          created_at?: string
        }
        Update: {
          id?: string
          nome_arquivo?: string
          conta_id?: string
          total_transacoes?: number
          valor_total_creditos?: number
          valor_total_debitos?: number
          created_at?: string
        }
      }
    }
  }
}
