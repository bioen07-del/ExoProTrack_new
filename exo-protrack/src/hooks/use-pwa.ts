import { useState, useEffect, useCallback } from 'react';
import { useOnlineStatus } from './use-online-status';

// ---- Types ----

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UsePWAInstallReturn {
  canInstall: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<void>;
}

interface UsePWAUpdateReturn {
  needsUpdate: boolean;
  updateApp: () => void;
}

interface UsePWAStatusReturn {
  isStandalone: boolean;
  isOnline: boolean;
  canInstall: boolean;
  isInstalled: boolean;
}

// ---- usePWAInstall ----

/**
 * Handles PWA install prompt lifecycle.
 * Listens for `beforeinstallprompt` to determine if the app can be installed.
 * Tracks installed state via `display-mode: standalone` media query.
 */
export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Listen for the beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for successful install
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Track display-mode changes (e.g., user opens installed PWA)
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const handleStandaloneChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };
    standaloneQuery.addEventListener('change', handleStandaloneChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      standaloneQuery.removeEventListener('change', handleStandaloneChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  return {
    canInstall: deferredPrompt !== null,
    isInstalled,
    promptInstall,
  };
}

// ---- usePWAUpdate ----

/**
 * Handles service worker update detection and activation.
 * Listens for new service worker installations and provides
 * an `updateApp()` function to skip waiting and reload.
 */
export function usePWAUpdate(): UsePWAUpdateReturn {
  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(
    null
  );

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    const handleUpdate = (registration: ServiceWorkerRegistration) => {
      const newWorker = registration.installing || registration.waiting;
      if (!newWorker) return;

      // If there is already a controlling service worker,
      // a new worker means an update is available
      if (navigator.serviceWorker.controller) {
        const handleStateChange = () => {
          if (newWorker.state === 'installed') {
            setNeedsUpdate(true);
            setWaitingWorker(newWorker);
          }
        };

        // Check if already installed
        if (newWorker.state === 'installed') {
          setNeedsUpdate(true);
          setWaitingWorker(newWorker);
        } else {
          newWorker.addEventListener('statechange', handleStateChange);
        }
      }
    };

    // Check existing registration
    navigator.serviceWorker.getRegistration().then((registration) => {
      if (!registration) return;

      // If there's already a waiting worker
      if (registration.waiting) {
        setNeedsUpdate(true);
        setWaitingWorker(registration.waiting);
      }

      // Listen for new updates
      registration.addEventListener('updatefound', () => {
        handleUpdate(registration);
      });
    });

    // Listen for controller change to reload
    let refreshing = false;
    const handleControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      handleControllerChange
    );

    return () => {
      navigator.serviceWorker.removeEventListener(
        'controllerchange',
        handleControllerChange
      );
    };
  }, []);

  const updateApp = useCallback(() => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }, [waitingWorker]);

  return {
    needsUpdate,
    updateApp,
  };
}

// ---- usePWAStatus ----

/**
 * Combined PWA status hook.
 * Aggregates standalone mode, online status, and install capability.
 */
export function usePWAStatus(): UsePWAStatusReturn {
  const isOnline = useOnlineStatus();
  const { canInstall, isInstalled } = usePWAInstall();

  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(display-mode: standalone)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };

    standaloneQuery.addEventListener('change', handleChange);
    return () => standaloneQuery.removeEventListener('change', handleChange);
  }, []);

  return {
    isStandalone,
    isOnline,
    canInstall,
    isInstalled,
  };
}
