import { DataService } from '../DataService';
import type { Database } from '../../database/types';

type Tables = Database['public']['Tables'];

export interface BackupPayload {
  version: string;
  exportedAt: string;
  data: {
    configuracoes?: Tables['configuracoes']['Row'][];
    categorias?: Tables['categorias']['Row'][];
    contas?: Tables['contas']['Row'][];
    cartoes?: Tables['cartoes']['Row'][];
    transacoes?: Tables['transacoes']['Row'][];
    transacoes_recorrentes?: Tables['transacoes_recorrentes']['Row'][];
    categorias_orcamento?: Tables['categorias_orcamento']['Row'][];
    modelos_mapeamento_csv?: Tables['modelos_mapeamento_csv']['Row'][];
  };
}

export class BackupExportService {
  /**
   * Helper to trigger a browser file download.
   */
  private static downloadFile(content: string, filename: string, mimeType: string) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Generates and downloads a complete JSON backup file containing all tables.
   */
  static async exportFullBackupJSON(): Promise<void> {
    const [
      configuracoes,
      categorias,
      contas,
      cartoes,
      transacoes,
      transacoes_recorrentes,
      categorias_orcamento,
      modelos_mapeamento_csv,
    ] = await Promise.all([
      DataService.selectAll('configuracoes'),
      DataService.selectAll('categorias'),
      DataService.selectAll('contas'),
      DataService.selectAll('cartoes'),
      DataService.selectAll('transacoes'),
      DataService.selectAll('transacoes_recorrentes'),
      DataService.selectAll('categorias_orcamento'),
      DataService.selectAll('modelos_mapeamento_csv'),
    ]);

    const backup: BackupPayload = {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      data: {
        configuracoes,
        categorias,
        contas,
        cartoes,
        transacoes,
        transacoes_recorrentes,
        categorias_orcamento,
        modelos_mapeamento_csv,
      },
    };

    const jsonStr = JSON.stringify(backup, null, 2);
    const filename = `fincontrol_backup_${new Date().toISOString().split('T')[0]}.json`;
    this.downloadFile(jsonStr, filename, 'application/json');
  }

  /**
   * Exports a specific entity table as CSV file.
   */
  static async exportEntityCSV(
    entity: 'configuracoes' | 'categorias' | 'contas' | 'cartoes' | 'transacoes' | 'orcamentos'
  ): Promise<void> {
    const tableName: keyof Tables = entity === 'orcamentos' ? 'categorias_orcamento' : entity;

    const records = await DataService.selectAll(tableName);
    if (records.length === 0) {
      throw new Error(`Nenhum registro encontrado para exportar em ${entity}.`);
    }

    const headers = Object.keys(records[0]) as (keyof typeof records[0])[];
    const csvRows = [headers.join(';')];

    for (const r of records) {
      const values = headers.map((h) => {
        const val = (r as Record<string, unknown>)[h as string];
        if (val === null || val === undefined) return '';
        const strVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
        return `"${strVal.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(';'));
    }

    const csvContent = csvRows.join('\n');
    const filename = `fincontrol_export_${entity}_${new Date().toISOString().split('T')[0]}.csv`;
    this.downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
  }

  /**
   * Parses and validates a JSON backup file before restoration.
   */
  static async validateBackupFile(file: File): Promise<BackupPayload> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const parsed = JSON.parse(content) as BackupPayload;

          if (!parsed.data || typeof parsed.data !== 'object') {
            throw new Error('Formato de backup inválido. Chave "data" ausente.');
          }

          resolve(parsed);
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Arquivo JSON corrompido ou com formato incompatível.';
          reject(new Error(errMsg));
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo de backup.'));
      reader.readAsText(file);
    });
  }

  /**
   * Restores backup entities into the Supabase database using Promise.all batches.
   * Safety Guarantee: Never deletes data without explicit caller confirmation.
   */
  static async restoreBackup(payload: BackupPayload): Promise<{ restoredCount: number }> {
    const { data } = payload;
    let totalRestored = 0;

    // 1. Configurações
    if (data.configuracoes && data.configuracoes.length > 0) {
      await Promise.all(data.configuracoes.map((row) => DataService.upsert('configuracoes', row)));
      totalRestored += data.configuracoes.length;
    }

    // 2. Categorias
    if (data.categorias && data.categorias.length > 0) {
      await Promise.all(data.categorias.map((row) => DataService.upsert('categorias', row)));
      totalRestored += data.categorias.length;
    }

    // 3. Contas
    if (data.contas && data.contas.length > 0) {
      await Promise.all(data.contas.map((row) => DataService.upsert('contas', row)));
      totalRestored += data.contas.length;
    }

    // 4. Cartões
    if (data.cartoes && data.cartoes.length > 0) {
      await Promise.all(data.cartoes.map((row) => DataService.upsert('cartoes', row)));
      totalRestored += data.cartoes.length;
    }

    // 5. Categorias Orçamento
    if (data.categorias_orcamento && data.categorias_orcamento.length > 0) {
      await Promise.all(data.categorias_orcamento.map((row) => DataService.upsert('categorias_orcamento', row)));
      totalRestored += data.categorias_orcamento.length;
    }

    // 6. Transações Recorrentes
    if (data.transacoes_recorrentes && data.transacoes_recorrentes.length > 0) {
      await Promise.all(data.transacoes_recorrentes.map((row) => DataService.upsert('transacoes_recorrentes', row)));
      totalRestored += data.transacoes_recorrentes.length;
    }

    // 7. Transações
    if (data.transacoes && data.transacoes.length > 0) {
      await Promise.all(data.transacoes.map((row) => DataService.upsert('transacoes', row)));
      totalRestored += data.transacoes.length;
    }

    // 8. Modelos Mapeamento CSV
    if (data.modelos_mapeamento_csv && data.modelos_mapeamento_csv.length > 0) {
      await Promise.all(data.modelos_mapeamento_csv.map((row) => DataService.upsert('modelos_mapeamento_csv', row)));
      totalRestored += data.modelos_mapeamento_csv.length;
    }

    return { restoredCount: totalRestored };
  }
}
