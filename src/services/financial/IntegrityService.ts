import { DataService } from '../DataService';
import { TransactionService } from './TransactionService';
import { CategoryService } from './CategoryService';
import { AccountService } from './AccountService';
import { CreditCardService } from './CreditCardService';
import { CreditCardBillingService } from './CreditCardBillingService';
import { ConfigService } from './ConfigService';
import { parseInstallmentFromDescription, buildInstallmentDescription } from '../../utils/installmentParser';
import type { Transaction } from '../../types';

export type IssueSeverity = 'ALTA' | 'MEDIA' | 'BAIXA';

export interface IntegrityIssue {
  id: string;
  code: string;
  title: string;
  description: string;
  severity: IssueSeverity;
  affectedCount: number;
  affectedItems: any[];
  suggestion: string;
  canAutoFix: boolean;
}

export class IntegrityService {
  /**
   * Performs a comprehensive database audit checking 13 integrity rules.
   */
  static async runFullAudit(): Promise<IntegrityIssue[]> {
    const [
      allTx,
      allCategories,
      allAccounts,
      allCards,
      allBudgets,
      allInstallmentGroups,
      allRecurrences,
      allSplits,
      appConfig,
    ] = await Promise.all([
      TransactionService.getAll(),
      CategoryService.getAll(),
      AccountService.getAll(),
      CreditCardService.getAll(),
      DataService.selectAll('categorias_orcamento'),
      DataService.selectAll('grupos_parcelamento'),
      DataService.selectAll('transacoes_recorrentes'),
      DataService.selectAll('transacoes_splits'),
      ConfigService.getConfig(),
    ]);

    const issues: IntegrityIssue[] = [];

    const categoryIds = new Set(allCategories.map((c) => c.id));
    const accountIds = new Set(allAccounts.map((a) => a.id));
    const cardIds = new Set(allCards.map((c) => c.id));
    const txIds = new Set(allTx.map((t) => t.id));

    // 1. Transações sem categoria
    const uncategorizedTx = allTx.filter(
      (t) => !t.categoriaId && (!t.splits || t.splits.length === 0) && t.tipo !== 'TRANSFERENCIA'
    );
    if (uncategorizedTx.length > 0) {
      issues.push({
        id: 'transacoes_sem_categoria',
        code: 'TX_NO_CAT',
        title: 'Transações sem categoria',
        description: 'Existem transações simples sem nenhuma categoria associada.',
        severity: 'MEDIA',
        affectedCount: uncategorizedTx.length,
        affectedItems: uncategorizedTx,
        suggestion: 'Atribuir a categoria padrão "Outros" às transações.',
        canAutoFix: true,
      });
    }

    // 2. Transações órfãs (referenciando contas ou cartões inexistentes)
    const orphanTx = allTx.filter(
      (t) =>
        (t.contaId && !accountIds.has(t.contaId)) ||
        (t.cartaoId && !cardIds.has(t.cartaoId))
    );
    if (orphanTx.length > 0) {
      issues.push({
        id: 'transacoes_orfas',
        code: 'TX_ORPHAN',
        title: 'Transações órfãs',
        description: 'Transações que pertencem a contas ou cartões que foram excluídos.',
        severity: 'ALTA',
        affectedCount: orphanTx.length,
        affectedItems: orphanTx,
        suggestion: 'Reatribuir a primeira conta ativa ou remover referências inválidas.',
        canAutoFix: true,
      });
    }

    // 3. Splits órfãos
    const orphanSplits = allSplits.filter((s) => !txIds.has(s.transacao_id));
    if (orphanSplits.length > 0) {
      issues.push({
        id: 'splits_orfaos',
        code: 'SPLIT_ORPHAN',
        title: 'Splits de categoria órfãos',
        description: 'Registros de divisão por categoria apontando para transações inexistentes.',
        severity: 'ALTA',
        affectedCount: orphanSplits.length,
        affectedItems: orphanSplits,
        suggestion: 'Remover registros de splits órfãos do banco de dados.',
        canAutoFix: true,
      });
    }

    // 4. Soma dos splits diferente do valor da transação
    const mismatchedSplitsTx: Transaction[] = [];
    for (const t of allTx) {
      if (t.splits && t.splits.length > 0) {
        const sumSplits = t.splits.reduce((a, b) => a + Number(b.amount), 0);
        if (Math.abs(sumSplits - t.valor) > 0.01) {
          mismatchedSplitsTx.push(t);
        }
      }
    }
    if (mismatchedSplitsTx.length > 0) {
      issues.push({
        id: 'splits_soma_divergentes',
        code: 'SPLIT_MISMATCH',
        title: 'Soma dos splits divergente do valor total',
        description: 'Transações divididas onde a soma das partes difere do valor total.',
        severity: 'ALTA',
        affectedCount: mismatchedSplitsTx.length,
        affectedItems: mismatchedSplitsTx,
        suggestion: 'Ajustar o valor total da transação para corresponder à soma dos splits.',
        canAutoFix: true,
      });
    }

    // 5. Parcelas sem grupo
    const orphanInstallments = allTx.filter(
      (t) => t.numeroParcela && !t.grupoParcelamentoId
    );
    if (orphanInstallments.length > 0) {
      issues.push({
        id: 'parcelas_sem_grupo',
        code: 'INST_NO_GROUP',
        title: 'Parcelas de compras sem grupo',
        description: 'Lançamentos de parcelas marcados sem um grupo de parcelamento.',
        severity: 'BAIXA',
        affectedCount: orphanInstallments.length,
        affectedItems: orphanInstallments,
        suggestion: 'Limpar flag de número de parcela ou atribuir grupo.',
        canAutoFix: true,
      });
    }

    // 6. Grupos de parcelamento sem parcelas
    const emptyInstallmentGroups = allInstallmentGroups.filter((g) => {
      const txsInGroup = allTx.filter((t) => t.grupoParcelamentoId === g.id);
      return txsInGroup.length === 0;
    });
    if (emptyInstallmentGroups.length > 0) {
      issues.push({
        id: 'grupos_sem_parcelas',
        code: 'GROUP_EMPTY',
        title: 'Grupos de parcelamento sem parcelas',
        description: 'Grupos de parcelamento cadastrados que não contêm transações associadas.',
        severity: 'BAIXA',
        affectedCount: emptyInstallmentGroups.length,
        affectedItems: emptyInstallmentGroups,
        suggestion: 'Remover grupos de parcelamento vazios.',
        canAutoFix: true,
      });
    }

    // 7. Transferências sem par
    const transferGroupsMap = new Map<string, Transaction[]>();
    for (const t of allTx) {
      if (t.transferGroupId) {
        const list = transferGroupsMap.get(t.transferGroupId) || [];
        list.push(t);
        transferGroupsMap.set(t.transferGroupId, list);
      }
    }
    const singleTransfers: Transaction[] = [];
    transferGroupsMap.forEach((list) => {
      if (list.length !== 2) {
        singleTransfers.push(...list);
      }
    });
    if (singleTransfers.length > 0) {
      issues.push({
        id: 'transferencias_sem_par',
        code: 'TRANSFER_UNPAIRED',
        title: 'Transferências sem par de destino/origem',
        description: 'Transferências que possuem o ID de grupo mas não possuem o segundo lançamento oposto.',
        severity: 'ALTA',
        affectedCount: singleTransfers.length,
        affectedItems: singleTransfers,
        suggestion: 'Remover flag de transferência para converter em transação normal ou excluir.',
        canAutoFix: true,
      });
    }

    // 8. Transferências duplicadas
    const duplicateTransferGroups: string[] = [];
    transferGroupsMap.forEach((list, gid) => {
      if (list.length > 2) {
        duplicateTransferGroups.push(gid);
      }
    });
    if (duplicateTransferGroups.length > 0) {
      issues.push({
        id: 'transferencias_duplicadas',
        code: 'TRANSFER_DUP',
        title: 'Grupos de transferência duplicados',
        description: 'Grupos de transferência contendo mais de 2 transações associadas.',
        severity: 'MEDIA',
        affectedCount: duplicateTransferGroups.length,
        affectedItems: duplicateTransferGroups,
        suggestion: 'Manter apenas 1 par de transferência e remover excedentes.',
        canAutoFix: true,
      });
    }

    // 9. Categorias não utilizadas
    const usedCategoryIds = new Set<string>();
    allTx.forEach((t) => {
      if (t.categoriaId) usedCategoryIds.add(t.categoriaId);
      t.splits?.forEach((s) => usedCategoryIds.add(s.categoryId));
    });
    allBudgets.forEach((b) => usedCategoryIds.add(b.categoria_id));
    allRecurrences.forEach((r) => {
      if (r.categoria_id) usedCategoryIds.add(r.categoria_id);
    });

    const unusedCategories = allCategories.filter((c) => !usedCategoryIds.has(c.id));
    if (unusedCategories.length > 0) {
      issues.push({
        id: 'categorias_nao_utilizadas',
        code: 'CAT_UNUSED',
        title: 'Categorias não utilizadas',
        description: 'Categorias cadastradas que não possuem nenhuma movimentação, orçamento ou recorrência.',
        severity: 'BAIXA',
        affectedCount: unusedCategories.length,
        affectedItems: unusedCategories,
        suggestion: 'Permanece como informação; você pode mantê-las para uso futuro.',
        canAutoFix: false,
      });
    }

    // 10. Contas não utilizadas
    const usedAccountIds = new Set<string>();
    allTx.forEach((t) => {
      if (t.contaId) usedAccountIds.add(t.contaId);
    });
    allCards.forEach((c) => {
      if (c.contaPadraoId) usedAccountIds.add(c.contaPadraoId);
    });
    allRecurrences.forEach((r) => {
      if (r.conta_id) usedAccountIds.add(r.conta_id);
    });

    const unusedAccounts = allAccounts.filter((a) => !usedAccountIds.has(a.id));
    if (unusedAccounts.length > 0) {
      issues.push({
        id: 'contas_nao_utilizadas',
        code: 'ACC_UNUSED',
        title: 'Contas financeiras não utilizadas',
        description: 'Contas ativas sem nenhuma movimentação vinculada.',
        severity: 'BAIXA',
        affectedCount: unusedAccounts.length,
        affectedItems: unusedAccounts,
        suggestion: 'Mantenha ativas ou inative no gerenciador de contas.',
        canAutoFix: false,
      });
    }

    // 11. Cartões não utilizados
    const usedCardIds = new Set<string>();
    allTx.forEach((t) => {
      if (t.cartaoId) usedCardIds.add(t.cartaoId);
    });
    allRecurrences.forEach((r) => {
      if (r.cartao_id) usedCardIds.add(r.cartao_id);
    });

    const unusedCards = allCards.filter((c) => !usedCardIds.has(c.id));
    if (unusedCards.length > 0) {
      issues.push({
        id: 'cartoes_nao_utilizados',
        code: 'CARD_UNUSED',
        title: 'Cartões de crédito não utilizados',
        description: 'Cartões de crédito cadastrados sem nenhuma transação vinculada.',
        severity: 'BAIXA',
        affectedCount: unusedCards.length,
        affectedItems: unusedCards,
        suggestion: 'Mantenha cadastrados para uso futuro.',
        canAutoFix: false,
      });
    }

    // 12. Orçamentos sem categoria
    const orphanBudgets = allBudgets.filter((b) => !categoryIds.has(b.categoria_id));
    if (orphanBudgets.length > 0) {
      issues.push({
        id: 'orcamentos_sem_categoria',
        code: 'BUDGET_ORPHAN',
        title: 'Orçamentos sem categoria válida',
        description: 'Metas de orçamento apontando para categorias que foram excluídas.',
        severity: 'MEDIA',
        affectedCount: orphanBudgets.length,
        affectedItems: orphanBudgets,
        suggestion: 'Remover limites de orçamentos de categorias excluídas.',
        canAutoFix: true,
      });
    }

    // 13. Configurações inválidas
    if (!appConfig || appConfig.id !== 1 || !appConfig.moeda) {
      issues.push({
        id: 'configuracoes_invalidas',
        code: 'CONFIG_INVALID',
        title: 'Configurações de sistema inválidas',
        description: 'Tabela de configurações do aplicativo está sem o registro padrão.',
        severity: 'ALTA',
        affectedCount: 1,
        affectedItems: [appConfig],
        suggestion: 'Recriar configuração padrão (id = 1, moeda = BRL, primeiroDiaMes = 1).',
        canAutoFix: true,
      });
    }

    return issues;
  }

