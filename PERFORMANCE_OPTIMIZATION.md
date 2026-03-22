# Homepage Performance Optimization Guide

## Overview

This document explains the performance optimizations implemented for the homepage to load only enabled sections and smartly manage match data fetching.

## Key Features

### 1. **Conditional Section Rendering**
Sections are now controlled via admin panel settings and only render when enabled.

**Controlled Sections:**
- ✅ Notice Bar
- ✅ Live Events
- ✅ Football Matches

**Benefits:**
- Skips DOM rendering for disabled components
- Prevents unnecessary API calls
- Reduces initial bundle footprint

### 2. **Admin Panel Controls**

Access the admin dashboard at `/admin` and navigate to **App Settings → Homepage Sections**:

```
Homepage Sections
├─ Show Notice Bar (toggle)
├─ Show Live Events (toggle)
├─ Show Football Matches (toggle)
└─ Football Initial Load Limit (3, 5, 10, 15, 20, 30 matches)
```

**Example:**
- Disable Football Matches to skip all football API calls
- Set limit to 5 to load only 5 matches initially

### 3. **Lazy Loading for Match Cards**

Initial load limits prevent DOM bloat:

```typescript
// Live Scores: Shows up to 20 live matches initially
{sortedLiveMatches.slice(0, Math.max(footballInitialLimit, 20)).map(m => ...)}

// Upcoming Matches: Shows configurable limit with "See More" button
{displayedUpcoming.map(m => ...)}

// Recent Results: Shows 10 matches initially
{sortedRecentResults.slice(0, 10).map(m => ...)}
```

### 4. **API Call Prevention**

The football API hook only fetches if enabled:

```typescript
// From useFootballAPI.ts
if (!enabled) {
  setLoading(false);
  setMatches([]);
  return; // Skip API call entirely
}
```

### 5. **Data Deduplication**

Prevents duplicate matches from multiple API sources:

```typescript
// Merges by match ID and keeps best data
const deduplicateMatches = (ms: FootballMatch[]): FootballMatch[] => {
  const matchMap = new Map<string, FootballMatch>();
  
  for (const m of ms) {
    if (!matchMap.has(m.id)) {
      matchMap.set(m.id, m);
    } else {
      // Keep the one with more complete data
      const existing = matchMap.get(m.id)!;
      if (m.homeScore && !existing.homeScore) {
        matchMap.set(m.id, m);
      }
    }
  }
  
  return Array.from(matchMap.values());
};
```

### 6. **Intelligent Caching**

React Query (TanStack Query) automatically caches API responses:

```typescript
// From App.tsx QueryClient config
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,        // Cache for 5 minutes
      gcTime: 10 * 60 * 1000,          // Keep unused data for 10 minutes
      refetchOnWindowFocus: false,      // Don't refetch on tab switch
      retry: 1,                         // Retry once on failure
    },
  },
});
```

## Architecture

### Component Hierarchy

```
Index (Homepage)
├─ useAppSettings() → Fetch section settings
├─ useLiveEvents()  → Fetch live events (conditional)
├─ useFootballMatches() → Fetch matches (conditional + cached)
├─ useOptimizedMatches() → Deduplicate & limit data
│
└─ Sections (conditional render)
   ├─ NoticeBar (if enabled)
   ├─ Live Events (if enabled)
   │  ├─ Live Now
   │  └─ Upcoming
   └─ Football (if enabled)
      ├─ Live Scores (lazy loaded)
      ├─ Upcoming Matches (lazy loaded with pagination)
      └─ Recent Results (lazy loaded)
```

## Files Modified

1. **`src/hooks/useAppSettings.ts`**
   - Added `SectionSettings` interface
   - Extended `AppConfig` with `sections` object
   - Default settings enable all sections with sensible limits

2. **`src/pages/Index.tsx`**
   - Import `useAppSettings`
   - Added feature flags for each section
   - Wrapped section renders with conditional checks
   - Use `footballInitialLimit` from settings

