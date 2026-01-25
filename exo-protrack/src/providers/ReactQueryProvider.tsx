import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

// Default query options
const defaultQueryOptions = {
  retry: 1,
  refetchOnWindowFocus: false,
};

// Create query client with custom defaults
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        ...defaultQueryOptions,
        staleTime: 60 * 1000, // 1 minute default
        gcTime: 5 * 60 * 1000, // 5 minutes default
      },
      mutations: {
        retry: 0,
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
