# Homepage Performance Optimization Guide

This document describes how the homepage has been optimized to load only enabled sections from admin settings and implements lazy loading, caching, and conditional rendering.

## Architecture Overview

### 1. Section Configuration System

The system uses a **SectionConfig** interface to control which sections are displayed on the homepage.

**File**: `src/hooks/useAppSettings.ts`

```typescript
export interface SectionConfig {
  liveEventsEnabled: boolean;        // Manual live events (Firestore)
  upcomingEventsEnabled: boolean;    // Manual upcoming events (Firestore)
  footballLiveEnabled: boolean;      // Live football matches (API)
  footballUpcomingEnabled: boolean;  // Upcoming matches (API)
  footballRecentResultsEnabled: boolean; // Recent match results (API)
  matchCardInitialLoad: number;      // Initial load count (5-30 matches)
}
```

### 2. Admin Panel Controls

**File**: `src/components/admin/AppSettingsManager.tsx`

Admins can:
- Toggle each section on/off individually
- Configure the initial load count for match cards (5, 10, 15, 20, or 30)
- Changes take effect immediately (real-time Firebase sync)

### 3. Homepage Rendering Strategy

**File**: `src/pages/Index.tsx`

#### Conditional Rendering
```typescript
const sectionConfig = useMemo(() => ({
  liveEventsEnabled: settings.sectionConfig?.liveEventsEnabled ?? true,
  // ... other fields
}), [settings.sectionConfig]);
```

#### Smart Data Fetching
- **Live Events**: Only fetched via `useLiveEvents()` hook (always active for real-time updates)
- **Football Matches**: Only fetched if at least one football section is enabled
- **Disabled Sections**: No API calls, no DOM render, no memory allocation

#### Lazy Loading Implementation
```typescript
const displayedUpcoming = useMemo(() => {
  return showAllUpcoming
    ? sortedUpcomingMatches
    : sortedUpcomingMatches.slice(0, sectionConfig.matchCardInitialLoad);
}, [showAllUpcoming, sortedUpcomingMatches, sectionConfig.matchCardInitialLoad]);
```

## Performance Improvements

### 1. **Reduced Initial Load**
- Disabled sections are not rendered
- API calls prevented for disabled football data
- Initial match display limited to configurable count (default: 10)

### 2. **Memoization**
- `useMemo` prevents unnecessary recalculations
- `sortedLiveMatches`, `displayedUpcoming` computed only when dependencies change
- Reduces render cycles and improves React reconciliation

### 3. **Caching Strategy**
- Football API: 10-min cache for live matches, 30-min for upcoming
- Firestore: Real-time subscription (no aggressive polling)
- In-memory cache with TTL in `useFirestore.ts`

### 4. **De-duplication**
- Matches de-duplicated by ID to prevent duplicates from API merging
- Finished matches removed after 15 minutes to keep UI clean

### 5. **Rate Limiting**
- Football API calls limited to 3/hour by default
- Configurable in admin settings
- Prevents API throttling and unnecessary bandwidth

## Using the Optimized Hooks

### Option 1: Direct Section Config
```typescript
import { useSectionConfig } from "@/hooks/useSectionConfig";

function MyComponent() {
  const { config, loading } = useSectionConfig();
  
  if (!config.footballLiveEnabled) return null;
  // Render component only if enabled
}
```

### Option 2: Visibility Flags
```typescript
import { useSectionVisibility } from "@/hooks/useSectionConfig";

function MyComponent() {
  const visibility = useSectionVisibility();
  
  return visibility.showFootballLive ? <LiveScores /> : null;
}
```

## Admin Configuration Steps

1. Navigate to Admin Panel → App Settings
2. Scroll to "Homepage Sections" section
3. Toggle desired sections on/off
4. Configure "Initial Match Load" (5-30 matches)
5. Click "Save Section Settings"
6. Changes are applied immediately (real-time sync)

## Monitoring Performance

### Debug Flags
The football API hook includes detailed logging:
```
✅ football-data.org: direct success
⚽ apifootball.com: fetched 15 matches (1/3 calls/hr)
⚠️ apifootball.com: Hourly limit reached
```

### Chrome DevTools
- **Performance Tab**: Monitor rendering time
- **Network Tab**: Check disabled sections make no API calls
- **Console**: Check for duplicate match warnings

## Database Schema

### Firebase Collection: `appSettings/config`
```javascript
{
  sectionConfig: {
    liveEventsEnabled: true,
    upcomingEventsEnabled: true,
    footballLiveEnabled: true,
    footballUpcomingEnabled: true,
    footballRecentResultsEnabled: true,
    matchCardInitialLoad: 10
  }
  // ... other config fields
}
```

## Future Optimization Opportunities

1. **Virtual Scrolling**: For large match lists, use react-window
2. **Intersection Observer**: Lazy-load below-the-fold sections
3. **Worker Thread**: Move deduplication to Web Worker
4. **Service Worker**: Cache API responses for offline support
5. **GraphQL**: Replace REST API with GraphQL to fetch only needed fields

## Troubleshooting

### Sections not appearing after enabling?
- Clear browser cache (CTRL+F5)
- Check Firebase Firestore for config document
- Verify user has admin privileges

### API calls still happening for disabled sections?
- The hooks are optimized, but parent components may fetch anyway
- Check component props and hook usage
- Verify section config is loaded (`!loading` check)

### Performance still slow?
- Check Network tab for football API latency
- Reduce `matchCardInitialLoad` value
- Disable `footballRecentResultsEnabled` if not needed
- Check for console warnings about duplicate matches

## Code References

- **Settings Hook**: `src/hooks/useAppSettings.ts`
- **Section Hook**: `src/hooks/useSectionConfig.ts`
- **Football API**: `src/hooks/useFootballAPI.ts`
- **Firestore Hook**: `src/hooks/useFirestore.ts`
- **Admin Component**: `src/components/admin/AppSettingsManager.tsx`
- **Homepage**: `src/pages/Index.tsx`
