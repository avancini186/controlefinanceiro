import { DataService } from '../DataService';
import type { CreditCard } from '../../types';

export class CreditCardService {
  /**
   * Retrieves all credit cards.
   */
  static async getAll(): Promise<CreditCard[]> {
    const rows = await DataService.selectAll('cartoes');
    return rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      limite: Number(r.limite),
      diaFechamento: r.dia_fechamento,
      diaVencimento: r.dia_vencimento,
      contaPadraoId: r.conta_padrao_id,
      cor: r.cor,
      icone: r.icone,
      createdAt: r.created_at,
    }));
  }

  /**
   * Retrieves a credit card by ID.
   */
  static async getById(id: string): Promise<CreditCard | null> {
    const r = await DataService.selectById('cartoes', id);
    if (!r) return null;
    return {
      id: r.id,
      nome: r.nome,
      limite: Number(r.limite),
      diaFechamento: r.dia_fechamento,
      diaVencimento: r.dia_vencimento,
      contaPadraoId: r.conta_padrao_id,
      cor: r.cor,
      icone: r.icone,
      createdAt: r.created_at,
    };
  }

  /**
   * Creates a new credit card.
   */
  static async create(card: Omit<CreditCard, 'id' | 'createdAt'>): Promise<CreditCard> {
    const created = await DataService.insert('cartoes', {
      nome: card.nome,
      limite: card.limite,
      dia_fechamento: card.diaFechamento,
      dia_vencimento: card.diaVencimento,
      conta_padrao_id: card.contaPadraoId || null,
      cor: card.cor || '#8b5cf6',
      icone: card.icone || 'CreditCard',
    });
    return {
      id: created.id,
      nome: created.nome,
      limite: Number(created.limite),
      diaFechamento: created.dia_fechamento,
      diaVencimento: created.dia_vencimento,
      contaPadraoId: created.conta_padrao_id,
      cor: created.cor,
      icone: created.icone,
      createdAt: created.created_at,
    };
  }

  /**
   * Updates a credit card.
   */
  static async update(id: string, card: Partial<CreditCard>): Promise<CreditCard> {
    const updated = await DataService.update('cartoes', id, {
      ...(card.nome && { nome: card.nome }),
      ...(card.limite !== undefined && { limite: card.limite }),
      ...(card.diaFechamento !== undefined && { dia_fechamento: card.diaFechamento }),
      ...(card.diaVencimento !== undefined && { dia_vencimento: card.diaVencimento }),
      ...(card.contaPadraoId !== undefined && { conta_padrao_id: card.contaPadraoId }),
      ...(card.cor && { cor: card.cor }),
      ...(card.icone && { icone: card.icone }),
    });
    return {
      id: updated.id,
      nome: updated.nome,
      limite: Number(updated.limite),
      diaFechamento: updated.dia_fechamento,
      diaVencimento: updated.dia_vencimento,
      contaPadraoId: updated.conta_padrao_id,
      cor: updated.cor,
      icone: updated.icone,
      createdAt: updated.created_at,
    };
  }

  /**
   * Deletes a credit card.
   */
  static async delete(id: string): Promise<boolean> {
    return await DataService.delete('cartoes', id);
  }
}
