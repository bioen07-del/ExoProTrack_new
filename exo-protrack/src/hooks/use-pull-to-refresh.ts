import { useState, useEffect, useCallback, useRef } from 'react';

interface UsePullToRefreshReturn {
  isRefreshing: boolean;
  pullProgress: number;
  containerRef: React.RefObject<HTMLDivElement>;
}

const PULL_THRESHOLD = 80;

/**
 * Custom hook for pull-to-refresh on mobile touch devices.
 *
 * Activates only when:
 * - The device supports coarse pointer (touch)
 * - The container is scrolled to the top (scrollTop <= 0)
 *
 * Provides visual feedback via pullProgress (0 to 1) during the pull gesture.
 * When the threshold is reached and the finger is released, calls onRefresh().
 */
export function usePullToRefresh(
  onRefresh: () => Promise<void>
): UsePullToRefreshReturn {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullProgress, setPullProgress] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null!);

  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const isTouchDeviceRef = useRef(false);

  // Check if the device is a touch device (coarse pointer)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(pointer: coarse)');
    isTouchDeviceRef.current = mq.matches;

    const handleChange = (e: MediaQueryListEvent) => {
      isTouchDeviceRef.current = e.matches;
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!isTouchDeviceRef.current) return;
      if (isRefreshing) return;

      const container = containerRef.current;
      if (!container) return;

      // Only activate when scrolled to top
      if (container.scrollTop > 0) return;

      startYRef.current = e.touches[0].clientY;
      pullingRef.current = true;
    },
    [isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!pullingRef.current) return;
      if (isRefreshing) return;

      const currentY = e.touches[0].clientY;
      const pullDistance = currentY - startYRef.current;

      // Only handle downward pull
      if (pullDistance <= 0) {
        setPullProgress(0);
        return;
      }

      // Prevent default scroll behavior during pull
      e.preventDefault();

      const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);
      setPullProgress(progress);
    },
    [isRefreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pullingRef.current) return;
    pullingRef.current = false;

    if (pullProgress >= 1 && !isRefreshing) {
      setIsRefreshing(true);
      setPullProgress(0);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    } else {
      setPullProgress(0);
    }
  }, [pullProgress, isRefreshing, onRefresh]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const container = containerRef.current;
    if (!container) return;

    // Use passive: false for touchmove to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, {
      passive: true,
    });
    container.addEventListener('touchmove', handleTouchMove, {
      passive: false,
    });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    isRefreshing,
    pullProgress,
    containerRef,
  };
}
