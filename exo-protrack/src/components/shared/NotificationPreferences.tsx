import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, Settings, Check, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/api/supabase';
import { useAuth } from '@/context/AuthContext';
import { useNotificationPermission } from '@/hooks/use-notifications';
import { showSuccess, showError } from '@/lib/toast';

// ── Types ──────────────────────────────────────────────────────────

type NotificationType =
  | 'request_created'
  | 'request_status_changed'
  | 'cm_lot_qc_pending'
  | 'cm_lot_qc_completed'
  | 'cm_lot_qa_decision'
  | 'cm_lot_ready_for_filling'
  | 'pack_lot_qc_required'
  | 'expiry_warning'
  | 'reservation_confirmed'
  | 'general';

type Channel = 'in_app' | 'push';

interface Subscription {
  subscription_id: string;
  user_id: string;
  notification_type: NotificationType;
  channel: Channel;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ── Static data ────────────────────────────────────────────────────

interface NotificationTypeInfo {
  type: NotificationType;
  label: string;
}

interface NotificationCategory {
  name: string;
  types: NotificationTypeInfo[];
}

const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    name: 'Заявки',
    types: [
      { type: 'request_created', label: 'Новая заявка' },
      { type: 'request_status_changed', label: 'Изменение статуса заявки' },
    ],
  },
  {
    name: 'QC',
    types: [
      { type: 'cm_lot_qc_pending', label: 'QC ожидает' },
      { type: 'cm_lot_qc_completed', label: 'QC завершён' },
      { type: 'pack_lot_qc_required', label: 'QC пакета требуется' },
    ],
  },
  {
    name: 'QA',
    types: [
      { type: 'cm_lot_qa_decision', label: 'Решение QA' },
      { type: 'cm_lot_ready_for_filling', label: 'Готов к наливу' },
    ],
  },
  {
    name: 'Другое',
    types: [
      { type: 'expiry_warning', label: 'Предупреждение о сроке годности' },
      { type: 'reservation_confirmed', label: 'Резервация подтверждена' },
      { type: 'general', label: 'Общие' },
    ],
  },
];

const CHANNELS: { key: Channel; label: string }[] = [
  { key: 'in_app', label: 'В приложении' },
  { key: 'push', label: 'Push' },
];

// ── Query keys ─────────────────────────────────────────────────────

const subscriptionKeys = {
  all: ['notification-subscriptions'] as const,
  list: (userId: string) => [...subscriptionKeys.all, userId] as const,
};

// ── Helpers ────────────────────────────────────────────────────────

function isEnabled(
  subscriptions: Subscription[],
  notificationType: NotificationType,
  channel: Channel,
): boolean {
  const sub = subscriptions.find(
    (s) => s.notification_type === notificationType && s.channel === channel,
  );
  // Default to true if no subscription record exists yet
  return sub ? sub.is_enabled : true;
}

// ── Component ──────────────────────────────────────────────────────

