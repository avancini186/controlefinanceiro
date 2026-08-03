import { DataService } from '../DataService';
import type { Account } from '../../types';
import { AccountType } from '../../types/enums';

export class AccountService {
  /**
   * Retrieves all financial accounts.
   */
  static async getAll(): Promise<Account[]> {
    const rows = await DataService.selectAll('contas');
    return rows.map((r) => ({
      id: r.id,
      nome: r.nome,
      tipo: r.tipo as AccountType,
      saldoInicial: Number(r.saldo_inicial),
      saldoAtual: Number(r.saldo_inicial), // Base value before BalanceService recalculation
      cor: r.cor,
      icone: r.icone,
      ativa: r.ativa,
      createdAt: r.created_at,
    }));
  }

  /**
   * Retrieves account details by ID.
   */
  static async getById(id: string): Promise<Account | null> {
    const r = await DataService.selectById('contas', id);
    if (!r) return null;
    return {
      id: r.id,
      nome: r.nome,
      tipo: r.tipo as AccountType,
      saldoInicial: Number(r.saldo_inicial),
      saldoAtual: Number(r.saldo_inicial),
      cor: r.cor,
      icone: r.icone,
      ativa: r.ativa,
      createdAt: r.created_at,
    };
  }

  /**
   * Creates a new account.
   */
  static async create(account: Omit<Account, 'id' | 'createdAt' | 'saldoAtual'>): Promise<Account> {
    const created = await DataService.insert('contas', {
      nome: account.nome,
      tipo: account.tipo,
      saldo_inicial: account.saldoInicial,
      saldo_atual: account.saldoInicial,
      cor: account.cor || '#3b82f6',
      icone: account.icone || 'Wallet',
      ativa: account.ativa ?? true,
    });
    return {
      id: created.id,
      nome: created.nome,
      tipo: created.tipo as AccountType,
      saldoInicial: Number(created.saldo_inicial),
      saldoAtual: Number(created.saldo_inicial),
      cor: created.cor,
      icone: created.icone,
      ativa: created.ativa,
      createdAt: created.created_at,
    };
  }

  /**
   * Updates an existing account details.
   */
  static async update(id: string, account: Partial<Account>): Promise<Account> {
    const updated = await DataService.update('contas', id, {
      ...(account.nome && { nome: account.nome }),
      ...(account.tipo && { tipo: account.tipo }),
      ...(account.saldoInicial !== undefined && { saldo_inicial: account.saldoInicial }),
      ...(account.cor && { cor: account.cor }),
      ...(account.icone && { icone: account.icone }),
      ...(account.ativa !== undefined && { ativa: account.ativa }),
    });
    return {
      id: updated.id,
      nome: updated.nome,
      tipo: updated.tipo as AccountType,
      saldoInicial: Number(updated.saldo_inicial),
      saldoAtual: Number(updated.saldo_inicial),
      cor: updated.cor,
      icone: updated.icone,
      ativa: updated.ativa,
      createdAt: updated.created_at,
    };
  }

  /**
   * Deletes an account.
   */
  static async delete(id: string): Promise<boolean> {
    return await DataService.delete('contas', id);
  }
}
