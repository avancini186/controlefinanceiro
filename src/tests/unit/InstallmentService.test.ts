import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InstallmentService } from '../../services/financial/InstallmentService';
import { DataService } from '../../services/DataService';
import { TransactionType, TransactionStatus } from '../../types/enums';

vi.mock('../../services/DataService');

describe('InstallmentService - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create installment group and distribute cent remainder on the first installment', async () => {
    vi.mocked(DataService.insert).mockImplementation(async (table, record: any) => {
      if (table === 'grupos_parcelamento') {
        return {
          id: 'grp1',
          descricao: 'Compra Notebook',
          total_parcelas: 3,
          valor_total: 100,
          created_at: new Date().toISOString(),
        } as any;
      }
      return { id: 'tx_' + Math.random(), ...record } as any;
    });

    vi.mocked(DataService.insertMany).mockImplementation(async (_table, records: any) => {
      return records.map((r: any, idx: number) => ({ id: `tx_${idx}`, ...r }));
    });

    const result = await InstallmentService.createInstallmentPurchase(
      {
        tipo: TransactionType.DESPESA,
        valor: 100,
        data: '2026-08-01',
        descricao: 'Compra Notebook',
        status: TransactionStatus.CONCLUIDO,
      },
      3
    );

    expect(result.group.id).toBe('grp1');
    expect(result.transactions).toHaveLength(3);

    // First installment should carry remainder (33.34)
    expect(result.transactions[0].valor).toBe(33.34);
    expect(result.transactions[1].valor).toBe(33.33);
    expect(result.transactions[2].valor).toBe(33.33);

    // Sum must equal exact total amount (100.00)
    const sum = result.transactions.reduce((acc, curr) => acc + curr.valor, 0);
    expect(Number(sum.toFixed(2))).toBe(100.0);
  });
});
