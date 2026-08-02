import { DataService } from '../dataService';
import { TransactionType, type InstallmentGroup, type Transaction, type CreateInstallmentParams, type TransactionSplit } from '../../types';

export type { CreateInstallmentParams };

/**
 * InstallmentService - Domain business logic for multi-installment purchases
 */
export class InstallmentService {
  /**
   * Business Logic for Multi-Installment Purchase:
   * 1. Generates InstallmentGroup entity
   * 2. Calculates exact installment distribution & rounding remainder
   * 3. Prepares N monthly transactions starting from first_date
   * 4. If splits are provided, attaches proportional splits to each installment transaction
   */
  static async createInstallmentPurchase(params: CreateInstallmentParams): Promise<void> {
    const { 
      description, 
      total_amount, 
      installments_count, 
      first_date, 
      category_id, 
      card_id, 
      observation,
      splits 
    } = params;

    const hasSplits = Boolean(splits && splits.length > 0);
    const groupId = crypto.randomUUID();
    const installmentGroup: InstallmentGroup = {
      id: groupId,
      description: description.trim(),
      total_amount: Number(total_amount),
      installments_count: Number(installments_count),
      created_at: new Date().toISOString()
    };

    // Calculate installment values & remainder rounding
    const baseAmount = Math.floor((total_amount / installments_count) * 100) / 100;
    const remainder = Math.round((total_amount - (baseAmount * installments_count)) * 100) / 100;

    const transactionsToInsert: Transaction[] = [];
    const splitsToInsert: { transactionId: string; splits: Omit<TransactionSplit, 'id' | 'transaction_id'>[] }[] = [];
    const startDate = new Date(first_date + 'T00:00:00');

    for (let i = 0; i < installments_count; i++) {
      const installmentDate = new Date(startDate);
      installmentDate.setMonth(startDate.getMonth() + i);

      // Add remainder rounding to the first installment
      const installmentAmount = i === 0 
        ? Number((baseAmount + remainder).toFixed(2)) 
        : Number(baseAmount.toFixed(2));

      const txId = crypto.randomUUID();
      transactionsToInsert.push({
        id: txId,
        type: TransactionType.EXPENSE,
        amount: installmentAmount,
        date: installmentDate.toISOString().split('T')[0],
        category_id: hasSplits ? splits![0].category_id : category_id,
        card_id,
        description: `${description.trim()} (${i + 1}/${installments_count})`,
        observation: observation?.trim() || undefined,
        installment_group_id: groupId,
        installment_number: `${i + 1}/${installments_count}`,
        is_split: hasSplits,
      });

      if (hasSplits && splits) {
        // Calculate proportional splits for this installment
        const ratio = installmentAmount / total_amount;
        let runningSplitSum = 0;

        const proportionalSplits = splits.map((s, sIndex) => {
          if (sIndex === splits.length - 1) {
            // Last split gets exact remaining difference to ensure exact sum matching installmentAmount
            const lastAmount = Number((installmentAmount - runningSplitSum).toFixed(2));
            return {
              category_id: s.category_id,
              amount: lastAmount,
              description: s.description?.trim() || undefined,
            };
          }

          const propAmount = Number((s.amount * ratio).toFixed(2));
          runningSplitSum += propAmount;
          return {
            category_id: s.category_id,
            amount: propAmount,
            description: s.description?.trim() || undefined,
          };
        });

        splitsToInsert.push({ transactionId: txId, splits: proportionalSplits });
      }
    }

    await DataService.insertInstallmentGroupAndTransactions(installmentGroup, transactionsToInsert);

    if (splitsToInsert.length > 0) {
      for (const item of splitsToInsert) {
        await DataService.saveTransactionSplits(item.transactionId, item.splits);
      }
    }
  }

  static async deleteInstallmentGroup(groupId: string): Promise<void> {
    return DataService.deleteInstallmentGroup(groupId);
  }
}
