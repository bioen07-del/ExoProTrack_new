import { useState, useEffect, useCallback } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { usePWAInstall } from '@/hooks/use-pwa';

const DISMISS_KEY = 'pwa-install-dismissed';

export function PWAInstallPrompt() {
  const { canInstall, promptInstall } = usePWAInstall();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    return localStorage.getItem(DISMISS_KEY) === 'true';
  });
  const [isStandalone, setIsStandalone] = useState<boolean>(false);

  useEffect(() => {
    // Проверяем, запущено ли приложение в standalone-режиме
    const mql = window.matchMedia('(display-mode: standalone)');
    setIsStandalone(mql.matches);

    const handler = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    await promptInstall();
  }, [promptInstall]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(DISMISS_KEY, 'true');
  }, []);

  const isVisible = canInstall && !dismissed && !isStandalone;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={cn(
            'fixed bottom-20 left-4 right-4 z-[45]',
            'sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm'
          )}
        >
          <Card className="border-border bg-card shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Иконка */}
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                  <Download size={20} />
                </div>

                {/* Текст */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-foreground">
                    Установить EXO ProTrack
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Быстрый доступ без браузера
                  </p>
                </div>

                {/* Кнопка закрытия */}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleDismiss}
                  aria-label="Закрыть"
                  className="flex-shrink-0 -mt-1 -mr-1 text-muted-foreground hover:text-foreground"
                >
                  <X size={16} />
                </Button>
              </div>

              {/* Кнопка установки */}
              <div className="mt-3">
                <Button
                  onClick={handleInstall}
                  size="sm"
                  className="w-full"
                >
                  <Download size={16} className="mr-2" />
                  Установить
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