export function NotificationPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { permission, requestPermission, isGranted, isDenied } =
    useNotificationPermission();

  // ── Fetch subscriptions ────────────────────────────────────────

  const {
    data: subscriptions = [],
    isLoading,
  } = useQuery({
    queryKey: subscriptionKeys.list(user?.user_id ?? ''),
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('notification_subscriptions')
        .select('*')
        .eq('user_id', user.user_id);

      if (error) throw new Error(error.message);
      return data as Subscription[];
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  // ── Toggle mutation (optimistic) ──────────────────────────────

  const toggleMutation = useMutation({
    mutationFn: async ({
      notificationType,
      channel,
      enabled,
    }: {
      notificationType: NotificationType;
      channel: Channel;
      enabled: boolean;
    }) => {
      if (!user) throw new Error('Не авторизован');

      const { error } = await supabase
        .from('notification_subscriptions')
        .upsert(
          {
            user_id: user.user_id,
            notification_type: notificationType,
            channel,
            is_enabled: enabled,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,notification_type,channel' },
        );

      if (error) throw new Error(error.message);
    },

    onMutate: async ({ notificationType, channel, enabled }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: subscriptionKeys.list(user?.user_id ?? ''),
      });

      // Snapshot previous value
      const previous = queryClient.getQueryData<Subscription[]>(
        subscriptionKeys.list(user?.user_id ?? ''),
      );

      // Optimistic update
      queryClient.setQueryData<Subscription[]>(
        subscriptionKeys.list(user?.user_id ?? ''),
        (old = []) => {
          const idx = old.findIndex(
            (s) =>
              s.notification_type === notificationType && s.channel === channel,
          );

          if (idx >= 0) {
            const updated = [...old];
            updated[idx] = { ...updated[idx], is_enabled: enabled };
            return updated;
          }

          // Create optimistic record
          return [
            ...old,
            {
              subscription_id: crypto.randomUUID(),
              user_id: user?.user_id ?? '',
              notification_type: notificationType,
              channel,
              is_enabled: enabled,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ];
        },
      );

      return { previous };
    },

    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(
          subscriptionKeys.list(user?.user_id ?? ''),
          context.previous,
        );
      }
      showError('Не удалось сохранить настройку');
    },

    onSuccess: () => {
      showSuccess('Настройка сохранена');
    },

    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: subscriptionKeys.list(user?.user_id ?? ''),
      });
    },
  });

  // ── Toggle handler ─────────────────────────────────────────────

  const handleToggle = useCallback(
    (notificationType: NotificationType, channel: Channel) => {
      const current = isEnabled(subscriptions, notificationType, channel);
      toggleMutation.mutate({
        notificationType,
        channel,
        enabled: !current,
      });
    },
    [subscriptions, toggleMutation],
  );

  // ── Render ─────────────────────────────────────────────────────

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Настройки уведомлений</CardTitle>
        </div>
        <CardDescription>
          Управление каналами уведомлений
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── Browser permission section ── */}
        <div
          className={cn(
            'flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between',
            isGranted && 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30',
            isDenied && 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30',
            !isGranted && !isDenied && 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30',
          )}
        >
          <div className="flex items-center gap-3">
            {isGranted ? (
              <Bell className="h-5 w-5 text-green-600 dark:text-green-400" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-sm font-medium">
                Push-уведомления в браузере
              </p>
              <p className="text-xs text-muted-foreground">
                {isGranted && 'Разрешены'}
                {isDenied && 'Заблокированы в настройках браузера'}
                {!isGranted && !isDenied && 'Не настроены'}
              </p>
            </div>
          </div>

          {isGranted ? (
            <Badge variant="success" className="self-start sm:self-auto">
              <Check className="mr-1 h-3 w-3" />
              Активно
            </Badge>
          ) : isDenied ? (
            <Badge variant="destructive" className="self-start sm:self-auto">
              Заблокировано
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={requestPermission}
            >
              Разрешить
            </Button>
          )}
        </div>

        {/* ── Notification types table ── */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 pr-4 text-left text-sm font-medium text-muted-foreground">
                    Тип уведомления
                  </th>
                  {CHANNELS.map((ch) => (
                    <th
                      key={ch.key}
                      className="pb-3 px-3 text-center text-sm font-medium text-muted-foreground whitespace-nowrap"
                    >
                      {ch.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {NOTIFICATION_CATEGORIES.map((category) => (
                  <CategoryGroup
                    key={category.name}
                    category={category}
                    subscriptions={subscriptions}
                    onToggle={handleToggle}
                    isToggling={toggleMutation.isPending}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function CategoryGroup({
  category,
  subscriptions,
  onToggle,
  isToggling,
}: {
  category: NotificationCategory;
  subscriptions: Subscription[];
  onToggle: (type: NotificationType, channel: Channel) => void;
  isToggling: boolean;
}) {
  return (
    <>
      {/* Category header row */}
      <tr>
        <td
          colSpan={CHANNELS.length + 1}
          className="pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          {category.name}
        </td>
      </tr>

      {/* Type rows */}
      {category.types.map((info) => (
        <tr
          key={info.type}
          className="border-b border-border/50 last:border-b-0"
        >
          <td className="py-3 pr-4 text-sm">{info.label}</td>
          {CHANNELS.map((ch) => {
            const enabled = isEnabled(subscriptions, info.type, ch.key);
            return (
              <td key={ch.key} className="py-3 px-3 text-center">
                <ToggleSwitch
                  checked={enabled}
                  onChange={() => onToggle(info.type, ch.key)}
                  disabled={isToggling}
                  label={`${info.label} - ${ch.label}`}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked
          ? 'bg-primary'
          : 'bg-slate-200 dark:bg-slate-700',
      )}
    >
      <span
        className={cn(
          'pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {/* Table header skeleton */}
      <div className="flex items-center gap-4 border-b pb-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-24 ml-auto" />
        <Skeleton className="h-4 w-16" />
      </div>

      {/* Row skeletons */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          {/* Render a wider skeleton for category headers every 3 rows */}
          {i % 3 === 0 ? (
            <Skeleton className="h-3 w-16" />
          ) : (
            <>
              <Skeleton className="h-4 w-44" />
              <Skeleton className="h-6 w-11 rounded-full ml-auto" />
              <Skeleton className="h-6 w-11 rounded-full" />
            </>
          )}
        </div>
      ))}
    </div>
  );
}
