import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InstallmentService } from '../../services/financial/InstallmentService';
import { DataService } from '../../services/DataService';
import { TransactionType, TransactionStatus } from '../../types/enums';

vi.mock('../../services/DataService');
vi.mock('../../services/financial/CreditCardService', () => ({
  CreditCardService: {
    getById: vi.fn(async (id: string) => {
      if (id === 'card_visa') {
        return { id: 'card_visa', nome: 'Visa', diaFechamento: 3, diaVencimento: 10 };
      }
      if (id === 'card_master') {
        return { id: 'card_master', nome: 'Mastercard', diaFechamento: 20, diaVencimento: 5 };
      }
      return null;
    }),
  },
}));

describe('InstallmentService - Unit Tests', () => {
  let db: {
    grupos_parcelamento: Record<string, any>;
    transacoes: Record<string, any>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    db = {
      grupos_parcelamento: {},
      transacoes: {},
    };

    vi.mocked(DataService.insert).mockImplementation(async (table: string, record: any) => {
      const id = record.id || `${table}_${Math.random().toString(36).substring(2, 9)}`;
      const row = { id, created_at: new Date().toISOString(), ...record };
      db[table as keyof typeof db][id] = row;
      return row as any;
    });

    vi.mocked(DataService.selectById).mockImplementation(async (table: any, id: string | number) => {
      return db[table as keyof typeof db][String(id)] || null;
    });

    vi.mocked(DataService.selectAll).mockImplementation(async (table: any, filter?: any) => {
      const rows = Object.values(db[table as keyof typeof db] || {});
      if (!filter) return rows as any;
      return rows.filter((r) => r[filter.column] === filter.value) as any;
    });

    vi.mocked(DataService.update).mockImplementation(async (table: any, id: string | number, updates: any) => {
      const idStr = String(id);
      if (!db[table as keyof typeof db][idStr]) {
        db[table as keyof typeof db][idStr] = { id: idStr };
      }
      Object.assign(db[table as keyof typeof db][idStr], updates);
      return db[table as keyof typeof db][idStr] as any;
    });

    vi.mocked(DataService.delete).mockImplementation(async (table: any, id: string | number) => {
      delete db[table as keyof typeof db][String(id)];
      return true;
    });
  });

  it('1. should create installment group and distribute cent remainder on the first installment', async () => {
    const result = await InstallmentService.createInstallmentPurchase(
      {
        tipo: TransactionType.DESPESA,
        valor: 100,
        data: '2026-08-01',
        descricao: 'Compra Notebook',
        status: TransactionStatus.CONCLUIDO,
        cartaoId: 'card_visa',
      },
      3
    );

    expect(result.group.id).toBeTruthy();
    expect(result.transactions).toHaveLength(3);

    // First installment carries rounding remainder (33.34)
    expect(result.transactions[0].valor).toBe(33.34);
    expect(result.transactions[1].valor).toBe(33.33);
    expect(result.transactions[2].valor).toBe(33.33);

    // Sum equals exact total amount
    const sum = result.transactions.reduce((acc, curr) => acc + curr.valor, 0);
    expect(Number(sum.toFixed(2))).toBe(100.0);
  });

  it('2. should edit a 4x purchase changing only the purchase date', async () => {
    // Initial 4x purchase on 2026-06-23 (Card Visa: closing 3, due 10 -> starts in July fatura)
    const initial = await InstallmentService.createInstallmentPurchase(
      {
        tipo: TransactionType.DESPESA,
        valor: 400,
        data: '2026-06-23',
        descricao: 'TV Sala',
        status: TransactionStatus.CONCLUIDO,
        cartaoId: 'card_visa',
      },
      4
    );

    expect(initial.transactions[0].faturaCompetencia).toBe('2026-07');
    expect(initial.transactions[3].faturaCompetencia).toBe('2026-10');

    // Update date to 04/07/2026 (after closing day 3 -> starts in August fatura)
    const updated = await InstallmentService.updateInstallmentPurchase(
      initial.group.id,
      {
        tipo: TransactionType.DESPESA,
        valor: 400,
        data: '2026-07-04',
        descricao: 'TV Sala',
        status: TransactionStatus.CONCLUIDO,
        cartaoId: 'card_visa',
      },
      4
    );

    expect(updated.transactions).toHaveLength(4);
    expect(updated.transactions[0].data).toBe('2026-07-04');
    expect(updated.transactions[0].faturaCompetencia).toBe('2026-08');
    expect(updated.transactions[1].faturaCompetencia).toBe('2026-09');
    expect(updated.transactions[2].faturaCompetencia).toBe('2026-10');
    expect(updated.transactions[3].faturaCompetencia).toBe('2026-11');
  });

  it('3. should edit purchase changing credit card', async () => {
    // Initial with Visa (closing 3, due 10)
    const initial = await InstallmentService.createInstallmentPurchase(
      {
        tipo: TransactionType.DESPESA,
        valor: 600,
        data: '2026-07-04',
        descricao: 'Smartphone',
        status: TransactionStatus.CONCLUIDO,
        cartaoId: 'card_visa',
      },
      3
    );

    expect(initial.transactions[0].faturaCompetencia).toBe('2026-08');

    // Change card to Mastercard (closing 20, due 5)
    // On 04/07, day 4 <= 20 -> faturaCompetencia is 2026-07, faturaVencimento is 2026-08-05
    const updated = await InstallmentService.updateInstallmentPurchase(
      initial.group.id,
      {
        tipo: TransactionType.DESPESA,
        valor: 600,
        data: '2026-07-04',
        descricao: 'Smartphone',
        status: TransactionStatus.CONCLUIDO,
        cartaoId: 'card_master',
      },
      3
    );

    expect(updated.transactions[0].cartaoId).toBe('card_master');
    expect(updated.transactions[0].faturaCompetencia).toBe('2026-07');
    expect(updated.transactions[0].faturaVencimento).toBe('2026-08-05');
  });

  it('4. should edit purchase changing total amount and recalculating rounding', async () => {
    const initial = await InstallmentService.createInstallmentPurchase(
      {
        tipo: TransactionType.DESPESA,
        valor: 1200,
        data: '2026-07-10',
        descricao: 'Geladeira',
        status: TransactionStatus.CONCLUIDO,
        cartaoId: 'card_visa',
      },
      4
    );

    expect(initial.transactions[0].valor).toBe(300);

    // Update total amount to R$ 900
    const updated = await InstallmentService.updateInstallmentPurchase(
      initial.group.id,
      {
        tipo: TransactionType.DESPESA,
        valor: 900,
        data: '2026-07-10',
        descricao: 'Geladeira',
        status: TransactionStatus.CONCLUIDO,
        cartaoId: 'card_visa',
      },
      4
    );

    expect(updated.transactions[0].valor).toBe(225);
    expect(updated.transactions[1].valor).toBe(225);
    expect(updated.transactions[2].valor).toBe(225);
    expect(updated.transactions[3].valor).toBe(225);
  });

  it('5. should edit purchase increasing installment count (4x -> 6x)', async () => {
    const initial = await InstallmentService.createInstallmentPurchase(
      {
        tipo: TransactionType.DESPESA,
        valor: 1200,
        data: '2026-07-10',
        descricao: 'Sofá',
        status: TransactionStatus.CONCLUIDO,
        cartaoId: 'card_visa',
      },
      4
    );

    expect(initial.transactions).toHaveLength(4);

    const updated = await InstallmentService.updateInstallmentPurchase(
      initial.group.id,
      {
        tipo: TransactionType.DESPESA,
        valor: 1200,
        data: '2026-07-10',
        descricao: 'Sofá',
        status: TransactionStatus.CONCLUIDO,
        cartaoId: 'card_visa',
      },
      6
    );

    expect(updated.transactions).toHaveLength(6);
    expect(updated.transactions[0].valor).toBe(200);
    expect(updated.transactions[5].numeroParcela).toBe(6);
    expect(updated.transactions[5].totalParcelas).toBe(6);
  });

  it('6. should edit purchase reducing installment count (10x -> 6x) keeping remaining intact', async () => {
    const initial = await InstallmentService.createInstallmentPurchase(
      {
        tipo: TransactionType.DESPESA,
        valor: 1000,
        data: '2026-07-10',
        descricao: 'Armário',
        status: TransactionStatus.CONCLUIDO,
        cartaoId: 'card_visa',
      },
      10
    );

    expect(initial.transactions).toHaveLength(10);

    const updated = await InstallmentService.updateInstallmentPurchase(
      initial.group.id,
      {
        tipo: TransactionType.DESPESA,
        valor: 600,
        data: '2026-07-10',
        descricao: 'Armário',
        status: TransactionStatus.CONCLUIDO,
        cartaoId: 'card_visa',
      },
      6
    );

    expect(updated.transactions).toHaveLength(6);
    // Group total parcelas in db must be 6
    expect(updated.group.totalParcelas).toBe(6);
  });

  it('7. should edit purchase changing category for all installments', async () => {
    const initial = await InstallmentService.createInstallmentPurchase(
      {
        tipo: TransactionType.DESPESA,
        valor: 300,
        data: '2026-07-10',
        descricao: 'Mesa de Escritório',
        categoriaId: 'cat_antiga',
        status: TransactionStatus.CONCLUIDO,
        cartaoId: 'card_visa',
      },
      3
    );

    const updated = await InstallmentService.updateInstallmentPurchase(
      initial.group.id,
      {
        tipo: TransactionType.DESPESA,
        valor: 300,
        data: '2026-07-10',
        descricao: 'Mesa de Escritório',
        categoriaId: 'cat_nova',
        status: TransactionStatus.CONCLUIDO,
        cartaoId: 'card_visa',
      },
      3
    );

    expect(updated.transactions[0].categoriaId).toBe('cat_nova');
    expect(updated.transactions[1].categoriaId).toBe('cat_nova');
    expect(updated.transactions[2].categoriaId).toBe('cat_nova');
  });

  it('8. should calculate purchase before, on, and after closing date correctly', async () => {
    // Before closing (02/07, closing 3)
    const pBefore = await InstallmentService.createInstallmentPurchase(
      {
        tipo: TransactionType.DESPESA,
        valor: 200,
        data: '2026-07-02',
        descricao: 'Antes Fechamento',
        status: TransactionStatus.CONCLUIDO,
        cartaoId: 'card_visa',
      },
      2
    );
    expect(pBefore.transactions[0].faturaCompetencia).toBe('2026-07');

    // On closing day (03/07, closing 3)
    const pOn = await InstallmentService.createInstallmentPurchase(
      {
        tipo: TransactionType.DESPESA,
        valor: 200,
        data: '2026-07-03',
        descricao: 'No Fechamento',
        status: TransactionStatus.CONCLUIDO,
        cartaoId: 'card_visa',
      },
      2
    );
    expect(pOn.transactions[0].faturaCompetencia).toBe('2026-07');

    // After closing (04/07, closing 3)
    const pAfter = await InstallmentService.createInstallmentPurchase(
      {
        tipo: TransactionType.DESPESA,
        valor: 200,
        data: '2026-07-04',
        descricao: 'Após Fechamento',
        status: TransactionStatus.CONCLUIDO,
        cartaoId: 'card_visa',
      },
      2
    );
    expect(pAfter.transactions[0].faturaCompetencia).toBe('2026-08');
  });
});
