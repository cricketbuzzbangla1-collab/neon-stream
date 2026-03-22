# Developer Examples - Customization & Integration

Code examples for developers who want to customize or extend the system.

---

## 📋 Table of Contents
1. [Custom Matching Logic](#custom-matching-logic)
2. [Adding Custom Normalization](#adding-custom-normalization)
3. [Custom Team Name Mappings](#custom-team-name-mappings)
4. [Backend JSON API](#backend-json-api)
5. [Custom Event Handlers](#custom-event-handlers)
6. [Database Queries](#database-queries)
7. [Testing Examples](#testing-examples)

---

## Custom Matching Logic

### Example 1: Case-Sensitive Matching
Change from fuzzy to exact matching:

**File:** `src/hooks/useAutoStreamMatcher.ts`

Find this function:
```typescript
function fuzzyMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb || na.length < 3 || nb.length < 3) return false;
  return na.includes(nb) || nb.includes(na);
}
```

Replace with:
```typescript
function fuzzyMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb || na.length < 3 || nb.length < 3) return false;
  // Exact match only
  return na === nb;
}
```

### Example 2: Levenshtein Distance Matching
Use similarity scoring:

```typescript
function levenshteinDistance(a: string, b: string): number {
  const aLen = a.length;
  const bLen = b.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= bLen; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= aLen; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= bLen; i++) {
    for (let j = 1; j <= aLen; j++) {
      const cost = a[j - 1] === b[i - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i][j - 1] + 1,      // deletion
        matrix[i - 1][j] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return matrix[bLen][aLen];
}

function fuzzyMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return false;
  
  const maxLen = Math.max(na.length, nb.length);
  const distance = levenshteinDistance(na, nb);
  const similarity = 1 - (distance / maxLen);
  
  return similarity > 0.75; // 75% match threshold
}
```

---

## Adding Custom Normalization

### Example 1: More Aggressive Normalization

Find:
```typescript
function normalize(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]/g, "").replace(/\s+/g, "");
}
```

Replace with:
```typescript
function normalize(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "")
    .replace(/\s+/g, "")
    .replace(/^(fc|as|us|ss)/g, "") // Remove common prefixes
    .replace(/(united|city|town|fc)$/g, ""); // Remove common suffixes
}
```

### Example 2: Multi-Language Support

```typescript
const LANGUAGE_MAPPINGS: Record<string, string[]> = {
  manchester: ['man', 'utd', 'city'],
  tottenham: ['spurs'],
  'crystal palace': ['palace'],
  'brighton': ['brighton hove'],
  'wolves': ['wolverhampton'],
  'newcastle': ['magpies'],
};

function normalizeWithMappings(name: string): string {
  let normalized = normalize(name);
  
  for (const [full, aliases] of Object.entries(LANGUAGE_MAPPINGS)) {
    if (normalized === normalize(full)) {
      return normalized;
    }
    for (const alias of aliases) {
      if (normalized === normalize(alias)) {
        return normalize(full);
      }
    }
  }
  
  return normalized;
}

function fuzzyMatch(a: string, b: string): boolean {
  const na = normalizeWithMappings(a);
  const nb = normalizeWithMappings(b);
  if (!na || !nb || na.length < 3 || nb.length < 3) return false;
  return na.includes(nb) || nb.includes(na);
}
```

---

## Custom Team Name Mappings

### Example: API-Specific Mappings

Create `src/hooks/useTeamMappings.ts`:

```typescript
export const TEAM_NAME_MAPPINGS: Record<string, string[]> = {
  // Premier League
  'Liverpool Football Club': ['Liverpool', 'LIV'],
  'Manchester United': ['Man Utd', 'Man. Utd', 'MUFC'],
  'Manchester City': ['Man City', 'Man. City'],
  'Chelsea FC': ['Chelsea'],
  'Arsenal FC': ['Arsenal'],
  
  // La Liga
  'FC Barcelona': ['Barcelona', 'Barça', 'Barca'],
  'Real Madrid CF': ['Real Madrid', 'Madrid'],
  
  // Serie A
  'Juventus': ['Juve'],
  'AC Milan': ['Milan', 'AC Milan'],
  'Inter': ['Inter Milan', 'Internazionale'],
};

export function normalizeTeamName(apiTeamName: string): string {
  const normalized = normalize(apiTeamName);
  
  // Find canonical name from mappings
  for (const [canonical, variants] of Object.entries(TEAM_NAME_MAPPINGS)) {
    if (normalized === normalize(canonical)) {
      return normalize(canonical);
    }
    for (const variant of variants) {
      if (normalized === normalize(variant)) {
        return normalize(canonical);
      }
    }
  }
  
  return normalized;
}

export function teamsMatch(apiTeam: string, jsonTeam: string): boolean {
  const na = normalizeTeamName(apiTeam);
  const nb = normalizeTeamName(jsonTeam);
  return na === nb;
}
```

Use in `useAutoStreamMatcher.ts`:

```typescript
import { teamsMatch } from '@/hooks/useTeamMappings';

function findStreamForMatch(match: FootballMatch, streams: StreamEntry[]): StreamEntry | null {
  // ... existing code ...
  
  for (const s of streams) {
    const home = getHome(s);
    const away = getAway(s);
    if (home && away && teamsMatch(match.homeTeam, home) && teamsMatch(match.awayTeam, away)) {
      return s;
    }
  }
  
  // ... rest of function ...
}
```

---

## Backend JSON API

### Example 1: Node.js / Express

Create `backend/routes/streams.js`:

```typescript
import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// Fetch from external API and transform
router.get('/api/streams', async (req, res) => {
  try {
    const streamData = [
      {
        fixture_id: '1',
        home: 'Liverpool',
        away: 'Chelsea',
        stream_url: process.env.STREAM_URL_1,
        Match Status: 'live',
      },
      {
        fixture_id: '2',
        home: 'Arsenal',
        away: 'Brighton',
        stream_url: process.env.STREAM_URL_2,
        Match Status: 'live',
      },
    ];
    
    res.set(CORS_HEADERS);
    res.json(streamData);
  } catch (error) {
    console.error('Stream API error:', error);
    res.set(CORS_HEADERS);
    res.status(500).json({ error: 'Failed to fetch streams' });
  }
});

export default router;
```

### Example 2: Firebase Function

Create `functions/api/streams.ts`:

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const cors = require('cors')({ origin: true });

exports.getStreams = functions.https.onRequest((request, response) => {
  cors(request, response, async () => {
    try {
      // Fetch from Firestore
      const db = admin.firestore();
      const streamsRef = await db.collection('streams').where('status', '==', 'live').get();
      
      const streams = [];
      streamsRef.forEach((doc) => {
        streams.push({
          fixture_id: doc.id,
          home: doc.data().homeTeam,
          away: doc.data().awayTeam,
          stream_url: doc.data().streamUrl,
          'Match Status': 'live',
        });
      });
      
      response.json(streams);
    } catch (error) {
      console.error('Error:', error);
      response.status(500).json({ error: 'Failed' });
    }
  });
});
```

### Example 3: Python / Flask

```python
from flask import Flask, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

@app.route('/api/streams')
def get_streams():
    streams = [
        {
            'fixture_id': '1',
            'home': 'Liverpool',
            'away': 'Chelsea',
            'stream_url': os.getenv('STREAM_URL_1'),
            'Match Status': 'live',
        },
        {
            'fixture_id': '2',
            'home': 'Arsenal',
            'away': 'Brighton',
            'stream_url': os.getenv('STREAM_URL_2'),
            'Match Status': 'live',
        },
    ]
    return jsonify(streams)

if __name__ == '__main__':
    app.run()
```

---

## Custom Event Handlers

### Example: Send Notifications When Match Starts

Create `src/hooks/useStreamNotifications.ts`:

```typescript
import { useState, useEffect } from 'react';
import { LiveEvent } from './useFirestore';
import { toast } from 'sonner';

export function useStreamNotifications(liveEvents: LiveEvent[]) {
  const [notifiedMatches, setNotifiedMatches] = useState<Set<string>>(new Set());

  useEffect(() => {
    liveEvents.forEach((event) => {
      if (!event.streamUrl || notifiedMatches.has(event.id)) {
        return;
      }

      const now = Date.now();
      const timeUntilStart = event.startTime - now;

      // Notify 5 minutes before start
      if (timeUntilStart > 0 && timeUntilStart < 5 * 60 * 1000) {
        toast.info(`⚽ ${event.title} starting soon!`, {
          action: {
            label: 'Watch',
            onClick: () => window.location.href = `/watch/event-${event.id}`,
          },
        });

        setNotifiedMatches((prev) => new Set([...prev, event.id]));
      }

      // Notify when live
      if (now >= event.startTime && now <= event.endTime && !notifiedMatches.has(event.id)) {
        toast.success(`🔴 ${event.title} is LIVE!`, {
          action: {
            label: 'Watch Now',
            onClick: () => window.location.href = `/watch/event-${event.id}`,
          },
        });

        setNotifiedMatches((prev) => new Set([...prev, event.id]));
      }
    });
  }, [liveEvents, notifiedMatches]);
}
```

Use in component:
```typescript
import { useStreamNotifications } from '@/hooks/useStreamNotifications';

export default function Index() {
  const { data: liveEvents } = useLiveEvents();
  useStreamNotifications(liveEvents); // Add this
  
  // ... rest of component
}
```

---

## Database Queries

### Example 1: Query Matches by League

```typescript
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function getMatchesByLeague(league: string) {
  const q = query(
    collection(db, 'liveEvents'),
    where('league', '==', league),
    where('isActive', '==', true)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
```

### Example 2: Get Matches With Streams

```typescript
export async function getMatchesWithStreams() {
  const q = query(
    collection(db, 'liveEvents'),
    where('streamUrl', '!=', ''),
    where('isActive', '==', true)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
```

### Example 3: Real-Time Listener for Specific League

```typescript
import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function useLeagueMatches(league: string) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'liveEvents'),
      where('league', '==', league),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMatches(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [league]);

  return { matches, loading };
}
```

---

## Testing Examples

### Example 1: Unit Test for Matching

Create `src/hooks/__tests__/useAutoStreamMatcher.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';

function normalize(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]/g, "").replace(/\s+/g, "");
}

function fuzzyMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb || na.length < 3 || nb.length < 3) return false;
  return na.includes(nb) || nb.includes(na);
}

describe('Team Name Matching', () => {
  it('should match exact names', () => {
    expect(fuzzyMatch('Liverpool', 'Liverpool')).toBe(true);
  });

  it('should match case-insensitive', () => {
    expect(fuzzyMatch('Liverpool', 'liverpool')).toBe(true);
  });

  it('should match abbreviated names', () => {
    expect(fuzzyMatch('Manchester United', 'Man Utd')).toBe(true);
  });

  it('should not match if too different', () => {
    expect(fuzzyMatch('Liverpool', 'Chelsea')).toBe(false);
  });

  it('should handle special characters', () => {
    expect(fuzzyMatch('São Paulo', 'Sao Paulo')).toBe(true);
  });
});
```

### Example 2: Integration Test

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Index from '@/pages/Index';

describe('Live Scores Display', () => {
  beforeEach(() => {
    // Mock Firebase
    vi.mock('@/lib/firebase');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should display live matches', async () => {
    render(<Index />);
    
    await waitFor(() => {
      expect(screen.getByText(/Live Scores/i)).toBeInTheDocument();
    });
  });

  it('should show Watch Now button when stream exists', async () => {
    render(<Index />);
    
    await waitFor(() => {
      const watchButtons = screen.getAllByText(/Watch Now/i);
      expect(watchButtons.length).toBeGreaterThan(0);
    });
  });
});
```

---

## Performance Optimization

### Example: Memoize Expensive Operations

```typescript
import { useMemo } from 'react';

export function useOptimizedMatches(matches: FootballMatch[]) {
  return useMemo(() => {
    return matches
      .sort((a, b) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        return a.startTimestamp - b.startTimestamp;
      })
      .filter((m) => {
        // Only keep recent matches
        const age = Date.now() - m.startTimestamp;
        return age > -24 * 3600000; // Last 24 hours
      });
  }, [matches]);
}
```

---

## Advanced: Custom Stream Verification

```typescript
export async function verifyStreamUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors',
    });
    return response.ok || response.status === 0; // 0 for no-cors
  } catch {
    return false;
  }
}

// Use in processStreams
if (streamUrl && await verifyStreamUrl(streamUrl)) {
  // Create event with verified stream
}
```

---

## Tips for Customization

1. **Always test changes locally** before deploying
2. **Keep backup of original files** before modifying
3. **Use console.log for debugging** during development
4. **Monitor performance** when adding complex logic
5. **Document custom changes** for future maintainers
6. **Test edge cases**: empty names, special characters, etc.

---

## Resources

- **Firebase Documentation:** https://firebase.google.com/docs
- **React Hooks:** https://react.dev/reference/react
- **TypeScript:** https://www.typescriptlang.org/docs/
- **Testing Library:** https://testing-library.com/docs/