3. **`src/components/admin/AppSettingsManager.tsx`**
   - Added new **Homepage Sections** card
   - Toggle controls for each section
   - Configurable match load limit
   - One-click save for all settings

4. **`src/lib/performanceOptimizations.ts`** (new)
   - `deduplicateById()` - Remove duplicate matches
   - `chunkArray()` - Split data for pagination
   - `mergeMatches()` - Smart merge with custom strategy
   - `limitWithIndicator()` - Limit + show "more" count

5. **`src/hooks/useOptimizedMatches.ts`** (new)
   - `useOptimizedMatches()` - Memoized match optimization
   - Deduplicates and limits all three match categories
   - Returns `{ live, upcoming, recent }` with pagination info

## Performance Metrics

### Before Optimization
- All sections always render
- Football API always called (if enabled globally)
- No lazy loading for match cards
- Potential duplicate matches in DOM
- 20+ match cards in initial render

### After Optimization
- Sections only render if enabled
- Football API skipped if disabled
- Configurable initial load limit (default: 5 matches)
- Duplicates automatically merged
- 5-10 match cards in initial render (configurable)

## Best Practices

### For Admins

1. **Disable unused sections** to improve page load
   - Disable Football if not showing sports content
   - Disable Live Events if not using manual events
   - Disable Notice Bar if not showing announcements

2. **Adjust load limits** based on traffic
   ```
   High Traffic → Lower limit (3-5 matches)
   Low Traffic  → Higher limit (15-20 matches)
   ```

3. **Monitor settings** in admin dashboard
   - Check current state anytime
   - Change live without reload

### For Developers

1. **Use the provided utilities**
   ```typescript
   import { deduplicateById, limitWithIndicator } from '@/lib/performanceOptimizations';
   
   const unique = deduplicateById(matches);
   const { items, hasMore, moreCount } = limitWithIndicator(items, 10);
   ```

2. **Always check settings before rendering**
   ```typescript
   const { settings } = useAppSettings();
   const showSection = settings.sections?.mySection?.enabled !== false;
   
   return showSection && <MySection />;
   ```

3. **Leverage React Query caching**
   ```typescript
   // Automatic cache management - no duplicate API calls
   const { data } = useQuery({...});
   ```

## Testing

### Test Disabling Sections

1. Go to `/admin` → **App Settings**
2. In **Homepage Sections**, toggle "Show Football Matches" OFF
3. Network tab should show no football API calls
4. Homepage should skip the entire football section

### Test Load Limits

1. Set "Football Initial Load Limit" to 3
2. Homepage shows only 3 live matches initially
3. "See More" button appears if more matches exist
4. Click "See More" to load remaining matches

### Test Caching

1. Go to homepage - API calls made
2. Navigate away and back within 5 minutes
3. No new API calls (served from cache)
4. After 5 minutes, fresh API call made

## Troubleshooting

### Sections not updating after admin change?
- Clear browser cache (Ctrl+Shift+Delete)
- The settings should update within 1-2 seconds via Firestore listener

### Football matches still showing when disabled?
- Check Firebase console → `appSettings/config`
- Verify `footballMatches: { enabled: false }` is set
- Hard refresh browser (Ctrl+F5)

### Too many duplicate matches in results?
- Verify both football APIs aren't returning same data
- Check `deduplicateMatches()` in useFootballAPI.ts is running
- Review console logs for API source conflicts

## Future Improvements

1. **Per-section refresh intervals**
   - Live events: 10s
   - Football matches: 30s
   - Recent results: 60s

2. **Virtual scrolling**
   - Only render visible match cards
   - Further improve performance with 100+ matches

3. **Smart prefetching**
   - Prefetch next page of matches on scroll
   - Reduce perceived load time

4. **Analytics tracking**
   - Track which sections are viewed
   - Disable unused sections automatically

5. **User preferences**
   - Save user section preferences (e.g., hide football)
   - Sync with Firestore per user
