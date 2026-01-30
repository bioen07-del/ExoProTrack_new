import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePWAUpdate } from '@/hooks/use-pwa';

const AUTO_DISMISS_MS = 30_000;

export function PWAUpdateBanner() {
  const { hasUpdate, updateApp } = usePWAUpdate();
  const [visible, setVisible] = useState<boolean>(false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Показываем баннер при обнаружении обновления
  useEffect(() => {
    if (hasUpdate) {
      setVisible(true);
    }
  }, [hasUpdate]);

  // Автоскрытие через 30 секунд
  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      setVisible(false);
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
  }, [visible]);

  const handleUpdate = useCallback(async () => {
    setIsUpdating(true);
    try {
      await updateApp();
    } catch {
      // Обновление будет применено при следующей загрузке
      setIsUpdating(false);
    }
  }, [updateApp]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            'fixed top-14 left-0 right-0 z-[35]',
            'flex items-center justify-between gap-3',
            'px-4 py-2.5',
            'bg-primary text-primary-foreground',
            'shadow-md'
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <RefreshCw size={16} className={cn(isUpdating && 'animate-spin')} />
            <span className="text-sm font-medium truncate">
              Доступно обновление
            </span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleUpdate}
            disabled={isUpdating}
            className="flex-shrink-0"
          >
            {isUpdating ? 'Обновление...' : 'Обновить'}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
