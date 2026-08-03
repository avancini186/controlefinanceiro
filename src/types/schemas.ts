import { z } from 'zod';
import { TransactionType, TransactionStatus, AccountType, CategoryType, RecurrenceFrequency } from './enums';

// App Config Schema
export const appConfigSchema = z.object({
  moeda: z.string().min(1),
  primeiroDiaMes: z.number().min(1).max(31),
});
export type AppConfigFormData = z.infer<typeof appConfigSchema>;

// Category Schema
export const categorySchema = z.object({
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100),
  icone: z.string().min(1),
  cor: z.string().min(1),
  tipo: z.nativeEnum(CategoryType),
});
export type CategoryFormData = z.infer<typeof categorySchema>;

// Budget Category Schema
export const budgetCategorySchema = z.object({
  categoriaId: z.string().uuid('Categoria inválida'),
  limiteMensal: z.number().positive('O teto deve ser um valor positivo'),
  anoMes: z.string().regex(/^[0-9]{4}-(0[1-9]|1[0-2])$/, 'Formato deve ser YYYY-MM'),
});
export type BudgetCategoryFormData = z.infer<typeof budgetCategorySchema>;

// Account Schema
export const accountSchema = z.object({
  nome: z.string().min(2, 'Nome da conta é obrigatório').max(100),
  tipo: z.nativeEnum(AccountType),
  saldoInicial: z.number(),
  cor: z.string().min(1),
  icone: z.string().min(1),
  ativa: z.boolean(),
});
export type AccountFormData = z.infer<typeof accountSchema>;

// Credit Card Schema
export const creditCardSchema = z.object({
  nome: z.string().min(2, 'Nome do cartão é obrigatório').max(100),
  limite: z.number().positive('Limite deve ser positivo'),
  diaFechamento: z.number().min(1).max(31, 'Dia de fechamento inválido'),
  diaVencimento: z.number().min(1).max(31, 'Dia de vencimento inválido'),
  contaPadraoId: z.string().uuid().optional().nullable(),
  cor: z.string().min(1),
  icone: z.string().min(1),
});
export type CreditCardFormData = z.infer<typeof creditCardSchema>;

// Transaction Split Schema
export const transactionSplitSchema = z.object({
  categoryId: z.string().uuid('Categoria é obrigatória'),
  amount: z.number().positive('Valor deve ser maior que zero'),
  description: z.string().optional(),
});
export type TransactionSplitFormData = z.infer<typeof transactionSplitSchema>;

// Transaction Schema
export const transactionSchema = z.object({
  tipo: z.nativeEnum(TransactionType),
  valor: z.number().positive('Valor deve ser positivo'),
  data: z.string().min(1, 'Data é obrigatória'),
  categoriaId: z.string().uuid().optional().nullable(),
  contaId: z.string().uuid().optional().nullable(),
  cartaoId: z.string().uuid().optional().nullable(),
  descricao: z.string().min(2, 'Descrição é obrigatória'),
  observacao: z.string().optional().nullable(),
  status: z.nativeEnum(TransactionStatus),
  grupoParcelamentoId: z.string().uuid().optional().nullable(),
  numeroParcela: z.number().min(1).optional().nullable(),
  totalParcelas: z.number().min(2).optional().nullable(),
  splits: z.array(transactionSplitSchema).optional(),
}).refine(
  (data) => {
    if (data.splits && data.splits.length > 0) {
      const totalSplits = data.splits.reduce((sum, item) => sum + item.amount, 0);
      return Math.abs(totalSplits - data.valor) < 0.01;
    }
    return true;
  },
  {
    message: 'A soma dos splits deve ser exatamente igual ao valor total da transação',
    path: ['splits'],
  }
);
export type TransactionFormData = z.infer<typeof transactionSchema>;

// Transfer Request Schema
export const transferSchema = z.object({
  contaOrigemId: z.string().uuid('Selecione a conta de origem'),
  contaDestinoId: z.string().uuid('Selecione a conta de destino'),
  valor: z.number().positive('Valor da transferência deve ser positivo'),
  data: z.string().min(1, 'Data é obrigatória'),
  descricao: z.string().min(2, 'Descrição é obrigatória'),
  observacao: z.string().optional(),
}).refine((data) => data.contaOrigemId !== data.contaDestinoId, {
  message: 'A conta de origem e destino devem ser diferentes',
  path: ['contaDestinoId'],
});
export type TransferFormData = z.infer<typeof transferSchema>;

// Recurring Transaction Schema
export const recurringTransactionSchema = z.object({
  descricao: z.string().min(2, 'Descrição é obrigatória').max(255),
  tipo: z.enum([TransactionType.RECEITA, TransactionType.DESPESA]),
  valor: z.number().positive('O valor deve ser maior que zero'),
  categoriaId: z.string().uuid().optional().nullable(),
  contaId: z.string().uuid().optional().nullable(),
  cartaoId: z.string().uuid().optional().nullable(),
  dataInicio: z.string().min(1, 'Data inicial é obrigatória'),
  dataFim: z.string().optional().nullable(),
  frequencia: z.nativeEnum(RecurrenceFrequency),
  intervalo: z.number().min(1, 'Intervalo deve ser de pelo menos 1'),
  ativa: z.boolean(),
}).refine(
  (data) => {
    if (data.dataFim && data.dataInicio) {
      return data.dataFim >= data.dataInicio;
    }
    return true;
  },
  {
    message: 'Data final deve ser maior ou igual à data inicial',
    path: ['dataFim'],
  }
);
export type RecurringTransactionFormData = z.infer<typeof recurringTransactionSchema>;
