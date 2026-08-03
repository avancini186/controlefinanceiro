import { DataService } from '../DataService';
import type { AppConfig } from '../../types';

export class ConfigService {
  /**
   * Retrieves global application configuration (id = 1).
   */
  static async getConfig(): Promise<AppConfig> {
    const records = await DataService.selectAll('configuracoes');
    if (records.length === 0) {
      // Create initial config if database is empty
      const initial = await DataService.insert('configuracoes', {
        id: 1,
        moeda: 'BRL',
        primeiro_dia_mes: 1,
      });
      return {
        id: initial.id,
        moeda: initial.moeda,
        primeiroDiaMes: initial.primeiro_dia_mes,
        createdAt: initial.created_at,
        updatedAt: initial.updated_at,
      };
    }
    const rec = records[0];
    return {
      id: rec.id,
      moeda: rec.moeda,
      primeiroDiaMes: rec.primeiro_dia_mes,
      createdAt: rec.created_at,
      updatedAt: rec.updated_at,
    };
  }

  /**
   * Updates global application configuration settings.
   */
  static async updateConfig(config: Partial<Omit<AppConfig, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AppConfig> {
    const updated = await DataService.update('configuracoes', 1, {
      ...(config.moeda && { moeda: config.moeda }),
      ...(config.primeiroDiaMes && { primeiro_dia_mes: config.primeiroDiaMes }),
    });
    return {
      id: updated.id,
      moeda: updated.moeda,
      primeiroDiaMes: updated.primeiro_dia_mes,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
    };
  }
}
