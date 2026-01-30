import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationPreferences } from '@/components/shared/NotificationPreferences';
import {
  Bell,
  BellOff,
  Search,
  CheckCheck,
  Trash2,
  Eye,
  Loader2,
  ArrowRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { showSuccess, showError } from '@/lib/toast';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useNotificationPermission,
} from '@/hooks/use-notifications';
import type { Database } from '@/types/database';

type Notification = Database['public']['Tables']['notifications']['Row'];

// --- Constants ---

const TYPE_ICONS: Record<string, string> = {
  cm_lot_qc_pending: '\u{1F52C}',      // microscope
  pack_lot_qc_required: '\u{1F52C}',   // microscope
  cm_lot_qa_decision: '\u{2705}',      // check
  request_created: '\u{1F4CB}',        // clipboard
  request_status_changed: '\u{1F4CB}', // clipboard
  expiry_warning: '\u{26A0}\u{FE0F}',  // warning
};

const DEFAULT_ICON = '\u{1F514}'; // bell

const QC_QA_TYPES = ['cm_lot_qc_pending', 'pack_lot_qc_required', 'cm_lot_qa_decision'];
const REQUEST_TYPES = ['request_created', 'request_status_changed'];
const EXPIRY_TYPES = ['expiry_warning'];

type TabValue = 'all' | 'unread' | 'qc_qa' | 'requests' | 'expiry';

const ENTITY_ROUTES: Record<string, string> = {
  cm_lot: '/cm',
  request: '/requests',
  pack_lot: '/products',
  reservation: '/warehouse',
};

// --- Helpers ---

function getIcon(type: string): string {
  return TYPE_ICONS[type] || DEFAULT_ICON;
}

function getPriorityBorder(priority: string | null): string {
  switch (priority) {
    case 'urgent':
      return 'border-l-4 border-l-red-500';
    case 'low':
      return 'border-l-4 border-l-gray-300 dark:border-l-gray-600';
    default:
      return 'border-l-4 border-l-transparent';
  }
}

function getEntityPath(entityType: string | null, entityId: string | null): string | null {
  if (!entityType || !entityId) return null;
  const base = ENTITY_ROUTES[entityType];
  if (!base) return null;
  if (entityType === 'reservation') return base;
  return `${base}/${entityId}`;
}

function groupByDate(notifications: Notification[]): {
  label: string;
  items: Notification[];
}[] {
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const earlier: Notification[] = [];

  for (const n of notifications) {
    const date = n.created_at ? new Date(n.created_at) : null;
    if (!date) {
      earlier.push(n);
      continue;
    }
    if (isToday(date)) {
      today.push(n);
    } else if (isYesterday(date)) {
      yesterday.push(n);
    } else {
      earlier.push(n);
    }
  }

  const groups: { label: string; items: Notification[] }[] = [];
  if (today.length > 0) groups.push({ label: '\u0421\u0435\u0433\u043E\u0434\u043D\u044F', items: today });
  if (yesterday.length > 0) groups.push({ label: '\u0412\u0447\u0435\u0440\u0430', items: yesterday });
  if (earlier.length > 0) groups.push({ label: '\u0420\u0430\u043D\u0435\u0435', items: earlier });
  return groups;
}

function filterByTab(notifications: Notification[], tab: TabValue): Notification[] {
  switch (tab) {
    case 'unread':
      return notifications.filter((n) => !n.is_read);
    case 'qc_qa':
      return notifications.filter((n) => QC_QA_TYPES.includes(n.type));
    case 'requests':
      return notifications.filter((n) => REQUEST_TYPES.includes(n.type));
    case 'expiry':
      return notifications.filter((n) => EXPIRY_TYPES.includes(n.type));
    default:
      return notifications;
  }
}

// --- Animation variants ---

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.25, ease: 'easeOut' },
  }),
  exit: { opacity: 0, x: -20, transition: { duration: 0.2 } },
};

