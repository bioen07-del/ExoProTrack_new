import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Missing Supabase configuration. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Error handler helper
export function handleSupabaseError(error: any): string {
  if (error?.message) {
    return error.message;
  }
  if (error?.error?.message) {
    return error.error.message;
  }
  return 'Произошла неизвестная ошибка';
}

// Generic fetch wrapper with error handling
export async function supabaseFetch<T>(
  query: () => Promise<{ data: T | null; error: any }>
): Promise<T> {
  const { data, error } = await query();
  
  if (error) {
    throw new Error(handleSupabaseError(error));
  }
  
  if (!data) {
    throw new Error('Данные не найдены');
  }
  
  return data;
}

// Bulk operations helper
export async function bulkInsert<T>(
  table: string,
  records: T[],
  options?: { onConflict?: string; ignoreDuplicates?: boolean }
): Promise<{ data: T[] | null; error: any }> {
  return supabase.from(table).insert(records, {
    onConflict: options?.onConflict,
    ignoreDuplicates: options?.ignoreDuplicates,
  });
}

// Pagination helper
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export function buildPaginationQuery(
  query: any,
  params: PaginationParams
) {
  const { page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;
  
  return query.range(offset, offset + limit - 1);
}
