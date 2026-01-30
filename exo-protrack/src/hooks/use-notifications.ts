import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { supabase, handleSupabaseError } from '../api/supabase';
import { useAuth } from '../context/AuthContext';
import type { Database } from '../types/database';

type Notification = Database['public']['Tables']['notifications']['Row'];

interface NotificationWithMeta extends Notification {
  isNew?: boolean;
}

interface NotificationFilters {
  unreadOnly?: boolean;
  limit?: number;
}

// Query Keys
export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: NotificationFilters) => [...notificationKeys.lists(), filters] as const,
  counts: () => [...notificationKeys.all, 'count'] as const,
};

// Queries

/**
 * Получить все уведомления пользователя
 */
export function useNotifications(filters?: NotificationFilters) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: notificationKeys.list(filters || {}),
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.user_id)
        .order('created_at', { ascending: false });

      if (filters?.unreadOnly) {
        query = query.eq('is_read', false);
      }

      if (filters?.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;
      
      if (error) throw new Error(handleSupabaseError(error));
      
      return data as Notification[];
    },
    enabled: !!user,
    staleTime: 30 * 1000, // 30 секунд
    gcTime: 5 * 60 * 1000, // 5 минут
  });
}

/**
 * Количество непрочитанных уведомлений
 */
export function useUnreadCount() {
  const { data } = useNotifications({ unreadOnly: true });
  
  return {
    count: data?.length || 0,
    isLoading: data === undefined,
  };
}

/**
 * Подписка на realtime уведомления
 */
export function useRealtimeNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    // Подписка на новые уведомления
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.user_id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          
          // Добавляем в кэш
          queryClient.setQueryData<Notification[]>(
            notificationKeys.list({}),
            (old) => old ? [newNotification, ...old] : [newNotification]
          );

          // Показываем toast (будет реализован отдельно)
          showNotificationToast(newNotification);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);
}

// Mutations

/**
 * Отметить уведомление как прочитанное
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('notification_id', notificationId);

      if (error) throw new Error(handleSupabaseError(error));
    },
    onSuccess: (_, notificationId) => {
      // Обновляем список уведомлений
      queryClient.setQueryData<Notification[]>(
        notificationKeys.list({}),
        (old) => old?.map(n => 
          n.notification_id === notificationId 
            ? { ...n, is_read: true, read_at: new Date().toISOString() }
            : n
        )
      );
    },
  });
}

/**
 * Отметить все как прочитанные
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) return;

      const { error } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', user.user_id)
        .eq('is_read', false);

      if (error) throw new Error(handleSupabaseError(error));
    },
    onSuccess: () => {
      // Обновляем все уведомления
      queryClient.setQueryData<Notification[]>(
        notificationKeys.list({}),
        (old) => old?.map(n => ({
          ...n,
          is_read: true,
          read_at: n.read_at || new Date().toISOString()
        }))
      );
    },
  });
}

/**
 * Удалить уведомление
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('notification_id', notificationId);

      if (error) throw new Error(handleSupabaseError(error));
    },
    onSuccess: (_, notificationId) => {
      queryClient.setQueryData<Notification[]>(
        notificationKeys.list({}),
        (old) => old?.filter(n => n.notification_id !== notificationId)
      );
    },
  });
}

// Toast helper — uses Sonner + Browser Notification API
function showNotificationToast(notification: Notification) {
  // In-app toast via Sonner
  toast(notification.title, {
    description: notification.message || undefined,
    duration: 5000,
  });

  // Browser push notification (if granted)
  if ('Notification' in window && window.Notification.permission === 'granted') {
    try {
      new window.Notification(notification.title, {
        body: notification.message || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/badge-72.png',
      });
    } catch {
      // Silently fail on environments that don't support Notification constructor
    }
  }
}

// Компонент для отображения уведомлений в реальном времени
export function RealtimeNotificationListener() {
  useRealtimeNotifications();
  return null;
}

// Hook для запроса разрешения на уведомления
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied';
    
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const isGranted = permission === 'granted';
  const isDenied = permission === 'denied';

  return {
    permission,
    requestPermission,
    isGranted,
    isDenied,
  };
}