// --- Component ---

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabValue>('all');
  const [search, setSearch] = useState('');

  // Data hooks
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const deleteNotification = useDeleteNotification();
  const { permission, requestPermission, isGranted, isDenied } = useNotificationPermission();

  // Derived state
  const unreadCount = useMemo(
    () => notifications?.filter((n) => !n.is_read).length ?? 0,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    if (!notifications) return [];

    let result = filterByTab(notifications, activeTab);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.message && n.message.toLowerCase().includes(q))
      );
    }

    return result;
  }, [notifications, activeTab, search]);

  const groupedNotifications = useMemo(
    () => groupByDate(filteredNotifications),
    [filteredNotifications]
  );

  // Handlers
  async function handleMarkAllAsRead() {
    try {
      await markAllAsRead.mutateAsync();
      showSuccess('\u0412\u0441\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u044B \u043A\u0430\u043A \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u043D\u044B\u0435');
    } catch {
      showError('\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F');
    }
  }

  async function handleMarkAsRead(notificationId: string) {
    try {
      await markAsRead.mutateAsync(notificationId);
    } catch {
      showError('\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435');
    }
  }

  async function handleDelete(notificationId: string) {
    try {
      await deleteNotification.mutateAsync(notificationId);
      showSuccess('\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u043E');
    } catch {
      showError('\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435');
    }
  }

  function handleNavigate(n: Notification) {
    const path = getEntityPath(n.entity_type, n.entity_id);
    if (path) {
      if (!n.is_read) {
        markAsRead.mutate(n.notification_id);
      }
      navigate(path);
    }
  }

  async function handleToggleBrowserNotifications() {
    if (isGranted) return;
    const result = await requestPermission();
    if (result === 'granted') {
      showSuccess('\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435 \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u044B');
    } else {
      showError('\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435 \u043D\u0435 \u043F\u0440\u0435\u0434\u043E\u0441\u0442\u0430\u0432\u043B\u0435\u043D\u043E');
    }
  }

  // --- Render ---

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            {'\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F'}
          </h1>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs px-2 py-0.5">
              {unreadCount}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleBrowserNotifications}
            disabled={isDenied}
            className="min-h-[44px]"
            title={
              isGranted
                ? '\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0432\u043A\u043B\u044E\u0447\u0435\u043D\u044B'
                : isDenied
                  ? '\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u044B'
                  : '\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F'
            }
          >
            {isGranted ? (
              <Bell className="h-4 w-4 text-green-500" />
            ) : (
              <BellOff className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="ml-1.5 hidden sm:inline">
              {isGranted
                ? '\u0412\u043A\u043B\u044E\u0447\u0435\u043D\u044B'
                : isDenied
                  ? '\u0417\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043D\u044B'
                  : '\u0412\u043A\u043B\u044E\u0447\u0438\u0442\u044C'}
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || markAllAsRead.isPending}
            className="min-h-[44px]"
          >
            <CheckCheck className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">
              {'\u041E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u0432\u0441\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u043D\u044B\u043C\u0438'}
            </span>
            <span className="sm:hidden">
              {'\u0412\u0441\u0435 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u043E'}
            </span>
          </Button>
        </div>
      </div>

      {/* Tabs + Search */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as TabValue)}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="w-full sm:w-auto overflow-x-auto">
            <TabsTrigger value="all" className="min-h-[44px]">
              {'\u0412\u0441\u0435'}
            </TabsTrigger>
            <TabsTrigger value="unread" className="min-h-[44px]">
              {'\u041D\u0435\u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u043D\u044B\u0435'}
            </TabsTrigger>
            <TabsTrigger value="qc_qa" className="min-h-[44px]">
              QC/QA
            </TabsTrigger>
            <TabsTrigger value="requests" className="min-h-[44px]">
              {'\u0417\u0430\u044F\u0432\u043A\u0438'}
            </TabsTrigger>
            <TabsTrigger value="expiry" className="min-h-[44px]">
              {'\u0421\u0440\u043E\u043A \u0433\u043E\u0434\u043D\u043E\u0441\u0442\u0438'}
            </TabsTrigger>
          </TabsList>

          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={'\u041F\u043E\u0438\u0441\u043A \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0439...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 min-h-[44px]"
            />
          </div>
        </div>

        {/* All tabs render the same content (filtered) */}
        {(['all', 'unread', 'qc_qa', 'requests', 'expiry'] as TabValue[]).map(
          (tab) => (
            <TabsContent key={tab} value={tab}>
              {filteredNotifications.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="space-y-6 mt-4">
                  {groupedNotifications.map((group) => (
                    <div key={group.label} className="space-y-3">
                      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                        {group.label}
                      </h2>
                      <AnimatePresence mode="popLayout">
                        {group.items.map((notification, index) => (
                          <NotificationCard
                            key={notification.notification_id}
                            notification={notification}
                            index={index}
                            onMarkAsRead={handleMarkAsRead}
                            onDelete={handleDelete}
                            onNavigate={handleNavigate}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          )
        )}
      </Tabs>

      {/* Notification Preferences */}
      <NotificationPreferences />
    </div>
  );
}

// --- Sub-components ---

function EmptyState() {
  return (
    <Card className="mt-8">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Bell className="h-12 w-12 text-muted-foreground/40 mb-4" />
        <p className="text-lg font-medium text-muted-foreground">
          {'\u041D\u0435\u0442 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0439'}
        </p>
        <p className="text-sm text-muted-foreground/60 mt-1">
          {'\u041D\u043E\u0432\u044B\u0435 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F \u043F\u043E\u044F\u0432\u044F\u0442\u0441\u044F \u0437\u0434\u0435\u0441\u044C'}
        </p>
      </CardContent>
    </Card>
  );
}

interface NotificationCardProps {
  notification: Notification;
  index: number;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (n: Notification) => void;
}

function NotificationCard({
  notification,
  index,
  onMarkAsRead,
  onDelete,
  onNavigate,
}: NotificationCardProps) {
  const n = notification;
  const isUnread = !n.is_read;
  const icon = getIcon(n.type);
  const entityPath = getEntityPath(n.entity_type, n.entity_id);

  const relativeTime = n.created_at
    ? formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ru })
    : null;

  const fullDate = n.created_at
    ? format(new Date(n.created_at), 'd MMMM yyyy, HH:mm', { locale: ru })
    : null;

  return (
    <motion.div
      layout
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      custom={index}
    >
      <Card
        className={cn(
          'transition-colors hover:bg-accent/50',
          getPriorityBorder(n.priority),
          isUnread && 'bg-accent/30'
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Type icon */}
            <div className="flex-shrink-0 text-2xl leading-none mt-0.5" aria-hidden>
              {icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3
                      className={cn(
                        'text-sm leading-tight truncate',
                        isUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/80'
                      )}
                    >
                      {n.title}
                    </h3>
                    {isUnread && (
                      <span className="flex-shrink-0 h-2 w-2 rounded-full bg-blue-500" />
                    )}
                  </div>

                  {n.message && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {n.message}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {relativeTime && (
                      <span
                        className="text-xs text-muted-foreground"
                        title={fullDate || undefined}
                      >
                        {relativeTime}
                      </span>
                    )}

                    {n.priority === 'urgent' && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                        {'\u0421\u0440\u043E\u0447\u043D\u043E'}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {entityPath && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate(n)}
                      className="min-h-[44px] min-w-[44px] text-xs"
                      title={'\u041E\u0442\u043A\u0440\u044B\u0442\u044C'}
                    >
                      <span className="hidden sm:inline mr-1">
                        {'\u041E\u0442\u043A\u0440\u044B\u0442\u044C'}
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}

                  {isUnread && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onMarkAsRead(n.notification_id)}
                      className="min-h-[44px] min-w-[44px]"
                      title={'\u041E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u043A\u0430\u043A \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u043D\u043D\u043E\u0435'}
                    >
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(n.notification_id)}
                    className="min-h-[44px] min-w-[44px] text-destructive hover:text-destructive"
                    title={'\u0423\u0434\u0430\u043B\u0438\u0442\u044C'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
