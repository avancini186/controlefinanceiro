import { TransactionService } from './TransactionService';
import { DataService } from '../DataService';
import type { TransferRequest, Transaction } from '../../types';
import { TransactionType, TransactionStatus } from '../../types/enums';

export class TransferService {
  /**
   * Executes a transfer between two accounts by creating paired entry/exit transactions linked by transferGroupId and explicit direcaoTransferencia.
   */
  static async executeTransfer(request: TransferRequest): Promise<{ debit: Transaction; credit: Transaction }> {
    if (request.contaOrigemId === request.contaDestinoId) {
      throw new Error('A conta de origem e de destino não podem ser iguais');
    }

    const transferGroupId = crypto.randomUUID();

    // 1. Debit Transaction (Saída da conta origem) - direcaoTransferencia: 'SAIDA'
    const debit = await TransactionService.create({
      tipo: TransactionType.TRANSFERENCIA,
      valor: request.valor,
      data: request.data,
      contaId: request.contaOrigemId,
      descricao: request.descricao,
      observacao: request.observacao,
      status: TransactionStatus.CONCLUIDO,
      transferGroupId: transferGroupId,
      direcaoTransferencia: 'SAIDA',
    });

    // 2. Credit Transaction (Entrada na conta destino) - direcaoTransferencia: 'ENTRADA'
    const credit = await TransactionService.create({
      tipo: TransactionType.TRANSFERENCIA,
      valor: request.valor,
      data: request.data,
      contaId: request.contaDestinoId,
      descricao: request.descricao,
      observacao: request.observacao,
      status: TransactionStatus.CONCLUIDO,
      transferGroupId: transferGroupId,
      direcaoTransferencia: 'ENTRADA',
    });

    return { debit, credit };
  }

  /**
   * Reverts/cancels a transfer by setting status of both paired transactions to CANCELADO.
   */
  static async revertTransfer(transferGroupId: string): Promise<boolean> {
    const paired = await DataService.selectAll('transacoes', {
      column: 'transfer_group_id',
      value: transferGroupId,
    });

    for (const tx of paired) {
      await DataService.update('transacoes', tx.id, {
        status: TransactionStatus.CANCELADO,
      });
    }
    return true;
  }

  /**
   * Deletes both transactions associated with a transferGroupId.
   */
  static async deleteTransfer(transferGroupId: string): Promise<boolean> {
    const paired = await DataService.selectAll('transacoes', {
      column: 'transfer_group_id',
      value: transferGroupId,
    });

    for (const tx of paired) {
      await DataService.delete('transacoes', tx.id);
    }
    return true;
  }
}