  /**
   * Executes automatic repair for a specific detected issue.
   */
  static async autoFixIssue(issueId: string): Promise<boolean> {
    const issues = await this.runFullAudit();
    const issue = issues.find((i) => i.id === issueId);
    if (!issue || !issue.canAutoFix) {
      throw new Error('Inconsistência não pode ser corrigida automaticamente.');
    }

    switch (issueId) {
      case 'transacoes_sem_categoria': {
        // Assign default or first category
        const categories = await CategoryService.getAll();
        const defaultCat = categories[0];
        if (defaultCat) {
          for (const tx of issue.affectedItems) {
            await DataService.update('transacoes', tx.id, { categoria_id: defaultCat.id });
          }
        }
        break;
      }

      case 'splits_orfaos': {
        for (const s of issue.affectedItems) {
          await DataService.delete('transacoes_splits', s.id);
        }
        break;
      }

      case 'splits_soma_divergentes': {
        for (const tx of issue.affectedItems) {
          const sumSplits = (tx.splits || []).reduce((a: number, b: any) => a + Number(b.amount), 0);
          await DataService.update('transacoes', tx.id, { valor: Number(sumSplits.toFixed(2)) });
        }
        break;
      }

      case 'parcelas_sem_grupo': {
        for (const tx of issue.affectedItems) {
          await DataService.update('transacoes', tx.id, { numero_parcela: null, total_parcelas: null });
        }
        break;
      }

      case 'grupos_sem_parcelas': {
        for (const g of issue.affectedItems) {
          await DataService.delete('grupos_parcelamento', g.id);
        }
        break;
      }

      case 'transferencias_sem_par': {
        for (const tx of issue.affectedItems) {
          await DataService.update('transacoes', tx.id, { transfer_group_id: null, direcao_transferencia: null });
        }
        break;
      }

      case 'orcamentos_sem_categoria': {
        for (const b of issue.affectedItems) {
          await DataService.delete('categorias_orcamento', b.id);
        }
        break;
      }

      case 'configuracoes_invalidas': {
        await ConfigService.updateConfig({ moeda: 'BRL', primeiroDiaMes: 1 });
        break;
      }

      default:
        break;
    }

    return true;
  }

