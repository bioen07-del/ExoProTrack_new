import { Badge, type BadgeProps } from './badge';
import { STATUS_CONFIG, type StatusKey } from '../../lib/status-config';
import { cn } from '../../lib/utils';

interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: StatusKey;
  showDot?: boolean;
}

export function StatusBadge({ status, showDot = false, className, ...props }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  if (!config) {
    return <Badge variant="outline" className={className} {...props}>{String(status)}</Badge>;
  }

  return (
    <Badge variant={config.variant} className={cn('gap-1.5', className)} {...props}>
      {showDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />
      )}
      {config.label}
    </Badge>
  );
}
