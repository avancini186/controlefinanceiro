export const TransactionType = {
  RECEITA: 'RECEITA',
  DESPESA: 'DESPESA',
  TRANSFERENCIA: 'TRANSFERENCIA',
} as const;
export type TransactionType = typeof TransactionType[keyof typeof TransactionType];

export const TransactionStatus = {
  PENDENTE: 'PENDENTE',
  CONCLUIDO: 'CONCLUIDO',
  CANCELADO: 'CANCELADO',
} as const;
export type TransactionStatus = typeof TransactionStatus[keyof typeof TransactionStatus];

export const AccountType = {
  CONTA_CORRENTE: 'CONTA_CORRENTE',
  POUPANCA: 'POUPANCA',
  INVESTIMENTO: 'INVESTIMENTO',
  CARTEIRA: 'CARTEIRA',
  OUTROS: 'OUTROS',
} as const;
export type AccountType = typeof AccountType[keyof typeof AccountType];

export const CategoryType = {
  RECEITA: 'RECEITA',
  DESPESA: 'DESPESA',
} as const;
export type CategoryType = typeof CategoryType[keyof typeof CategoryType];

export const RecurrenceFrequency = {
  DIARIA: 'DIARIA',
  SEMANAL: 'SEMANAL',
  QUINZENAL: 'QUINZENAL',
  MENSAL: 'MENSAL',
  BIMESTRAL: 'BIMESTRAL',
  TRIMESTRAL: 'TRIMESTRAL',
  SEMESTRAL: 'SEMESTRAL',
  ANUAL: 'ANUAL',
} as const;
export type RecurrenceFrequency = typeof RecurrenceFrequency[keyof typeof RecurrenceFrequency];
