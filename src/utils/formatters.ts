export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  if (!year || !month || !day) return dateString;
  return `${day}/${month}/${year}`;
};

export const getCurrentMonthDates = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  return { firstDay, lastDay, currentMonthYear: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` };
};

export const formatMonthYear = (dateStr?: string): string => {
  const date = dateStr ? new Date(dateStr) : new Date();
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
};

export const getTransactionDisplayStatus = (tx: {
  status?: string;
  numeroParcela?: number | null;
  totalParcelas?: number | null;
}): { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' } => {
  if (tx.status === 'CANCELADO') {
    return { label: 'CANCELADO', variant: 'danger' };
  }

  const numParc = tx.numeroParcela;
  const totParc = tx.totalParcelas;

  if (totParc && totParc > 1) {
    if (numParc && numParc >= totParc) {
      return { label: 'CONCLUÍDO', variant: 'success' };
    }
    return { label: 'EM ANDAMENTO', variant: 'warning' };
  }

  if (tx.status === 'PENDENTE') {
    return { label: 'PENDENTE', variant: 'warning' };
  }

  return { label: 'CONCLUÍDO', variant: 'success' };
};
