import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransferService } from '../../services/financial/TransferService';
import { DataService } from '../../services/DataService';

vi.mock('../../services/DataService');

describe('TransferService - Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create paired transfer transactions with structured ENTRADA and SAIDA directions', async () => {
    let callCount = 0;
    vi.mocked(DataService.insert).mockImplementation(async (_table, record: any) => {
      callCount++;
      return { id: `tx_trf_${callCount}`, ...record } as any;
    });

    const result = await TransferService.executeTransfer({
      contaOrigemId: 'acc_itaú',
      contaDestinoId: 'acc_nubank',
      valor: 500,
      data: '2026-08-01',
      descricao: 'Transferência para Poupança',
    });

    expect(result.debit.contaId).toBe('acc_itaú');
    expect(result.debit.direcaoTransferencia).toBe('SAIDA');
    expect(result.debit.valor).toBe(500);

    expect(result.credit.contaId).toBe('acc_nubank');
    expect(result.credit.direcaoTransferencia).toBe('ENTRADA');
    expect(result.credit.valor).toBe(500);

    expect(result.debit.transferGroupId).toBe(result.credit.transferGroupId);
  });
});
