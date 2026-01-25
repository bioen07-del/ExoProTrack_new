import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// ============================================================================
// Types
// ============================================================================

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  entity_type: NotificationEntityType;
  entity_id?: string;
  is_read: boolean;
  read_at?: string;
  priority: NotificationPriority;
  created_at: string;
  data?: Record<string, unknown>;
}

export type NotificationEntityType = 'request' | 'cm_lot' | 'pack_lot' | 'culture' | 'general';

export type NotificationPriority = 'urgent' | 'high' | 'normal' | 'low';

export type NotificationType =
  | 'request_created'
  | 'request_status_changed'
  | 'request_approved'
  | 'request_rejected'
  | 'cm_lot_qc_pending'
  | 'cm_lot_qc_ready'
  | 'cm_lot_qa_decision'
  | 'pack_lot_ready_for_filling'
  | 'pack_lot_filled'
  | 'qc_result_ready'
  | 'approval_required'
  | 'expiry_warning'
  | 'system';

export interface NotificationPreferences {
  user_id: string;
  email_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
  enabled_types: NotificationType[];
}

export interface PushSubscriptionData {
  id: string;
  user_id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  created_at: string;
}

// ============================================================================
// Constants
// ============================================================================

export const NOTIFICATION_TYPES: Record<string, NotificationType[]> = {
  Production: [
    'request_created',
    'request_status_changed',
    'cm_lot_qc_ready',
    'pack_lot_ready_for_filling',
    'expiry_warning',
  ],
  QC: [
    'cm_lot_qc_pending',
    'approval_required',
    'qc_result_ready',
  ],
  QA: [
    'cm_lot_qa_decision',
    'approval_required',
    'request_approved',
    'request_rejected',
  ],
  Manager: [
    'request_created',
    'request_status_changed',
    'request_approved',
    'request_rejected',
    'expiry_warning',
  ],
  Admin: [
    'request_created',
    'system',
    'approval_required',
  ],
} as const;

export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  request_created: '📋',
  request_status_changed: '🔄',
  request_approved: '✅',
  request_rejected: '❌',
  cm_lot_qc_pending: '🧪',
  cm_lot_qc_ready: '📊',
  cm_lot_qa_decision: '🎯',
  pack_lot_ready_for_filling: '📦',
  pack_lot_filled: '✅',
  qc_result_ready: '📋',
  approval_required: '⚠️',
  expiry_warning: '⏰',
  system: '🔔',
} as const;

// ============================================================================
// Service Class
// ============================================================================

class NotificationService {
  private supabase: SupabaseClient | null = null;
  private channel: RealtimeChannel | null = null;
  private vapidPublicKey: string = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  /**
   * Initialize the notification service with Supabase client
   */
  initialize(supabaseClient: SupabaseClient, vapidPublicKey?: string): void {
    this.supabase = supabaseClient;
    if (vapidPublicKey) {
      this.vapidPublicKey = vapidPublicKey;
    }
    this.reconnectAttempts = 0;
  }

