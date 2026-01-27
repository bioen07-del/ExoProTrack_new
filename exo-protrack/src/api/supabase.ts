import { supabase } from '../lib/supabase';

export { supabase };

export function handleSupabaseError(error: any): string {
  if (error?.message) {
    return error.message;
  }
  if (error?.error?.message) {
    return error.error.message;
  }
  return 'Произошла неизвестная ошибка';
}

export async function supabaseFetch<T>(
  query: Promise<{ data: T | null; error: any }>
): Promise<T> {
  const { data, error } = await query;

  if (error) {
    throw new Error(handleSupabaseError(error));
  }

  if (!data) {
    throw new Error('Данные не найдены');
  }

  return data;
}

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

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export function buildPaginationQuery(query: any, params: PaginationParams) {
  const { page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;

  return query.range(offset, offset + limit - 1);
}

