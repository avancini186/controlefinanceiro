import { TransactionType, TransactionStatus, AccountType, CategoryType, RecurrenceFrequency } from './enums';
import type { Database } from '../database/types';

export * from './enums';
export * from './schemas';

type Tables = Database['public']['Tables'];

export type RichTransactionRow = Tables['transacoes']['Row'] & {
  category?: Tables['categorias']['Row'] | null;
  account?: Tables['contas']['Row'] | null;
  creditCard?: Tables['cartoes']['Row'] | null;
  splits?: Tables['transacoes_splits']['Row'][] | null;
};

export interface AppConfig {
  id: number;
  moeda: string;
  primeiroDiaMes: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  nome: string;
  icone: string;
  cor: string;
  tipo: CategoryType;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategory {
  id: string;
  categoriaId: string;
  limiteMensal: number;
  anoMes: string; // YYYY-MM
  createdAt: string;
  category?: Category;
  gastoAtual?: number;
}

export interface Account {
  id: string;
  nome: string;
  tipo: AccountType;
  saldoInicial: number;
  saldoAtual: number;
  cor: string;
  icone: string;
  ativa: boolean;
  createdAt: string;
}

export interface CreditCard {
  id: string;
  nome: string;
  limite: number;
  diaFechamento: number;
  diaVencimento: number;
  contaPadraoId?: string | null;
  cor: string;
  icone: string;
  createdAt: string;
  faturaAtual?: number;
  faturaProxima?: number;
}

export interface InstallmentGroup {
  id: string;
  descricao: string;
  totalParcelas: number;
  valorTotal: number;
  createdAt: string;
}

export interface TransactionSplit {
  id: string;
  transactionId: string;
  categoryId: string;
  amount: number;
  description?: string;
  category?: Category;
}

export interface Transaction {
  id: string;
  tipo: TransactionType;
  valor: number;
  data: string; // YYYY-MM-DD
  categoriaId?: string | null;
  contaId?: string | null;
  cartaoId?: string | null;
  descricao: string;
  observacao?: string | null;
  status: TransactionStatus;
  grupoParcelamentoId?: string | null;
  numeroParcela?: number | null;
  totalParcelas?: number | null;
  transferGroupId?: string | null;
  direcaoTransferencia?: 'SAIDA' | 'ENTRADA' | null;
  importHash?: string | null;
  conciliada?: boolean;
  dataConciliacao?: string | null;
  faturaCompetencia?: string | null;
  faturaAno?: number | null;
  faturaMes?: number | null;
  faturaVencimento?: string | null;
  createdAt: string;

  // Joined rich relationships
  category?: Category;
  account?: Account;
  creditCard?: CreditCard;
  splits?: TransactionSplit[];
}

export interface RecurringTransaction {
  id: string;
  tipo: TransactionType;
  descricao: string;
  valor: number;
  categoriaId?: string | null;
  contaId?: string | null;
  cartaoId?: string | null;
  dataInicio: string;
  dataFim?: string | null;
  frequencia: RecurrenceFrequency;
  intervalo: number;
  ativa: boolean;
  ultimaExecucao?: string | null;
  proximaExecucao: string;
  createdAt: string;
  updatedAt: string;
  category?: Category;
  account?: Account;
  creditCard?: CreditCard;
}

export interface TransferRequest {
  contaOrigemId: string;
  contaDestinoId: string;
  valor: number;
  data: string;
  descricao: string;
  observacao?: string;
}

export interface BalanceSummary {
  saldoTotal: number;
  totalReceitas: number;
  totalDespesas: number;
  saldoContas: number;
  faturasPendentes: number;
}

export interface OFXParsedTransaction {
  fitId: string;
  tipo: TransactionType;
  descricao: string;
  valor: number;
  data: string;
  memo?: string;
  hash: string;
  isDuplicate: boolean;
  selected: boolean;
  isCreditIgnored?: boolean;
  ignoreReason?: string;
}

export interface OFXImportRecord {
  id: string;
  nomeArquivo: string;
  contaId?: string | null;
  cartaoId?: string | null;
  totalTransacoes?: number;
  qtdTransacoes?: number;
  valorTotalCreditos?: number;
  valorTotalDebitos?: number;
  dataImportacao?: string;
  createdAt: string;
  account?: Account;
  creditCard?: CreditCard;
}

export interface CSVColumnMapping {
  dataCol?: number | string;
  descricaoCol?: number | string;
  valorCol?: number | string;
  tipoCol?: number | string;
  categoriaCol?: number | string;
  colunaData?: string;
  colunaDescricao?: string;
  colunaValor?: string;
  colunaTipo?: string;
  colunaCategoria?: string;
  delimitador?: string;
  formatoData?: string;
}

export interface CSVParsedRow {
  data: string;
  descricao: string;
  valor: number;
  tipo: TransactionType;
  categoriaId?: string;
  hash: string;
  isDuplicate: boolean;
  selected: boolean;
  isCreditIgnored?: boolean;
}

export interface CSVParsedTransaction extends CSVParsedRow {}

export interface CSVMappingTemplate {
  id: string;
  nomeModelo: string;
  colunaData?: string;
  colunaDescricao?: string;
  colunaValor?: string;
  colunaTipo?: string;
  colunaCategoria?: string;
  delimitador?: string;
  formatoData?: string;
  mapeamento?: CSVColumnMapping;
  createdAt: string;
}

export interface CSVImportRecord {
  id: string;
  nomeArquivo: string;
  contaId?: string | null;
  cartaoId?: string | null;
  totalTransacoes?: number;
  qtdTransacoes?: number;
  valorTotalCreditos?: number;
  valorTotalDebitos?: number;
  dataImportacao?: string;
  createdAt: string;
  account?: Account;
  creditCard?: CreditCard;
}

export interface CategorySummaryItem {
  category: Category;
  total: number;
  percentage: number;
}

export interface MonthlyCashFlowPoint {
  monthLabel: string;
  receitas: number;
  despesas: number;
  saldoLiquido: number;
}

export interface NetWorthEvolutionPoint {
  monthLabel: string;
  patrimonio: number;
}

export interface AccountDistributionPoint {
  accountName: string;
  color: string;
  balance: number;
  percentage: number;
}

export interface CardDistributionPoint {
  cardName: string;
  color: string;
  invoiceTotal: number;
  limit: number;
  percentage: number;
}

export interface DashboardSummary {
  balance: BalanceSummary;
  recentTransactions: Transaction[];
  topCategories: CategorySummaryItem[];
  accountsSummary: Account[];
  creditCardsSummary: CreditCard[];
  monthlyCashFlow: MonthlyCashFlowPoint[];
  netWorthEvolution: NetWorthEvolutionPoint[];
  accountDistribution: AccountDistributionPoint[];
  cardDistribution: CardDistributionPoint[];
  projectedBalance: number;
}
