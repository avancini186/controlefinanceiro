import { DataService } from '../DataService';
import { TransactionService } from './TransactionService';
import { CreditCardService } from './CreditCardService';
import { CreditCardBillingService } from './CreditCardBillingService';
import type { Transaction, InstallmentGroup, TransactionSplit } from '../../types';
import { TransactionStatus } from '../../types/enums';
import { extractBaseDescription, buildInstallmentDescription } from '../../utils/installmentParser';

export class InstallmentService {
  /**
   * Generates an installment group and creates N installment transactions spanning future months automatically.
   */
  static async createInstallmentPurchase(
    purchase: Omit<Transaction, 'id' | 'createdAt'>,
    totalParcelas: number,
    splits?: Omit<TransactionSplit, 'id' | 'transactionId'>[]
  ): Promise<{ group: InstallmentGroup; transactions: Transaction[] }> {
    if (totalParcelas < 2) {
      throw new Error('Compra parcelada deve ter no mínimo 2 parcelas');
    }

    let diaFechamento = 1;
    let diaVencimento = 10;
    if (purchase.cartaoId) {
      const card = await CreditCardService.getById(purchase.cartaoId);
      if (card) {
        diaFechamento = card.diaFechamento;
        diaVencimento = card.diaVencimento;
      }
    }

    const schedule = CreditCardBillingService.generateInstallmentSchedule(
      purchase.data,
      totalParcelas,
      purchase.valor,
      diaFechamento,
      diaVencimento
    );

    const baseDesc = extractBaseDescription(purchase.descricao);

    // 1. Create Installment Group
    const groupRow = await DataService.insert('grupos_parcelamento', {
      descricao: baseDesc,
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

    for (const item of schedule) {
      const desc = buildInstallmentDescription(baseDesc, item.numeroParcela, totalParcelas);
      const tx = await TransactionService.create(
        {
          ...purchase,
          valor: item.valor,
          data: item.data,
          descricao: desc,
          grupoParcelamentoId: group.id,
          numeroParcela: item.numeroParcela,
          totalParcelas: totalParcelas,
          faturaCompetencia: item.faturaCompetencia,
          faturaAno: item.faturaAno,
          faturaMes: item.faturaMes,
          faturaVencimento: item.faturaVencimento,
        },
        splits
      );

      createdTransactions.push(tx);
    }

    return { group, transactions: createdTransactions };
  }

  /**
   * Updates an entire installment group and recalculates all installment transactions.
   */
  static async updateInstallmentPurchase(
    identifier: string,
    updatedPurchase: Omit<Transaction, 'id' | 'createdAt'>,
    totalParcelas: number,
    splits?: TransactionSplit[]
  ): Promise<{ group: InstallmentGroup; transactions: Transaction[] }> {
    if (totalParcelas < 1) {
      throw new Error('Quantidade de parcelas deve ser no mínimo 1');
    }

    // 1. Resolve groupId
    let groupId = identifier;
    let existingTxs = await DataService.selectAll('transacoes', {
      column: 'grupo_parcelamento_id',
      value: groupId,
    });

    if (existingTxs.length === 0) {
      const txRow = await DataService.selectById('transacoes', identifier);
      if (txRow && txRow.grupo_parcelamento_id) {
        groupId = txRow.grupo_parcelamento_id;
        existingTxs = await DataService.selectAll('transacoes', {
          column: 'grupo_parcelamento_id',
          value: groupId,
        });
      } else if (txRow) {
        // Simple transaction converting to installment purchase
        const newGroupResult = await this.createInstallmentPurchase(updatedPurchase, totalParcelas, splits);
        await DataService.delete('transacoes', identifier);
        return newGroupResult;
      } else {
        throw new Error(`Grupo de parcelamento ou transação não encontrada: ${identifier}`);
      }
    }

    // Sort existing transactions by numero_parcela ascending
    existingTxs.sort((a, b) => Number(a.numero_parcela || 0) - Number(b.numero_parcela || 0));

    // 2. Fetch Card closing/due dates
    let diaFechamento = 1;
    let diaVencimento = 10;
    if (updatedPurchase.cartaoId) {
      const card = await CreditCardService.getById(updatedPurchase.cartaoId);
      if (card) {
        diaFechamento = card.diaFechamento;
        diaVencimento = card.diaVencimento;
      }
    }

    // 3. Generate updated schedule
    const schedule = CreditCardBillingService.generateInstallmentSchedule(
      updatedPurchase.data,
      totalParcelas,
      updatedPurchase.valor,
      diaFechamento,
      diaVencimento
    );

    const baseDesc = extractBaseDescription(updatedPurchase.descricao);

    // 4. Update Installment Group row
    await DataService.update('grupos_parcelamento', groupId, {
      descricao: baseDesc,
      total_parcelas: totalParcelas,
      valor_total: updatedPurchase.valor,
    });

    const groupRow = await DataService.selectById('grupos_parcelamento', groupId);
    const group: InstallmentGroup = {
      id: groupId,
      descricao: groupRow?.descricao || baseDesc,
      totalParcelas: groupRow?.total_parcelas ? Number(groupRow.total_parcelas) : totalParcelas,
      valorTotal: groupRow?.valor_total ? Number(groupRow.valor_total) : updatedPurchase.valor,
      createdAt: groupRow?.created_at || new Date().toISOString(),
    };

    const updatedTransactions: Transaction[] = [];
    const oldCount = existingTxs.length;

    for (let i = 0; i < schedule.length; i++) {
      const item = schedule[i];
      const desc = buildInstallmentDescription(baseDesc, item.numeroParcela, totalParcelas);

      if (i < oldCount) {
        const existingId = existingTxs[i].id;
        await DataService.update('transacoes', existingId, {
          tipo: updatedPurchase.tipo,
          valor: item.valor,
          data: item.data,
          categoria_id: updatedPurchase.categoriaId || null,
          conta_id: updatedPurchase.contaId || null,
          cartao_id: updatedPurchase.cartaoId || null,
          descricao: desc,
          observacao: updatedPurchase.observacao || null,
          numero_parcela: item.numeroParcela,
          total_parcelas: totalParcelas,
          fatura_competencia: item.faturaCompetencia,
          fatura_ano: item.faturaAno,
          fatura_mes: item.faturaMes,
          fatura_vencimento: item.faturaVencimento,
        });

        if (splits !== undefined) {
          const existingSplits = await DataService.selectAll('transacoes_splits', {
            column: 'transacao_id',
            value: existingId,
          });
          for (const s of existingSplits) {
            await DataService.delete('transacoes_splits', s.id);
          }
          if (splits.length > 0) {
            const splitRecords = splits.map((s) => ({
              transacao_id: existingId,
              categoria_id: s.categoryId,
              valor: s.amount,
              descricao: s.description || null,
            }));
            await DataService.insertMany('transacoes_splits', splitRecords);
          }
        }

        const tx = await TransactionService.getById(existingId);
        if (tx) updatedTransactions.push(tx);
      } else {
        const tx = await TransactionService.create(
          {
            ...updatedPurchase,
            valor: item.valor,
            data: item.data,
            descricao: desc,
            grupoParcelamentoId: groupId,
            numeroParcela: item.numeroParcela,
            totalParcelas: totalParcelas,
            faturaCompetencia: item.faturaCompetencia,
            faturaAno: item.faturaAno,
            faturaMes: item.faturaMes,
            faturaVencimento: item.faturaVencimento,
          },
          splits
        );
        updatedTransactions.push(tx);
      }
    }

    if (oldCount > totalParcelas) {
      for (let i = totalParcelas; i < oldCount; i++) {
        await DataService.delete('transacoes', existingTxs[i].id);
      }
    }

    return { group, transactions: updatedTransactions };
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
