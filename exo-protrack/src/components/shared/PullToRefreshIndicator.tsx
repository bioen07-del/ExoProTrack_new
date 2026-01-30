import { ArrowDown, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface PullToRefreshIndicatorProps {
  isRefreshing: boolean;
  pullProgress: number; // 0-1
}

const MAX_HEIGHT = 48;

export function PullToRefreshIndicator({
  isRefreshing,
  pullProgress,
}: PullToRefreshIndicatorProps) {
  const clampedProgress = Math.min(Math.max(pullProgress, 0), 1);
  const height = clampedProgress * MAX_HEIGHT;
  // Стрелка поворачивается от 0 (вниз) до 180 (вверх) по мере прогресса
  const arrowRotation = clampedProgress * 180;
  const isActive = isRefreshing || clampedProgress > 0;

  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: isRefreshing ? 1 : clampedProgress }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'absolute top-0 left-0 right-0 z-10',
        'flex items-center justify-center',
        'overflow-hidden',
        'text-muted-foreground'
      )}
      style={{ height: isRefreshing ? MAX_HEIGHT : height }}
    >
      {isRefreshing ? (
        <Loader2 size={24} className="animate-spin text-primary" />
      ) : (
        <motion.div
          animate={{ rotate: arrowRotation }}
          transition={{ type: 'tween', duration: 0.1 }}
        >
          <ArrowDown size={24} className="text-muted-foreground" />
        </motion.div>
      )}
    </motion.div>
  );
}
