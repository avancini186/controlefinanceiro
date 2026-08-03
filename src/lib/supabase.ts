import { createClient } from '@supabase/supabase-js';
import type { Database } from '../database/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

export class DatabaseError extends Error {
  originalError?: unknown;
  constructor(message: string, originalError?: unknown) {
    super(message);
    this.name = 'DatabaseError';
    this.originalError = originalError;
  }
}
