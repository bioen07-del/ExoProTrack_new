import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

const defaultQueryOptions = {
  retry: 3,
  refetchOnWindowFocus: false,
};

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        ...defaultQueryOptions,
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
      mutations: {
        retry: 0,
        onError: (error) => {
          console.error('Mutation error:', error);
        },
      },
    },
  });
}

interface ReactQueryProviderProps {
  children: ReactNode;
}

export function ReactQueryProvider({ children }: ReactQueryProviderProps) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Query status helpers
export function isLoading(query: { status: string }) {
  return query.status === 'pending';
}

export function isError(query: { status: string; error: any }) {
  return query.status === 'error';
}

export function isSuccess(query: { status: string }) {
  return query.status === 'success';
}

export function isPending(query: { status: string }) {
  return query.status === 'pending';
}

export function isFetched(query: { status: string }) {
  return query.status === 'success' || query.status === 'error';
}
