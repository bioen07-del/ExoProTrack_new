import type { badgeVariants } from '../components/ui/badge';
import type { VariantProps } from 'class-variance-authority';

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

interface StatusInfo {
  label: string;
  variant: BadgeVariant;
  dotColor: string;
}

// Centralized status configuration — single source of truth
export const STATUS_CONFIG: Record<string, StatusInfo> = {
  // CM Lot statuses
  Planned:        { label: 'Запланирован',     variant: 'muted',       dotColor: 'bg-gray-400' },
  In_Production:  { label: 'В производстве',   variant: 'warning',     dotColor: 'bg-yellow-500' },
  In_Processing:  { label: 'В обработке',      variant: 'warning',     dotColor: 'bg-yellow-500' },
  QC_Pending:     { label: 'Ожидает QC',       variant: 'warning',     dotColor: 'bg-orange-500' },
  QC_In_Progress: { label: 'QC в процессе',    variant: 'info',        dotColor: 'bg-blue-500' },
  QC_Completed:   { label: 'QC завершён',      variant: 'success',     dotColor: 'bg-green-500' },
  QA_Pending:     { label: 'Ожидает QA',       variant: 'warning',     dotColor: 'bg-orange-500' },
  QA_Approved:    { label: 'QA одобрен',       variant: 'success',     dotColor: 'bg-green-500' },
  QA_Rejected:    { label: 'QA отклонён',      variant: 'destructive', dotColor: 'bg-red-500' },
  Released:       { label: 'Выпущен',          variant: 'success',     dotColor: 'bg-emerald-500' },
  On_Hold:        { label: 'Приостановлен',    variant: 'warning',     dotColor: 'bg-yellow-500' },
  Archived:       { label: 'Архивирован',      variant: 'muted',       dotColor: 'bg-gray-400' },
  // Request statuses
  Draft:          { label: 'Черновик',          variant: 'muted',       dotColor: 'bg-gray-400' },
  Submitted:      { label: 'Отправлен',         variant: 'info',        dotColor: 'bg-blue-500' },
  In_Review:      { label: 'На рассмотрении',  variant: 'info',        dotColor: 'bg-blue-500' },
  Approved:       { label: 'Одобрен',           variant: 'success',     dotColor: 'bg-green-500' },
  Rejected:       { label: 'Отклонён',          variant: 'destructive', dotColor: 'bg-red-500' },
  Completed:      { label: 'Завершён',          variant: 'success',     dotColor: 'bg-green-500' },
  Cancelled:      { label: 'Отменён',           variant: 'destructive', dotColor: 'bg-red-500' },
  // Pack Lot statuses
  Filling:        { label: 'Розлив',            variant: 'warning',     dotColor: 'bg-yellow-500' },
  Filled:         { label: 'Разлито',           variant: 'success',     dotColor: 'bg-green-500' },
  Pack_Completed: { label: 'Упаковка завершена',variant: 'success',     dotColor: 'bg-green-500' },
  Shipped:        { label: 'Отгружен',          variant: 'secondary',   dotColor: 'bg-purple-500' },
};

export type StatusKey = keyof typeof STATUS_CONFIG;

/** Get human-readable label for a status */
export function getStatusLabel(status: string): string {
  return STATUS_CONFIG[status]?.label || status;
}

/** Get badge variant for a status */
export function getStatusVariant(status: string): BadgeVariant {
  return STATUS_CONFIG[status]?.variant || 'outline';
}