  /**
   * Subscribe to real-time notifications for a user
   */
  async subscribeToNotifications(
    userId: string,
    onNotification: (notification: Notification) => void
  ): Promise<RealtimeChannel | null> {
    if (!this.supabase) {
      console.error('[NotificationService] Not initialized');
      return null;
    }

    try {
      // Unsubscribe from existing channel first
      if (this.channel) {
        await this.supabase.removeChannel(this.channel);
      }

      this.channel = this.supabase
        .channel(`notifications:${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`,
          },
          (payload) => {
            try {
              const notification = payload.new as Notification;
              onNotification(notification);
            } catch (error) {
              console.error('[NotificationService] Error processing notification:', error);
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            this.reconnectAttempts = 0;
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.handleReconnect(userId, onNotification);
          }
        });

      return this.channel;
    } catch (error) {
      console.error('[NotificationService] Error subscribing to notifications:', error);
      return null;
    }
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private async handleReconnect(
    userId: string,
    onNotification: (notification: Notification) => void
  ): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[NotificationService] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[NotificationService] Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      this.subscribeToNotifications(userId, onNotification);
    }, delay);
  }

  /**
   * Unsubscribe from notifications
   */
  async unsubscribe(): Promise<void> {
    if (this.channel && this.supabase) {
      try {
        await this.supabase.removeChannel(this.channel);
        this.channel = null;
      } catch (error) {
        console.error('[NotificationService] Error unsubscribing:', error);
      }
    }
  }

  /**
   * Fetch notifications for a user
   */
  async getNotifications(
    userId: string,
    options?: {
      limit?: number;
      unreadOnly?: boolean;
      type?: NotificationType;
    }
  ): Promise<Notification[]> {
    if (!this.supabase) return [];

    try {
      let query = this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.unreadOnly) {
        query = query.eq('is_read', false);
      }

      if (options?.type) {
        query = query.eq('type', options.type);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[NotificationService] Error fetching notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('[NotificationService] Unexpected error fetching notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) {
        console.error('[NotificationService] Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NotificationService] Unexpected error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('[NotificationService] Error marking all notifications as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NotificationService] Unexpected error marking all notifications as read:', error);
      return false;
    }
  }

  /**
   * Create a new notification
   */
  async createNotification(
    notification: Omit<Notification, 'id' | 'created_at'>
  ): Promise<Notification | null> {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .insert(notification)
        .select()
        .single();

      if (error) {
        console.error('[NotificationService] Error creating notification:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[NotificationService] Unexpected error creating notification:', error);
      return null;
    }
  }

  /**
   * Send notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    notification: Omit<Notification, 'id' | 'user_id' | 'created_at'>
  ): Promise<boolean> {
    if (!this.supabase || userIds.length === 0) return false;

    try {
      const notifications = userIds.map((userId) => ({
        ...notification,
        user_id: userId,
      }));

      const { error } = await this.supabase
        .from('notifications')
        .insert(notifications);

      if (error) {
        console.error('[NotificationService] Error sending notifications:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NotificationService] Unexpected error sending notifications:', error);
      return false;
    }
  }

  /**
   * Get unread count for a user
   */
  async getUnreadCount(userId: string): Promise<number> {
    if (!this.supabase) return 0;

    try {
      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false);

      if (error) {
        console.error('[NotificationService] Error getting unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('[NotificationService] Unexpected error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('[NotificationService] Error deleting notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NotificationService] Unexpected error deleting notification:', error);
      return false;
    }
  }

  /**
   * Cleanup old notifications
   */
  async cleanupOldNotifications(userId: string, daysOld = 30): Promise<number> {
    if (!this.supabase) return 0;

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const { error, count } = await this.supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .lt('created_at', cutoffDate.toISOString())
        .eq('is_read', true)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('[NotificationService] Error cleaning up notifications:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('[NotificationService] Unexpected error cleaning up notifications:', error);
      return 0;
    }
  }

  /**
   * Get notification preferences for a user
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    if (!this.supabase) {
      return this.getDefaultPreferences(userId);
    }

    try {
      const { data, error } = await this.supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        return this.getDefaultPreferences(userId);
      }

      return data;
    } catch (error) {
      console.error('[NotificationService] Error getting preferences:', error);
      return this.getDefaultPreferences(userId);
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('[NotificationService] Error updating preferences:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NotificationService] Unexpected error updating preferences:', error);
      return false;
    }
  }

  /**
   * Register push subscription
   */
  async registerPushSubscription(
    userId: string,
    subscription: PushSubscriptionData
  ): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase
        .from('push_subscriptions')
        .upsert(subscription);

      if (error) {
        console.error('[NotificationService] Error registering push subscription:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NotificationService] Unexpected error registering push subscription:', error);
      return false;
    }
  }

  /**
   * Unregister push subscription
   */
  async unregisterPushSubscription(subscriptionId: string): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase
        .from('push_subscriptions')
        .delete()
        .eq('id', subscriptionId);

      if (error) {
        console.error('[NotificationService] Error unregistering push subscription:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[NotificationService] Unexpected error unregistering push subscription:', error);
      return false;
    }
  }

  /**
   * Request notification permission from browser
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('[NotificationService] Browser does not support notifications');
      return 'denied';
    }

    try {
      return await Notification.requestPermission();
    } catch (error) {
      console.error('[NotificationService] Error requesting notification permission:', error);
      return 'denied';
    }
  }

  /**
   * Show browser notification
   */
  async showBrowserNotification(
    title: string,
    options?: NotificationOptions
  ): Promise<boolean> {
    try {
      const permission = await this.requestNotificationPermission();

      if (permission !== 'granted') {
        console.warn('[NotificationService] Notification permission not granted');
        return false;
      }

      const notification = new Notification(title, {
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 5 seconds
      setTimeout(() => notification.close(), 5000);

      return true;
    } catch (error) {
      console.error('[NotificationService] Error showing browser notification:', error);
      return false;
    }
  }

  /**
   * Get default preferences
   */
  private getDefaultPreferences(userId: string): NotificationPreferences {
    return {
      user_id: userId,
      email_enabled: false,
      push_enabled: true,
      in_app_enabled: true,
      quiet_hours_enabled: false,
      enabled_types: [],
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const notificationService = new NotificationService();

// ============================================================================
// React Hook
// ============================================================================

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  newNotification: Notification | null;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
}

export function useNotifications(userId: string | null): UseNotificationsReturn {
  const queryClient = useQueryClient();
  const newNotificationRef = useRef<Notification | null>(null);
  const [newNotification, setNewNotification] = useState<Notification | null>(null);

  // Fetch notifications with React Query
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => notificationService.getNotifications(userId!),
    enabled: !!userId,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  // Fetch unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread', userId],
    queryFn: () => notificationService.getUnreadCount(userId!),
    enabled: !!userId,
    refetchInterval: 30000,
    staleTime: 5000,
  });

  // Subscribe to real-time updates
  useEffect(() => {
    if (!userId) return;

    const handleNotification = (notification: Notification) => {
      newNotificationRef.current = notification;
      setNewNotification(notification);

      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });

      // Show browser notification
      notificationService.showBrowserNotification(notification.title, {
        body: notification.message,
        tag: notification.id,
      });
    };

    const channel = notificationService.subscribeToNotifications(userId, handleNotification);

    return () => {
      notificationService.unsubscribe();
    };
  }, [userId, queryClient]);

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (notificationId: string) =>
      notificationService.markAsRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  // Delete notification mutation
  const deleteMutation = useMutation({
    mutationFn: (notificationId: string) =>
      notificationService.deleteNotification(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  return {
    notifications,
    unreadCount,
    isLoading,
    newNotification,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
    deleteNotification: deleteMutation.mutate,
  };
}

export default notificationService;
