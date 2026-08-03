import { supabase, DatabaseError } from '../lib/supabase';
import type { Database } from '../database/types';
import type { RichTransactionRow } from '../types';

type Tables = Database['public']['Tables'];

export class DataService {
  // Generic Select All
  static async selectAll<T extends keyof Tables>(
    table: T,
    filter?: { column: keyof Tables[T]['Row']; value: unknown }
  ): Promise<Tables[T]['Row'][]> {
    try {
      let query = supabase.from(table).select('*');
      if (filter) {
        query = query.eq(filter.column as never, filter.value as never);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as Tables[T]['Row'][];
    } catch (err) {
      throw new DatabaseError(`Failed to fetch all records from ${table}`, err);
    }
  }

  // Generic Select By ID
  static async selectById<T extends keyof Tables>(
    table: T,
    id: string | number
  ): Promise<Tables[T]['Row'] | null> {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id' as never, id as never)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data as unknown as Tables[T]['Row'];
    } catch (err) {
      throw new DatabaseError(`Failed to fetch record ${id} from ${table}`, err);
    }
  }

  // Generic Insert Record
  static async insert<T extends keyof Tables>(
    table: T,
    record: Tables[T]['Insert']
  ): Promise<Tables[T]['Row']> {
    try {
      const { data, error } = await supabase
        .from(table)
        .insert(record as never)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Tables[T]['Row'];
    } catch (err) {
      throw new DatabaseError(`Failed to insert record into ${table}`, err);
    }
  }

  // Generic Insert Many Records
  static async insertMany<T extends keyof Tables>(
    table: T,
    records: Tables[T]['Insert'][]
  ): Promise<Tables[T]['Row'][]> {
    try {
      const { data, error } = await supabase
        .from(table)
        .insert(records as never)
        .select();
      if (error) throw error;
      return (data || []) as unknown as Tables[T]['Row'][];
    } catch (err) {
      throw new DatabaseError(`Failed to insert batch into ${table}`, err);
    }
  }

  // Generic Upsert Record
  static async upsert<T extends keyof Tables>(
    table: T,
    record: Tables[T]['Insert']
  ): Promise<Tables[T]['Row']> {
    try {
      const { data, error } = await supabase
        .from(table)
        .upsert(record as never)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Tables[T]['Row'];
    } catch (err) {
      throw new DatabaseError(`Failed to upsert record into ${table}`, err);
    }
  }

  // Generic Update Record
  static async update<T extends keyof Tables>(
    table: T,
    id: string | number,
    changes: Tables[T]['Update']
  ): Promise<Tables[T]['Row']> {
    try {
      const { data, error } = await supabase
        .from(table)
        .update(changes as never)
        .eq('id' as never, id as never)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Tables[T]['Row'];
    } catch (err) {
      throw new DatabaseError(`Failed to update record ${id} in ${table}`, err);
    }
  }

  // Generic Delete Record
  static async delete<T extends keyof Tables>(table: T, id: string | number): Promise<boolean> {
    try {
      const { error } = await supabase.from(table).delete().eq('id' as never, id as never);
      if (error) throw error;
      return true;
    } catch (err) {
      throw new DatabaseError(`Failed to delete record ${id} from ${table}`, err);
    }
  }

  // Specific query helper for joining transactions with splits and categories
  static async getTransactionsWithSplitsAndCategory(): Promise<RichTransactionRow[]> {
    try {
      const { data, error } = await supabase
        .from('transacoes')
        .select(`
          *,
          category:categorias!categoria_id(*),
          account:contas!conta_id(*),
          creditCard:cartoes!cartao_id(*),
          splits:transacoes_splits(*)
        `)
        .order('data', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as RichTransactionRow[];
    } catch (err) {
      throw new DatabaseError('Failed to fetch rich transactions view', err);
    }
  }
}
