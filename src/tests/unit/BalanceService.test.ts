import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BalanceService } from '../../services/financial/BalanceService';
import { DataService } from '../../services/DataService';
import { TransactionType, TransactionStatus, AccountType } from '../../types/enums';

vi.mock('../../services/DataService');

describe('BalanceService - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should calculate account balance correctly including initial balance and transactions', async () => {
    vi.mocked(DataService.selectById).mockResolvedValue({
      id: 'acc1',
      nome: 'Itaú',
      tipo: 'CONTA_CORRENTE' as AccountType,
      saldo_inicial: 500,
      saldo_atual: 500,
      cor: '#000',
      icone: 'Wallet',
      ativa: true,
      created_at: new Date().toISOString(),
    });

    vi.mocked(DataService.getTransactionsWithSplitsAndCategory).mockResolvedValue([
      {
        id: 'tx1',
        tipo: TransactionType.RECEITA,
        valor: 200,
        data: '2026-08-01',
        conta_id: 'acc1',
        categoria_id: null,
        cartao_id: null,
        descricao: 'Teste Entrada',
        observacao: null,
        status: TransactionStatus.CONCLUIDO,
        grupo_parcelamento_id: null,
        numero_parcela: null,
        total_parcelas: null,
        transfer_group_id: null,
        direcao_transferencia: null,
        import_hash: null,
        conciliada: false,
        data_conciliacao: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 'tx2',
        tipo: TransactionType.DESPESA,
        valor: 50,
        data: '2026-08-02',
        conta_id: 'acc1',
        categoria_id: null,
        cartao_id: null,
        descricao: 'Teste Saída',
        observacao: null,
        status: TransactionStatus.CONCLUIDO,
        grupo_parcelamento_id: null,
        numero_parcela: null,
        total_parcelas: null,
        transfer_group_id: null,
        direcao_transferencia: null,
        import_hash: null,
        conciliada: false,
        data_conciliacao: null,
        created_at: new Date().toISOString(),
      },
    ]);

    const balance = await BalanceService.calculateAccountBalance('acc1');
    // 500 + 200 - 50 = 650
    expect(balance).toBe(650);
  });

  it('should ignore PENDENTE transactions in completed account balance calculation', async () => {
    vi.mocked(DataService.selectById).mockResolvedValue({
      id: 'acc1',
      nome: 'Itaú',
      tipo: 'CONTA_CORRENTE' as AccountType,
      saldo_inicial: 100,
      saldo_atual: 100,
      cor: '#000',
      icone: 'Wallet',
      ativa: true,
      created_at: new Date().toISOString(),
    });

    vi.mocked(DataService.getTransactionsWithSplitsAndCategory).mockResolvedValue([
      {
        id: 'tx1',
        tipo: TransactionType.RECEITA,
        valor: 500,
        data: '2026-08-01',
        conta_id: 'acc1',
        categoria_id: null,
        cartao_id: null,
        descricao: 'Pendente',
        observacao: null,
        status: TransactionStatus.PENDENTE,
        grupo_parcelamento_id: null,
        numero_parcela: null,
        total_parcelas: null,
        transfer_group_id: null,
        direcao_transferencia: null,
        import_hash: null,
        conciliada: false,
        data_conciliacao: null,
        created_at: new Date().toISOString(),
      },
    ]);

    const balance = await BalanceService.calculateAccountBalance('acc1');
    expect(balance).toBe(100);
  });

  it('should calculate global summary balance across all accounts and credit cards', async () => {
    vi.mocked(DataService.selectAll).mockImplementation(async (table) => {
      if (table === 'contas') {
        return [
          { id: 'acc1', nome: 'Itaú', saldo_inicial: 1000, ativa: true },
          { id: 'acc2', nome: 'Nubank', saldo_inicial: 500, ativa: true },
        ] as any;
      }
      if (table === 'cartoes') {
        return [] as any;
      }
      return [] as any;
    });

    vi.mocked(DataService.selectById).mockImplementation(async (_table, id) => {
      if (id === 'acc1') return { id: 'acc1', saldo_inicial: 1000, ativa: true } as any;
      if (id === 'acc2') return { id: 'acc2', saldo_inicial: 500, ativa: true } as any;
      return null;
    });

    vi.mocked(DataService.getTransactionsWithSplitsAndCategory).mockResolvedValue([]);

    const summary = await BalanceService.calculateSummary();
    expect(summary.saldoTotal).toBe(1500);
    expect(summary.totalReceitas).toBe(0);
    expect(summary.totalDespesas).toBe(0);
  });
});
