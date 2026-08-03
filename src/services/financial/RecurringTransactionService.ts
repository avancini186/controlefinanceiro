import { DataService } from '../DataService';
import { TransactionService } from './TransactionService';
import type { RecurringTransaction } from '../../types';
import { TransactionType, RecurrenceFrequency, TransactionStatus } from '../../types/enums';

export class RecurringTransactionService {
  /**
   * Calculates the next execution date based on frequency and interval.
   */
  static calculateNextDate(currentDateStr: string, frequency: RecurrenceFrequency, interval = 1): string {
    const d = new Date(currentDateStr + 'T00:00:00');

    switch (frequency) {
      case RecurrenceFrequency.DIARIA:
        d.setDate(d.getDate() + interval);
        break;
      case RecurrenceFrequency.SEMANAL:
        d.setDate(d.getDate() + 7 * interval);
        break;
      case RecurrenceFrequency.QUINZENAL:
        d.setDate(d.getDate() + 14 * interval);
        break;
      case RecurrenceFrequency.MENSAL:
        d.setMonth(d.getMonth() + interval);
        break;
      case RecurrenceFrequency.BIMESTRAL:
        d.setMonth(d.getMonth() + 2 * interval);
        break;
      case RecurrenceFrequency.TRIMESTRAL:
        d.setMonth(d.getMonth() + 3 * interval);
        break;
      case RecurrenceFrequency.SEMESTRAL:
        d.setMonth(d.getMonth() + 6 * interval);
        break;
      case RecurrenceFrequency.ANUAL:
        d.setFullYear(d.getFullYear() + interval);
        break;
      default:
        d.setMonth(d.getMonth() + interval);
    }

    return d.toISOString().split('T')[0];
  }

  /**
   * Retrieves all recurring transaction rules with category, account and card details.
   */
  static async getAll(): Promise<RecurringTransaction[]> {
    const [rows, categories, accounts, cards] = await Promise.all([
      DataService.selectAll('transacoes_recorrentes'),
      DataService.selectAll('categorias'),
      DataService.selectAll('contas'),
      DataService.selectAll('cartoes'),
    ]);

    const catMap = new Map(categories.map((c) => [c.id, c]));
    const accMap = new Map(accounts.map((a) => [a.id, a]));
    const cardMap = new Map(cards.map((c) => [c.id, c]));

    return rows.map((r) => {
      const cat = r.categoria_id ? catMap.get(r.categoria_id) : undefined;
      const acc = r.conta_id ? accMap.get(r.conta_id) : undefined;
      const card = r.cartao_id ? cardMap.get(r.cartao_id) : undefined;

      return {
        id: r.id,
        tipo: r.tipo as TransactionType,
        descricao: r.descricao,
        valor: Number(r.valor),
        categoriaId: r.categoria_id,
        contaId: r.conta_id,
        cartaoId: r.cartao_id,
        dataInicio: r.data_inicio,
        dataFim: r.data_fim,
        frequencia: r.frequencia as RecurrenceFrequency,
        intervalo: r.intervalo,
        ativa: r.ativa,
        ultimaExecucao: r.ultima_execucao,
        proximaExecucao: r.proxima_execucao,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        category: cat
          ? {
              id: cat.id,
              nome: cat.nome,
              icone: cat.icone,
              cor: cat.cor,
              tipo: cat.tipo as any,
              createdAt: cat.created_at,
              updatedAt: cat.updated_at,
            }
          : undefined,
        account: acc
          ? {
              id: acc.id,
              nome: acc.nome,
              tipo: acc.tipo as any,
              saldoInicial: Number(acc.saldo_inicial),
              saldoAtual: Number(acc.saldo_atual),
              cor: acc.cor,
              icone: acc.icone,
              ativa: acc.ativa,
              createdAt: acc.created_at,
            }
          : undefined,
        creditCard: card
          ? {
              id: card.id,
              nome: card.nome,
              limite: Number(card.limite),
              diaFechamento: card.dia_fechamento,
              diaVencimento: card.dia_vencimento,
              contaPadraoId: card.conta_padrao_id,
              cor: card.cor,
              icone: card.icone,
              createdAt: card.created_at,
            }
          : undefined,
      };
    });
  }

  /**
   * Retrieves a single recurring transaction by ID.
   */
  static async getById(id: string): Promise<RecurringTransaction | null> {
    const all = await this.getAll();
    return all.find((r) => r.id === id) || null;
  }

