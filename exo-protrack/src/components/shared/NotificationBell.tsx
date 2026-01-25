import { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2, X, CheckCheck } from 'lucide-react';
import { useNotifications, useMarkAsRead, useMarkAllAsRead, useDeleteNotification } from '../../hooks/use-notifications';
import { useDeviceType } from '../../providers/ThemeProvider';
import { cn } from '../../lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface NotificationBellProps {
  className?: string;
}

export function NotificationBell({ className }: NotificationBellProps) {
  const { data: notifications = [], isLoading } = useNotifications({ limit: 20 });
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const device = useDeviceType();
  const isMobile = device === 'mobile';

  // Закрытие при клике вне
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Закрытие при ESC
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const handleNotificationClick = (notificationId: string) => {
    markAsRead.mutate(notificationId);
  };

  const handleMarkAllRead = () => {
    markAllAsRead.mutate();
  };

  const handleDelete = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    deleteNotification.mutate(notificationId);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'cm_lot_qc_pending':
      case 'pack_lot_qc_required':
        return '🔬';
      case 'cm_lot_qa_decision':
        return '✅';
      case 'expiry_warning':
        return '⚠️';
      case 'request_created':
        return '📋';
      default:
        return '🔔';
    }
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          'focus:outline-none focus:ring-2 focus:ring-ring'
        )}
        aria-label={`Уведомления${unreadCount > 0 ? ` (${unreadCount} непрочитанных)` : ''}`}
      >
        <Bell size={20} />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className={cn(
          'absolute z-50 bg-popover border rounded-lg shadow-lg',
          'animate-scale-in overflow-hidden',
          isMobile 
            ? 'fixed inset-x-4 bottom-4 top-auto max-h-[70vh]' 
            : 'w-96 max-h-96 -right-4 top-full mt-2'
        )}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b bg-card">
            <h3 className="font-semibold">Уведомления</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                  title="Отметить все как прочитанные"
                >
                  <CheckCheck size={14} />
                  Все прочитаны
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-accent"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto max-h-80">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">
                Загрузка...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                <p>Нет уведомлений</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map((notification) => (
                  <div
                    key={notification.notification_id}
                    onClick={() => handleNotificationClick(notification.notification_id)}
                    className={cn(
                      'p-4 cursor-pointer transition-colors hover:bg-accent/50',
                      !notification.is_read && 'bg-primary/5'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <span className="text-xl">
                        {getNotificationIcon(notification.type)}
                      </span>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn(
                            'font-medium text-sm',
                            !notification.is_read && 'font-semibold'
                          )}>
                            {notification.title}
                          </p>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              locale: ru,
                              addSuffix: true,
                            })}
                          </span>
                        </div>
                        {notification.message && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                        )}
                        {notification.entity_type && (
                          <a 
                            href={`/${notification.entity_type === 'cm_lot' ? 'cm' : notification.entity_type === 'request' ? 'requests' : ''}/${notification.entity_id}`}
                            className="text-xs text-primary hover:underline mt-2 inline-block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Открыть →
                          </a>
                        )}
                      </div>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => handleDelete(e, notification.notification_id)}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Unread indicator */}
                    {!notification.is_read && (
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t bg-card text-center">
              <a 
                href="/notifications" 
                className="text-sm text-primary hover:underline"
              >
                Показать все уведомления
              </a>
            </div>
          )}
        </div>
      )}

      {/* Overlay for mobile */}
      {isOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export default NotificationBell;
