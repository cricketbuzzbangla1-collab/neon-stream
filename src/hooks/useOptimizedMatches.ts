import { useMemo } from 'react';
import { FootballMatch } from './useFootballAPI';
import { deduplicateById, limitWithIndicator } from '@/lib/performanceOptimizations';

interface OptimizedMatchesOptions {
  liveLimit?: number;
  upcomingLimit?: number;
  recentLimit?: number;
}

/**
 * Hook for optimized match data processing
 * Handles deduplication, lazy loading limits, and memoization
 */
export function useOptimizedMatches(
  liveMatches: FootballMatch[],
  upcomingMatches: FootballMatch[],
  recentResults: FootballMatch[],
  options: OptimizedMatchesOptions = {}
) {
  const {
    liveLimit = 20,
    upcomingLimit = 10,
    recentLimit = 10,
  } = options;

  // Deduplicate and limit all sections
  const optimizedLive = useMemo(() => {
    const dedup = deduplicateById(liveMatches);
    return limitWithIndicator(dedup, liveLimit);
  }, [liveMatches, liveLimit]);

  const optimizedUpcoming = useMemo(() => {
    const dedup = deduplicateById(upcomingMatches);
    return limitWithIndicator(dedup, upcomingLimit);
  }, [upcomingMatches, upcomingLimit]);

  const optimizedRecent = useMemo(() => {
    const dedup = deduplicateById(recentResults);
    return limitWithIndicator(dedup, recentLimit);
  }, [recentResults, recentLimit]);

  return {
    live: optimizedLive,
    upcoming: optimizedUpcoming,
    recent: optimizedRecent,
  };
}
