import { DataService } from '../DataService';
import { CreditCardService } from './CreditCardService';
import { CreditCardBillingService } from './CreditCardBillingService';
import type { Transaction, TransactionSplit } from '../../types';
import { TransactionType, TransactionStatus, CategoryType } from '../../types/enums';

export class TransactionService {
  /**
   * Retrieves all transactions with rich relationships (category, account, card, splits).
   */
  static async getAll(filter?: { startDate?: string; endDate?: string; contaId?: string; cartaoId?: string }): Promise<Transaction[]> {
    const rawData = await DataService.getTransactionsWithSplitsAndCategory();

    // Map raw Supabase joins to domain models
    let result: Transaction[] = (rawData || []).map((row) => ({
      id: row.id,
      tipo: row.tipo as TransactionType,
      valor: Number(row.valor),
      data: row.data,
      categoriaId: row.categoria_id,
      contaId: row.conta_id,
      cartaoId: row.cartao_id,
      descricao: row.descricao,
      observacao: row.observacao,
      status: row.status as TransactionStatus,
      grupoParcelamentoId: row.grupo_parcelamento_id,
      numeroParcela: row.numero_parcela,
      totalParcelas: row.total_parcelas,
      transferGroupId: row.transfer_group_id,
      direcaoTransferencia: row.direcao_transferencia,
      importHash: row.import_hash,
      conciliada: row.conciliada ?? false,
      dataConciliacao: row.data_conciliacao,
      faturaCompetencia: row.fatura_competencia,
      faturaAno: row.fatura_ano,
      faturaMes: row.fatura_mes,
      faturaVencimento: row.fatura_vencimento,
      createdAt: row.created_at,
      category: row.category ? {
        id: row.category.id,
        nome: row.category.nome,
        icone: row.category.icone,
        cor: row.category.cor,
        tipo: row.category.tipo as CategoryType,
        createdAt: row.category.created_at,
        updatedAt: row.category.updated_at,
      } : undefined,
      account: row.account ? {
        id: row.account.id,
        nome: row.account.nome,
        tipo: row.account.tipo,
        saldoInicial: Number(row.account.saldo_inicial),
        saldoAtual: Number(row.account.saldo_atual),
        cor: row.account.cor,
        icone: row.account.icone,
        ativa: row.account.ativa,
        createdAt: row.account.created_at,
      } : undefined,
      creditCard: row.creditCard ? {
        id: row.creditCard.id,
        nome: row.creditCard.nome,
        limite: Number(row.creditCard.limite),
        diaFechamento: row.creditCard.dia_fechamento,
        diaVencimento: row.creditCard.dia_vencimento,
        contaPadraoId: row.creditCard.conta_padrao_id,
        cor: row.creditCard.cor,
        icone: row.creditCard.icone,
        createdAt: row.creditCard.created_at,
      } : undefined,
      splits: (row.splits || []).map((s) => ({
        id: s.id,
        transactionId: s.transacao_id,
        categoryId: s.categoria_id,
        amount: Number(s.valor),
        description: s.descricao || undefined,
      })),
    }));

    if (filter?.startDate) {
      const sDate = filter.startDate;
      result = result.filter((t) => t.data >= sDate);
    }
    if (filter?.endDate) {
      const eDate = filter.endDate;
      result = result.filter((t) => t.data <= eDate);
    }
    if (filter?.contaId) {
      result = result.filter((t) => t.contaId === filter.contaId);
    }
    if (filter?.cartaoId) {
      result = result.filter((t) => t.cartaoId === filter.cartaoId);
    }

    return result;
  }

  /**
   * Retrieves a single transaction by ID.
   */
  static async getById(id: string): Promise<Transaction | null> {
    const all = await this.getAll();
    return all.find((t) => t.id === id) || null;
  }