  /**
   * Scans all database transactions, detects installment descriptions (e.g. Parcela 1/3),
   * updates numero_parcela/total_parcelas, recalculates correct fatura_competencia,
   * and automatically generates any missing future installments for subsequent months.
   */
  static async repairInstallmentTransactions(): Promise<{ repaired: number; createdFuture: number }> {
    const [allTx, cards] = await Promise.all([
      TransactionService.getAll(),
      CreditCardService.getAll(),
    ]);

    const cardMap = new Map(cards.map((c) => [c.id, c]));
    let repaired = 0;
    let createdFuture = 0;

    for (const tx of allTx) {
      if (!tx.cartaoId) continue;
      const card = cardMap.get(tx.cartaoId);
      if (!card) continue;

      const parsedInst = parseInstallmentFromDescription(tx.descricao);
      const numParc = tx.numeroParcela || parsedInst.numeroParcela;
      const totParc = tx.totalParcelas || parsedInst.totalParcelas;

      // 1. Recalculate exact fatura_competencia directly based on transaction.data
      const billing = CreditCardBillingService.calculateBillingPeriod(
        tx.data,
        card.diaFechamento,
        card.diaVencimento
      );

      const needsUpdate =
        tx.faturaCompetencia !== billing.faturaCompetencia ||
        tx.numeroParcela !== numParc ||
        tx.totalParcelas !== totParc;

      if (needsUpdate) {
        await DataService.update('transacoes', tx.id, {
          fatura_competencia: billing.faturaCompetencia,
          fatura_ano: billing.faturaAno,
          fatura_mes: billing.faturaMes,
          fatura_vencimento: billing.faturaVencimento,
          numero_parcela: numParc || null,
          total_parcelas: totParc || null,
        });
        repaired++;
      }

      // 2. Auto-generate missing future installments if numParc < totParc
      if (numParc && totParc && numParc < totParc) {
        const baseDesc = parsedInst.baseDescription;
        const [baseY, baseM, baseD] = tx.data.split('-').map(Number);

        // Check which future installment numbers already exist in the database for this card & base description
        const existingInstallments = new Set(
          allTx
            .filter((t) => t.cartaoId === tx.cartaoId && t.descricao.includes(baseDesc))
            .map((t) => t.numeroParcela || parseInstallmentFromDescription(t.descricao).numeroParcela)
            .filter(Boolean)
        );

        for (let next = numParc + 1; next <= totParc; next++) {
          if (existingInstallments.has(next)) continue;

          const monthOffset = next - numParc;
          let targetY = baseY;
          let targetM = (baseM - 1) + monthOffset;
          targetY += Math.floor(targetM / 12);
          targetM = ((targetM % 12) + 12) % 12;

          const maxDays = new Date(targetY, targetM + 1, 0).getDate();
          const targetD = Math.min(baseD, maxDays);
          const nextDate = `${targetY}-${String(targetM + 1).padStart(2, '0')}-${String(targetD).padStart(2, '0')}`;

          const nextDesc = buildInstallmentDescription(baseDesc, next, totParc);

          await TransactionService.create({
            tipo: tx.tipo,
            valor: tx.valor,
            data: nextDate,
            cartaoId: tx.cartaoId,
            categoriaId: tx.categoriaId,
            descricao: nextDesc,
            observacao: `Gerado automaticamente via reparo de parcelamento`,
            status: tx.status,
            importHash: tx.importHash ? `${tx.importHash}_P${next}` : undefined,
            conciliada: tx.conciliada,
            dataConciliacao: tx.dataConciliacao,
            grupoParcelamentoId: tx.grupoParcelamentoId,
            numeroParcela: next,
            totalParcelas: totParc,
          });

          existingInstallments.add(next);
          createdFuture++;
        }
      }
    }

    return { repaired, createdFuture };
  }
}
