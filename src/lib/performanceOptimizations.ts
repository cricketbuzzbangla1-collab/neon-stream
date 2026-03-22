/**
 * Performance optimization utilities for homepage rendering
 */

/**
 * Deduplicates items by ID while preserving insertion order
 * Useful for merging match data from multiple sources
 */
export function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      result.push(item);
    }
  }
  
  return result;
}

/**
 * Groups items into chunks for lazy loading
 * @param items Array of items to chunk
 * @param chunkSize Number of items per chunk
 */
export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  
  return chunks;
}

/**
 * Creates a memoized version of array filtering
 * Prevents unnecessary recalculations when dependencies change
 */
export function useMemoFilter<T>(
  items: T[],
  predicate: (item: T) => boolean,
  dependencies: any[]
): T[] {
  // This is intentionally simple - React's useMemo should wrap this
  return items.filter(predicate);
}

/**
 * Merge strategy for deduplicating football matches with smart data merging
 */
export function mergeMatches<T extends { id: string }>(
  matches: T[],
  selectBetter?: (a: T, b: T) => T
): T[] {
  const matchMap = new Map<string, T>();
  
  for (const match of matches) {
    const key = match.id;
    
    if (!matchMap.has(key)) {
      matchMap.set(key, match);
    } else if (selectBetter) {
      // Use custom merge strategy
      const existing = matchMap.get(key)!;
      matchMap.set(key, selectBetter(existing, match));
    }
  }
  
  return Array.from(matchMap.values());
}

/**
 * Filters items based on enabled status from settings
 */
export function filterByEnabled<T extends { enabled?: boolean }>(
  items: T[]
): T[] {
  return items.filter(item => item.enabled !== false);
}

/**
 * Limits array to a maximum size with optional "show more" indicator
 */
export function limitWithIndicator<T>(
  items: T[],
  limit: number
): { items: T[]; hasMore: boolean; moreCount: number } {
  return {
    items: items.slice(0, limit),
    hasMore: items.length > limit,
    moreCount: Math.max(0, items.length - limit),
  };
}