  /**
   * Creates a transaction (simple or split).
   */
  static async create(
    transaction: Omit<Transaction, 'id' | 'createdAt'>,
    splits?: Omit<TransactionSplit, 'id' | 'transactionId'>[]
  ): Promise<Transaction> {
    // Validate split transaction amounts if splits are provided
    if (splits && splits.length > 0) {
      const sumSplits = splits.reduce((acc, curr) => acc + Number(curr.amount), 0);
      if (Math.abs(sumSplits - transaction.valor) > 0.01) {
        throw new Error('A soma dos splits deve ser exatamente igual ao valor total da transação');
      }
    }

    let faturaCompetencia = transaction.faturaCompetencia || null;
    let faturaAno = transaction.faturaAno || null;
    let faturaMes = transaction.faturaMes || null;
    let faturaVencimento = transaction.faturaVencimento || null;

    if (transaction.cartaoId && !faturaCompetencia) {
      const card = await CreditCardService.getById(transaction.cartaoId);
      if (card) {
        const billing = transaction.numeroParcela && transaction.numeroParcela > 1
          ? CreditCardBillingService.calculateInstallmentBillingPeriod(transaction.data, transaction.numeroParcela, card.diaFechamento, card.diaVencimento)
          : CreditCardBillingService.calculateBillingPeriod(transaction.data, card.diaFechamento, card.diaVencimento);

        faturaCompetencia = billing.faturaCompetencia;
        faturaAno = billing.faturaAno;
        faturaMes = billing.faturaMes;
        faturaVencimento = billing.faturaVencimento;
      }
    }

    const created = await DataService.insert('transacoes', {
      tipo: transaction.tipo,
      valor: transaction.valor,
      data: transaction.data,
      categoria_id: transaction.categoriaId || null,
      conta_id: transaction.contaId || null,
      cartao_id: transaction.cartaoId || null,
      descricao: transaction.descricao,
      observacao: transaction.observacao || null,
      status: transaction.status || TransactionStatus.CONCLUIDO,
      grupo_parcelamento_id: transaction.grupoParcelamentoId || null,
      numero_parcela: transaction.numeroParcela || null,
      total_parcelas: transaction.totalParcelas || null,
      transfer_group_id: transaction.transferGroupId || null,
      direcao_transferencia: transaction.direcaoTransferencia || null,
      import_hash: transaction.importHash || null,
      fatura_competencia: faturaCompetencia,
      fatura_ano: faturaAno,
      fatura_mes: faturaMes,
      fatura_vencimento: faturaVencimento,
    });

    let createdSplits: TransactionSplit[] = [];
    if (splits && splits.length > 0) {
      const splitRecords = splits.map((s) => ({
        transacao_id: created.id,
        categoria_id: s.categoryId,
        valor: s.amount,
        descricao: s.description || null,
      }));
      const insertedSplits = await DataService.insertMany('transacoes_splits', splitRecords);
      createdSplits = insertedSplits.map((s) => ({
        id: s.id,
        transactionId: s.transacao_id,
        categoryId: s.categoria_id,
        amount: Number(s.valor),
        description: s.descricao || undefined,
      }));
    }

    return {
      id: created.id,
      tipo: created.tipo as TransactionType,
      valor: Number(created.valor),
      data: created.data,
      categoriaId: created.categoria_id,
      contaId: created.conta_id,
      cartaoId: created.cartao_id,
      descricao: created.descricao,
      observacao: created.observacao,
      status: created.status as TransactionStatus,
      grupoParcelamentoId: created.grupo_parcelamento_id,
      numeroParcela: created.numero_parcela,
      totalParcelas: created.total_parcelas,
      transferGroupId: created.transfer_group_id,
      direcaoTransferencia: created.direcao_transferencia,
      importHash: created.import_hash,
      createdAt: created.created_at,
      splits: createdSplits,
    };
  }

  /**
   * Updates an existing transaction and its splits.
   */
  static async update(
    id: string,
    transaction: Partial<Transaction>,
    splits?: TransactionSplit[]
  ): Promise<Transaction> {
    await DataService.update('transacoes', id, {
      ...(transaction.tipo && { tipo: transaction.tipo }),
      ...(transaction.valor !== undefined && { valor: transaction.valor }),
      ...(transaction.data && { data: transaction.data }),
      ...(transaction.categoriaId !== undefined && { categoria_id: transaction.categoriaId }),
      ...(transaction.contaId !== undefined && { conta_id: transaction.contaId }),
      ...(transaction.cartaoId !== undefined && { cartao_id: transaction.cartaoId }),
      ...(transaction.descricao && { descricao: transaction.descricao }),
      ...(transaction.observacao !== undefined && { observacao: transaction.observacao }),
      ...(transaction.status && { status: transaction.status }),
      ...(transaction.direcaoTransferencia !== undefined && { direcao_transferencia: transaction.direcaoTransferencia }),
      ...(transaction.importHash !== undefined && { import_hash: transaction.importHash }),
    });

    if (splits !== undefined) {
      // Re-create splits for transaction
      const existingSplits = await DataService.selectAll('transacoes_splits', { column: 'transacao_id', value: id });
      for (const s of existingSplits) {
        await DataService.delete('transacoes_splits', s.id);
      }
      if (splits.length > 0) {
        const splitRecords = splits.map((s) => ({
          transacao_id: id,
          categoria_id: s.categoryId,
          valor: s.amount,
          descricao: s.description || null,
        }));
        await DataService.insertMany('transacoes_splits', splitRecords);
      }
    }

    const result = await this.getById(id);
    if (!result) {
      throw new Error(`Transação ${id} não encontrada após atualização.`);
    }
    return result;
  }

  /**
   * Deletes a transaction.
   */
  static async delete(id: string): Promise<boolean> {
    return await DataService.delete('transacoes', id);
  }
}
