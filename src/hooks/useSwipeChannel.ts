import { useRef, useCallback } from "react";

interface UseSwipeChannelOptions {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  threshold?: number;
}

export function useSwipeChannel({ onSwipeLeft, onSwipeRight, threshold = 60 }: UseSwipeChannelOptions) {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const swiping = useRef(false);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
    swiping.current = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    // Only consider horizontal swipes (angle check)
    if (Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiping.current = true;
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const elapsed = Date.now() - touchStartRef.current.time;

    touchStartRef.current = null;

    // Must be a fast, horizontal swipe
    if (elapsed > 500 || Math.abs(dy) > Math.abs(dx)) return;
    if (Math.abs(dx) < threshold) return;

    if (dx < -threshold) {
      onSwipeLeft(); // Next channel
    } else if (dx > threshold) {
      onSwipeRight(); // Previous channel
    }
  }, [onSwipeLeft, onSwipeRight, threshold]);

  return { onTouchStart, onTouchMove, onTouchEnd };
}
