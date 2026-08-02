import { DataService } from '../dataService';
import { TransactionType, type InstallmentGroup, type Transaction, type CreateInstallmentParams } from '../../types';

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
   */
  static async createInstallmentPurchase(params: CreateInstallmentParams): Promise<void> {
    const { 
      description, 
      total_amount, 
      installments_count, 
      first_date, 
      category_id, 
      card_id, 
      observation 
    } = params;

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
    const startDate = new Date(first_date + 'T00:00:00');

    for (let i = 0; i < installments_count; i++) {
      const installmentDate = new Date(startDate);
      installmentDate.setMonth(startDate.getMonth() + i);

      // Add remainder rounding to the first installment
      const installmentAmount = i === 0 
        ? Number((baseAmount + remainder).toFixed(2)) 
        : Number(baseAmount.toFixed(2));

      transactionsToInsert.push({
        id: crypto.randomUUID(),
        type: TransactionType.EXPENSE,
        amount: installmentAmount,
        date: installmentDate.toISOString().split('T')[0],
        category_id,
        card_id,
        description: `${description.trim()} (${i + 1}/${installments_count})`,
        observation: observation?.trim() || undefined,
        installment_group_id: groupId,
        installment_number: `${i + 1}/${installments_count}`
      });
    }

    return DataService.insertInstallmentGroupAndTransactions(installmentGroup, transactionsToInsert);
  }

  static async deleteInstallmentGroup(groupId: string): Promise<void> {
    return DataService.deleteInstallmentGroup(groupId);
  }
}
