import { DataService } from '../DataService';
import { TransactionService } from './TransactionService';
import type { Transaction, InstallmentGroup } from '../../types';
import { TransactionStatus } from '../../types/enums';

export class InstallmentService {
  /**
   * Generates an installment group and creates N installment transactions spanning future months automatically.
   */
  static async createInstallmentPurchase(
    purchase: Omit<Transaction, 'id' | 'createdAt'>,
    totalParcelas: number
  ): Promise<{ group: InstallmentGroup; transactions: Transaction[] }> {
    if (totalParcelas < 2) {
      throw new Error('Compra parcelada deve ter no mínimo 2 parcelas');
    }

    const valorParcela = Number((purchase.valor / totalParcelas).toFixed(2));
    // Adjustment for decimal rounding on last installment
    const diferencaArredondamento = Number((purchase.valor - valorParcela * totalParcelas).toFixed(2));

    // 1. Create Installment Group
    const groupRow = await DataService.insert('grupos_parcelamento', {
      descricao: purchase.descricao,
      total_parcelas: totalParcelas,
      valor_total: purchase.valor,
    });

    const group: InstallmentGroup = {
      id: groupRow.id,
      descricao: groupRow.descricao,
      totalParcelas: groupRow.total_parcelas,
      valorTotal: Number(groupRow.valor_total),
      createdAt: groupRow.created_at,
    };

    // 2. Generate monthly transaction instances
    const createdTransactions: Transaction[] = [];
    const baseDate = new Date(purchase.data);

    for (let i = 1; i <= totalParcelas; i++) {
      const currentDate = new Date(baseDate);
      currentDate.setMonth(baseDate.getMonth() + (i - 1));

      // Add rounding difference to the first installment
      const val = i === 1 ? Number((valorParcela + diferencaArredondamento).toFixed(2)) : valorParcela;
      const formattedDate = currentDate.toISOString().split('T')[0];

      const tx = await TransactionService.create({
        ...purchase,
        valor: val,
        data: formattedDate,
        descricao: `${purchase.descricao} (${i}/${totalParcelas})`,
        grupoParcelamentoId: group.id,
        numeroParcela: i,
        totalParcelas: totalParcelas,
      });

      createdTransactions.push(tx);
    }

    return { group, transactions: createdTransactions };
  }

  /**
   * Cancels all pending installments in a group.
   */
  static async cancelInstallmentGroup(groupId: string): Promise<boolean> {
    const transactions = await DataService.selectAll('transacoes', {
      column: 'grupo_parcelamento_id',
      value: groupId,
    });

    for (const tx of transactions) {
      if (tx.status === TransactionStatus.PENDENTE) {
        await DataService.update('transacoes', tx.id, {
          status: TransactionStatus.CANCELADO,
        });
      }
    }
    return true;
  }

  /**
   * Deletes an entire installment group and all associated transactions.
   */
  static async deleteInstallmentGroup(groupId: string): Promise<boolean> {
    const transactions = await DataService.selectAll('transacoes', {
      column: 'grupo_parcelamento_id',
      value: groupId,
    });

    for (const tx of transactions) {
      await DataService.delete('transacoes', tx.id);
    }

    return await DataService.delete('grupos_parcelamento', groupId);
  }
}
