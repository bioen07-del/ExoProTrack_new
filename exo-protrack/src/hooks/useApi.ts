import { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

// ============================================================================
// Types
// ============================================================================

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UseApiOptions<T> extends Omit<UseQueryOptions<T, ApiError, T>, 'queryKey' | 'queryFn'> {
  enabled?: boolean;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Generic hook for fetching data with React Query
 */
export function useApi<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>,
  options?: UseApiOptions<T>
) {
  return useQuery({
    queryKey,
    queryFn,
    staleTime: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

/**
 * Hook for fetching data with pagination
 */
export function usePaginatedApi<T>(
  table: keyof Database['public']['Tables'],
  pagination: PaginationParams = {},
  filters?: Record<string, unknown>
) {
  const { page = 1, limit = 20, sortBy, sortOrder = 'asc' } = pagination;

  const queryKey = ['paginated', table, page, limit, sortBy, sortOrder, filters];

  const queryFn = async (): Promise<PaginatedResponse<T>> => {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from(table)
      .select('*', { count: 'exact' })
      .range(from, to)
      .order(sortBy || 'created_at', { ascending: sortOrder === 'asc' });

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });
    }

    const { data, error, count } = await query;

    if (error) {
      throw new ApiError(error.message, error.code, error.details);
    }

    return {
      data: (data as unknown as T[]) || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };
  };

  return useApi(queryKey, queryFn);
}

/**
 * Hook for CRUD operations
 */
export function useCrud<T extends { id: string }>(
  table: keyof Database['public']['Tables']
) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const getCacheKey = (id?: string) => [table, id];

  // Create
  const create = useCallback(
    async (item: Omit<T, 'id'>): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from(table)
          .insert(item as unknown as Record<string, unknown>)
          .select()
          .single();

        if (fetchError) {
          throw new ApiError(fetchError.message, fetchError.code, fetchError.details);
        }

        queryClient.invalidateQueries({ queryKey: [table] });
        return data as unknown as T;
      } catch (err) {
        const apiError = err instanceof ApiError ? err : new ApiError('Failed to create');
        setError(apiError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [table, queryClient]
  );

  // Read single
  const getOne = useCallback(
    async (id: string): Promise<T | null> => {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw new ApiError(error.message, error.code, error.details);
      }

      return data as unknown as T;
    },
    [table]
  );

  // Read list
  const getList = useCallback(
    async (filters?: Record<string, unknown>): Promise<T[]> => {
      let query = supabase.from(table).select('*');

      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value);
          }
        });
      }

      const { data, error } = await query;

      if (error) {
        throw new ApiError(error.message, error.code, error.details);
      }

      return (data as unknown as T[]) || [];
    },
    [table]
  );

  // Update
  const update = useCallback(
    async (id: string, updates: Partial<T>): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from(table)
          .update(updates as unknown as Record<string, unknown>)
          .eq('id', id)
          .select()
          .single();

        if (fetchError) {
          throw new ApiError(fetchError.message, fetchError.code, fetchError.details);
        }

        queryClient.invalidateQueries({ queryKey: [table] });
        queryClient.invalidateQueries({ queryKey: getCacheKey(id) });

        return data as unknown as T;
      } catch (err) {
        const apiError = err instanceof ApiError ? err : new ApiError('Failed to update');
        setError(apiError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [table, queryClient]
  );

  // Delete
  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);

      try {
        const { error: fetchError } = await supabase
          .from(table)
          .delete()
          .eq('id', id);

        if (fetchError) {
          throw new ApiError(fetchError.message, fetchError.code, fetchError.details);
        }

        queryClient.invalidateQueries({ queryKey: [table] });
        return true;
      } catch (err) {
        const apiError = err instanceof ApiError ? err : new ApiError('Failed to delete');
        setError(apiError);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [table, queryClient]
  );

  return {
    create,
    getOne,
    getList,
    update,
    remove,
    isLoading,
    error,
  };
}

/**
 * Hook for real-time subscriptions
 */
export function useRealtimeSubscription<T>(
  table: keyof Database['public']['Tables'],
  filters?: Record<string, string>,
  onInsert?: (data: T) => void,
  onUpdate?: (data: T) => void,
  onDelete?: (id: string) => void
) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  const channel = `${table}-realtime`;

  const subscribe = useCallback(() => {
    let query = supabase.channel(channel);

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.filter(`${key}=eq.${value}`);
      });
    }

    query
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table },
        (payload) => {
          onInsert?.(payload.new as T);
          queryClient.invalidateQueries({ queryKey: [table] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table },
        (payload) => {
          onUpdate?.(payload.new as T);
          queryClient.invalidateQueries({ queryKey: [table] });
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table },
        (payload) => {
          onDelete?.(payload.old.id as string);
          queryClient.invalidateQueries({ queryKey: [table] });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(query);
      setIsConnected(false);
    };
  }, [table, filters, onInsert, onUpdate, onDelete, queryClient, channel]);

  return { subscribe, isConnected };
}

export default useApi;
