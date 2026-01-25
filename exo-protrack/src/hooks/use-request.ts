import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as requestApi from '../api/request';
import type { RequestFilters, PaginationParams } from '../api/request';

// Query Keys
export const requestKeys = {
  all: ['request'] as const,
  lists: () => [...requestKeys.all, 'list'] as const,
  list: (filters: RequestFilters, pagination?: PaginationParams) => 
    [...requestKeys.lists(), { filters, pagination }] as const,
  details: () => [...requestKeys.all, 'detail'] as const,
  detail: (id: string) => [...requestKeys.details(), id] as const,
  lines: (requestId: string) => [...requestKeys.detail(id), 'lines'] as const,
  stats: () => [...requestKeys.all, 'stats'] as const,
  reservations: (cmLotId?: string, requestLineId?: string) => 
    [...requestKeys.all, 'reservations', cmLotId, requestLineId] as const,
  availableLots: (requiredVolume?: number) => 
    [...requestKeys.all, 'available-lots', requiredVolume] as const,
};

// Queries

/**
 * Получить список заявок
 */
export function useRequests(
  filters?: RequestFilters,
  pagination?: PaginationParams
) {
  return useQuery({
    queryKey: requestKeys.list(filters, pagination),
    queryFn: () => requestApi.getRequests(filters, pagination),
    staleTime: 2 * 60 * 1000, // 2 минуты
    gcTime: 10 * 60 * 1000, // 10 минут
  });
}

/**
 * Получить одну заявку
 */
export function useRequest(id: string | undefined) {
  return useQuery({
    queryKey: requestKeys.detail(id || ''),
    queryFn: () => requestApi.getRequest(id!),
    enabled: !!id,
    staleTime: 1 * 60 * 1000, // 1 минута
  });
}

/**
 * Строки заявки
 */
export function useRequestLines(requestId: string | undefined) {
  return useQuery({
    queryKey: requestKeys.lines(requestId || ''),
    queryFn: () => requestApi.getRequestLines(requestId!),
    enabled: !!requestId,
  });
}

/**
 * Статистика заявок
 */
export function useRequestStats() {
  return useQuery({
    queryKey: requestKeys.stats(),
    queryFn: () => requestApi.getRequestStats(),
    staleTime: 1 * 60 * 1000, // 1 минута
  });
}

/**
 * Резервы
 */
export function useReservations(cmLotId?: string, requestLineId?: string) {
  return useQuery({
    queryKey: requestKeys.reservations(cmLotId, requestLineId),
    queryFn: () => requestApi.getReservations(cmLotId, requestLineId),
    staleTime: 30 * 1000, // 30 секунд
  });
}

/**
 * Доступные CM лоты для резервирования
 */
export function useAvailableCmLots(requiredVolume?: number) {
  return useQuery({
    queryKey: requestKeys.availableLots(requiredVolume),
    queryFn: () => requestApi.getAvailableCmLots(requiredVolume),
    staleTime: 30 * 1000, // 30 секунд
  });
}

// Mutations

/**
 * Создать заявку
 */
export function useCreateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof requestApi.createRequest>[0]) =>
      requestApi.createRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: requestKeys.stats() });
    },
  });
}

/**
 * Обновить заявку
 */
export function useUpdateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof requestApi.updateRequest>[1] }) =>
      requestApi.updateRequest(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
    },
  });
}

/**
 * Удалить заявку
 */
export function useDeleteRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => requestApi.deleteRequest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
      queryClient.invalidateQueries({ queryKey: requestKeys.stats() });
    },
  });
}

/**
 * Создать строку заявки
 */
export function useCreateRequestLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof requestApi.createRequestLine>[0]) =>
      requestApi.createRequestLine(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.lines(variables.request_id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(variables.request_id) });
    },
  });
}

/**
 * Обновить строку заявки
 */
export function useUpdateRequestLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof requestApi.updateRequestLine>[1] }) =>
      requestApi.updateRequestLine(id, data),
    onSuccess: (result) => {
      // Get request_id from result or cache
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
    },
  });
}

/**
 * Удалить строку заявки
 */
export function useDeleteRequestLine() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => requestApi.deleteRequestLine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.lists() });
    },
  });
}

/**
 * Создать резерв
 */
export function useCreateReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof requestApi.createReservation>[0]) =>
      requestApi.createReservation(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: requestKeys.reservations(variables.cm_lot_id, variables.request_line_id) });
      queryClient.invalidateQueries({ queryKey: requestKeys.availableLots() });
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(variables.request_line_id) });
    },
  });
}

/**
 * Отменить резерв
 */
export function useCancelReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => requestApi.cancelReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.reservations() });
      queryClient.invalidateQueries({ queryKey: requestKeys.availableLots() });
    },
  });
}

/**
 * Потребить резерв
 */
export function useConsumeReservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => requestApi.consumeReservation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.reservations() });
      queryClient.invalidateQueries({ queryKey: requestKeys.availableLots() });
    },
  });
}