  /**
   * Creates a new recurring transaction configuration.
   */
  static async create(
    data: Omit<RecurringTransaction, 'id' | 'createdAt' | 'updatedAt' | 'proximaExecucao' | 'ultimaExecucao'>
  ): Promise<RecurringTransaction> {
    const proximaExecucao = data.dataInicio;

    const created = await DataService.insert('transacoes_recorrentes', {
      tipo: data.tipo as 'RECEITA' | 'DESPESA',
      descricao: data.descricao,
      valor: data.valor,
      categoria_id: data.categoriaId,
      conta_id: data.contaId,
      cartao_id: data.cartaoId || null,
      data_inicio: data.dataInicio,
      data_fim: data.dataFim || null,
      frequencia: data.frequencia,
      intervalo: data.intervalo || 1,
      ativa: data.ativa ?? true,
      proxima_execucao: proximaExecucao,
    });

    const result = await this.getById(created.id);
    if (!result) {
      throw new Error(`Recorrência ${created.id} não encontrada após criação.`);
    }
    return result;
  }

  /**
   * Updates a recurring transaction. Only affects future generated transactions.
   */
  static async update(id: string, changes: Partial<RecurringTransaction>): Promise<RecurringTransaction> {
    const existing = await this.getById(id);
    if (!existing) throw new Error('Recorrência não encontrada');

    let newProximaExec = existing.proximaExecucao;
    if (changes.dataInicio && !existing.ultimaExecucao) {
      newProximaExec = changes.dataInicio;
    }

    await DataService.update('transacoes_recorrentes', id, {
      ...(changes.tipo && { tipo: changes.tipo as 'RECEITA' | 'DESPESA' }),
      ...(changes.descricao && { descricao: changes.descricao }),
      ...(changes.valor !== undefined && { valor: changes.valor }),
      ...(changes.categoriaId !== undefined && { categoria_id: changes.categoriaId }),
      ...(changes.contaId !== undefined && { conta_id: changes.contaId }),
      ...(changes.cartaoId !== undefined && { cartao_id: changes.cartaoId }),
      ...(changes.dataInicio && { data_inicio: changes.dataInicio }),
      ...(changes.dataFim !== undefined && { data_fim: changes.dataFim }),
      ...(changes.frequencia && { frequencia: changes.frequencia }),
      ...(changes.intervalo !== undefined && { intervalo: changes.intervalo }),
      ...(changes.ativa !== undefined && { ativa: changes.ativa }),
      proxima_execucao: newProximaExec,
    });

    const updated = await this.getById(id);
    if (!updated) {
      throw new Error(`Recorrência ${id} não encontrada após atualização.`);
    }
    return updated;
  }

  /**
   * Deletes a recurring transaction rule.
   */
  static async delete(id: string): Promise<boolean> {
    return await DataService.delete('transacoes_recorrentes', id);
  }

  /**
   * Processes all active recurring transactions due on or before targetDate.
   */
  static async processPendingRecurrences(targetDateStr?: string): Promise<{ createdCount: number }> {
    const targetDate = targetDateStr || new Date().toISOString().split('T')[0];
    const recurrences = await this.getAll();
    let createdCount = 0;

    for (const rec of recurrences) {
      if (!rec.ativa) continue;
      if (rec.dataFim && rec.dataFim < targetDate) continue;

      let currentNextDate = rec.proximaExecucao;

      while (currentNextDate <= targetDate) {
        if (rec.dataFim && currentNextDate > rec.dataFim) break;

        // Generate Transaction
        await TransactionService.create({
          tipo: rec.tipo,
          valor: rec.valor,
          data: currentNextDate,
          categoriaId: rec.categoriaId,
          contaId: rec.contaId,
          cartaoId: rec.cartaoId,
          descricao: `${rec.descricao} (Recorrência)`,
          observacao: 'Gerado automaticamente por transação recorrente',
          status: TransactionStatus.CONCLUIDO,
        });

        createdCount++;

        const nextDate = this.calculateNextDate(currentNextDate, rec.frequencia, rec.intervalo);
        currentNextDate = nextDate;

        await DataService.update('transacoes_recorrentes', rec.id, {
          ultima_execucao: currentNextDate,
          proxima_execucao: nextDate,
        });
      }
    }

    return { createdCount };
  }
}
