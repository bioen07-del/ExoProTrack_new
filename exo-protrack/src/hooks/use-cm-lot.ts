import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as cmLotApi from '../api/cm-lot';
import type { CmLotFilters, PaginationParams } from '../api/cm-lot';

// Query Keys
export const cmLotKeys = {
  all: ['cm-lot'] as const,
  lists: () => [...cmLotKeys.all, 'list'] as const,
  list: (filters: CmLotFilters, pagination?: PaginationParams) => 
    [...cmLotKeys.lists(), { filters, pagination }] as const,
  details: () => [...cmLotKeys.all, 'detail'] as const,
  detail: (id: string) => [...cmLotKeys.details(), id] as const,
  collections: (cmLotId: string) => [...cmLotKeys.detail(id), 'collections'] as const,
  processing: (cmLotId: string) => [...cmLotKeys.detail(id), 'processing'] as const,
  qc: (cmLotId: string) => [...cmLotKeys.detail(id), 'qc'] as const,
  stats: () => [...cmLotKeys.all, 'stats'] as const,
  fefo: () => [...cmLotKeys.all, 'fefo'] as const,
};

// Queries

/**
 * Получить список CM лотов
 */
export function useCmLots(
  filters?: CmLotFilters,
  pagination?: PaginationParams
) {
  return useQuery({
    queryKey: cmLotKeys.list(filters, pagination),
    queryFn: () => cmLotApi.getCmLots(filters, pagination),
    staleTime: 5 * 60 * 1000, // 5 минут
    gcTime: 30 * 60 * 1000, // 30 минут
  });
}

/**
 * Получить один CM лот
 */
export function useCmLot(id: string | undefined) {
  return useQuery({
    queryKey: cmLotKeys.detail(id || ''),
    queryFn: () => cmLotApi.getCmLot(id!),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 минуты
  });
}

/**
 * Статистика CM лотов
 */
export function useCmLotStats() {
  return useQuery({
    queryKey: cmLotKeys.stats(),
    queryFn: () => cmLotApi.getCmLotStats(),
    staleTime: 1 * 60 * 1000, // 1 минута
  });
}

/**
 * CM лоты для FEFO (First Expired, First Out)
 */
export function useCmLotsFEFO() {
  return useQuery({
    queryKey: cmLotKeys.fefo(),
    queryFn: () => cmLotApi.getCmLotsForFEFO(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * События сбора для CM лота
 */
export function useCollectionEvents(cmLotId: string | undefined) {
  return useQuery({
    queryKey: cmLotKeys.collections(cmLotId || ''),
    queryFn: () => cmLotApi.getCollectionEvents(cmLotId!),
    enabled: !!cmLotId,
  });
}

/**
 * Шаги процессинга для CM лота
 */
export function useProcessingSteps(cmLotId: string | undefined) {
  return useQuery({
    queryKey: cmLotKeys.processing(cmLotId || ''),
    queryFn: () => cmLotApi.getProcessingSteps(cmLotId!),
    enabled: !!cmLotId,
  });
}

/**
 * QC запросы для CM лота
 */
export function useQcRequests(cmLotId: string | undefined) {
  return useQuery({
    queryKey: cmLotKeys.qc(cmLotId || ''),
    queryFn: () => cmLotApi.getQcRequests(cmLotId!),
    enabled: !!cmLotId,
  });
}

// Mutations

/**
 * Создать CM лот
 */
export function useCreateCmLot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof cmLotApi.createCmLot>[0]) => 
      cmLotApi.createCmLot(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cmLotKeys.lists() });
      queryClient.invalidateQueries({ queryKey: cmLotKeys.stats() });
    },
  });
}

/**
 * Обновить CM лот
 */
export function useUpdateCmLot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof cmLotApi.updateCmLot>[1] }) =>
      cmLotApi.updateCmLot(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cmLotKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: cmLotKeys.lists() });
    },
  });
}

/**
 * Обновить статус CM лота
 */
export function useUpdateCmLotStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, additionalData }: { 
      id: string; 
      status: string; 
      additionalData?: Record<string, any>;
    }) => cmLotApi.updateCmLotStatus(id, status, additionalData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cmLotKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: cmLotKeys.lists() });
      queryClient.invalidateQueries({ queryKey: cmLotKeys.stats() });
    },
  });
}

/**
 * Удалить CM лот
 */
export function useDeleteCmLot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cmLotApi.deleteCmLot(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cmLotKeys.lists() });
      queryClient.invalidateQueries({ queryKey: cmLotKeys.stats() });
    },
  });
}

/**
 * Создать событие сбора
 */
export function useCreateCollectionEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof cmLotApi.createCollectionEvent>[0]) =>
      cmLotApi.createCollectionEvent(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cmLotKeys.detail(variables.cm_lot_id) });
      queryClient.invalidateQueries({ queryKey: cmLotKeys.collections(variables.cm_lot_id) });
    },
  });
}

/**
 * Создать шаг процессинга
 */
export function useCreateProcessingStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof cmLotApi.createProcessingStep>[0]) =>
      cmLotApi.createProcessingStep(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cmLotKeys.detail(variables.cm_lot_id) });
      queryClient.invalidateQueries({ queryKey: cmLotKeys.processing(variables.cm_lot_id) });
    },
  });
}

/**
 * Обновить шаг процессинга
 */
export function useUpdateProcessingStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof cmLotApi.updateProcessingStep>[1] }) =>
      cmLotApi.updateProcessingStep(id, data),
    onSuccess: (result, variables) => {
      // Get cm_lot_id from result or from cache
      queryClient.invalidateQueries({ queryKey: cmLotKeys.processing('') }); // Invalidate all
    },
  });
}

/**
 * Создать QC запрос
 */
export function useCreateQcRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof cmLotApi.createQcRequest>[0]) =>
      cmLotApi.createQcRequest(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cmLotKeys.detail(variables.cm_lot_id) });
      queryClient.invalidateQueries({ queryKey: cmLotKeys.qc(variables.cm_lot_id) });
    },
  });
}

/**
 * Создать QC результат
 */
export function useCreateQcResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof cmLotApi.createQcResult>[0]) =>
      cmLotApi.createQcResult(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cmLotKeys.qc('') }); // Invalidate all QC
    },
  });
}

/**
 * Создать QA решение
 */
export function useCreateQaDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof cmLotApi.createQaDecision>[0]) =>
      cmLotApi.createQaDecision(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cmLotKeys.detail(variables.cm_lot_id) });
      queryClient.invalidateQueries({ queryKey: cmLotKeys.stats() });
      queryClient.invalidateQueries({ queryKey: cmLotKeys.fefo() });
    },
  });
}
