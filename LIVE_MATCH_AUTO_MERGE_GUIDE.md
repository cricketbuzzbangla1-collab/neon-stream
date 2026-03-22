# Live Match Auto Merge System - Implementation Guide

This document describes the complete implementation of the Live Match Auto Merge system that combines LIVE matches from APIs with stream data from JSON.

---

## 🎯 System Overview

The system fetches LIVE matches from football APIs (API-Football or Football-Data) and automatically merges them with stream links from a JSON source. The merged data is displayed in the "Live Scores" section with "Watch Now" buttons where streams are available.

```
┌─────────────────────┐         ┌──────────────────┐
│ Football API        │         │ JSON Stream URL  │
│ (Live Matches)      │         │ (Stream Links)   │
└──────────┬──────────┘         └────────┬─────────┘
           │                             │
           └──────────────┬──────────────┘
                          │
                    ┌─────▼─────┐
                    │   Merge   │
                    │  Logic    │
                    └─────┬─────┘
                          │
                    ┌─────▼──────────┐
                    │ Live Events DB │
                    │  (Firestore)   │
                    └─────┬──────────┘
                          │
                    ┌─────▼──────────┐
                    │ Frontend       │
                    │ Live Scores    │
                    └────────────────┘
```

---

## 📡 Component 1: Football API Integration

**File:** `src/hooks/useFootballAPI.ts`

### Features
- Fetches live and upcoming matches from two supported APIs:
  - **API-Football** (apifootball.com) - Default
  - **Football-Data** (football-data.org) - Alternative

### Supported Leagues
- Premier League
- La Liga
- Serie A
- Bundesliga
- Ligue 1
- UEFA Champions League
- UEFA Europa League
- Saudi Pro League
- MLS
- And more (see `ALLOWED_LEAGUES` and `FOOTBALLDATA_LEAGUES`)

### Key Data Returned
```typescript
interface FootballMatch {
  id: string;                  // Match ID (fixture_id)
  homeTeam: string;            // Team A name
  awayTeam: string;            // Team B name
  homeLogo: string;            // Team A logo URL
  awayLogo: string;            // Team B logo URL
  homeScore: string;           // Score (home team)
  awayScore: string;           // Score (away team)
  matchStatus: string;         // "45'", "HT", "90+", etc.
  isLive: boolean;             // Is match currently live?
  league: string;              // League name
  leagueId: string;            // League ID
  leagueLogo: string;          // League logo URL
  startTimestamp: number;      // UTC match start time
  matchDate: string;           // Formatted date
  matchTime: string;           // Formatted time (local)
}
```

### Caching & Rate Limiting
- 10-minute cache for live matches, 30-minute for others
- Configurable hourly API call limit (default: 3 calls/hour)
- Automatic fallback to apifootball if football-data fails

### Admin Configuration
Set in Admin Dashboard → App Settings:
- `footballApiEnabled` - Toggle API fetching
- `footballApiProvider` - Select provider ("apifootball" or "footballdata")
- `footballApiKey` - API-Football API key
- `footballdataApiKey` - Football-Data API key
- `footballApiCallsPerHour` - Rate limit
- `disabledLeagues` - Leagues to exclude

---

## 📡 Component 2: JSON Stream Source

**File:** `src/hooks/useAutoStreamMatcher.ts`

### JSON Format Expectations
The JSON URL should return an array of stream entries. Supported fields (auto-detected):

```json
[
  {
    "fixture_id": "12345",           // Optional: Match ID for exact matching
    "home": "Team A",                 // Home team (alternative: home_team, homeTeam, "Team 1 Name")
    "away": "Team B",                 // Away team (alternative: away_team, awayTeam, "Team 2 Name")
    "stream_url": "https://...",      // Stream link (alternative: streamUrl, url, source, "Stream URL")
    "player_type": "hls",             // Optional: Player type (hls, dash, etc.)
    "Match Status": "live",           // Optional: Match status
    "League": "Premier League"        // Optional: League name
  }
]
```

### Matching Priority
The system attempts to match in this order:

1. **Exact fixture ID match** - Best accuracy
   ```
   Match.id === Stream.fixture_id
   ```

2. **Team name matching** - Fuzzy match with normalization
   ```
   Normalize both: lowercase + trim + remove special chars
   Check if normalized names match or contain each other
   ```

3. **Reverse team matching** - Handles swapped team order
   ```
   Home ↔ Away swap comparison
   ```

### Normalization Example
```
Input:  "Manchester United"
Step 1: lowercase → "manchester united"
Step 2: trim → "manchester united"
Step 3: remove special chars → "manchesterunited"

Match against: "Man Utd" → "manutd" ✓ (contains)
```

### Fetch Interval
- Fetches every 2 minutes from the JSON URL
- Result cached for 2 minutes (to avoid duplicate requests)
- Auto-deactivates matches no longer in JSON

### Admin Configuration
Set in Admin Dashboard → App Settings → Auto Stream (JSON):
- `streamJsonUrl` - URL to JSON stream source
- `autoStreamEnabled` - Toggle auto-stream feature

---

## 🧠 Component 3: Auto Merge Logic

**File:** `src/hooks/useAutoStreamMatcher.ts` (function: `processStreams()`)

### Matching Strategy

#### Phase 1: Match API Matches with JSON Streams
For each live API match:
1. Search JSON for matching stream using priority matching (see above)
2. If stream found:
   - Extract stream_url
   - Create or update live event with stream attached
   - Set `isActive: true`
3. If no stream found:
   - API match still shows but without stream link
   - Set `is_stream_available: false` (implicit)

#### Phase 2: Import JSON-Only Live Matches
For each "live" status entry in JSON that isn't matched to any API match:
1. Extract team names and stream URL
2. Skip placeholder entries (e.g., "bingstream", "intro")
3. Create auto live event:
   - `source: "json-auto"` (tracks origin)
   - `manualStatus: "live"`
   - `isActive: true`

#### Phase 3: Auto-Delete Expired Matches
For each auto-created live event:
1. Check if teams still exist in JSON with "live" status
2. If not found:
   - Delete from database
   - Log deletion
   - Event disappears from frontend

### Data Flow

```
Football API Match
  ↓
  ├─→ Has stream in JSON? 
  │    ├─→ YES → Add stream_url → Show "Watch Now"
  │    └─→ NO  → No stream_url → No button
  │
  └─→ Create LiveEvent:
       {
         teamA: match.homeTeam,
         teamALogo: match.homeLogo,
         teamB: match.awayTeam,
         teamBLogo: match.awayLogo,
         streamUrl: "from JSON" || "",
         startTime: match.startTimestamp,
         endTime: startTime + 2h,
         league: match.league,
         leagueLogo: match.leagueLogo,
         source: "json-auto"
       }
```

---

## 💾 Component 4: Data Storage (Firestore)

**Collection:** `liveEvents`

### LiveEvent Document Structure
```typescript
interface LiveEvent {
  id: string;                                    // Auto-generated
  title: string;                                 // "Team A vs Team B"
  teamA: string;                                 // Home team name
  teamALogo: string;                            // Home team logo URL
  teamB: string;                                 // Away team name
  teamBLogo: string;                            // Away team logo URL
  streamUrl: string;                            // Stream link (empty if none)
  playerType: "hls" | "dash" | "iframe" | ...; // Player type
  startTime: number;                            // Match start (ms)
  endTime: number;                              // Match end (ms)
  countryId: string;                            // Country reference
  isFeatured: boolean;                          // Priority display
  isActive: boolean;                            // Show in UI?
  manualStatus?: "live" | "upcoming" | ...;    // Manual override
  createdAt: number;                            // Created timestamp
  
  // Additional fields (set by auto-matcher):
  league?: string;                              // League name
  leagueLogo?: string;                          // League logo
  source?: "json-auto";                         // Origin tracker
}
```

### Key Rules
1. **API data is primary** - Never override team names, logos, scores with JSON
2. **JSON data is secondary** - Only used for `streamUrl`
3. **No duplicates** - Check existing events before creating new ones
4. **Auto-cleanup** - Delete auto-created events if no longer in JSON

---

## 📱 Component 5: Frontend Display

**Files:** 
- `src/pages/Index.tsx`
- `src/components/FootballMatchCard.tsx`
- `src/components/LiveEventCard.tsx`

### Live Scores Section
Shows all API matches with automatic stream attachment:

```
Live Scores
├─ Liverpool vs Manchester City
│  ├─ Logos: ✓
│  ├─ Score: 2-1
│  ├─ Live Minute: 67'
│  └─ [Watch Now] ← Stream from JSON
│
├─ Chelsea vs Arsenal
│  ├─ Logos: ✓
│  ├─ Score: 1-1
│  ├─ Live Minute: 45'
│  └─ [Watch Now] ← Stream from JSON
│
└─ Tottenham vs Brighton
   ├─ Logos: ✓
   ├─ Score: -
   ├─ Upcoming: 20:00
   └─ (No stream available)
```

### Match Card Features
- **Team Information**: Names, logos from API
- **Live Status**: Current minute, score, league
- **Stream Button**: "Watch Now" only if stream exists
- **Smart Highlighting**:
  - Red ring for live matches
  - Yellow ring for matches starting soon (≤30 min)
  - Pulsing animation for imminent kickoff (≤10 min)

### Stream Availability
- Button visible: `streamUrl.length > 0`
- Button hidden: `streamUrl === ""` or missing

---

## ⚡ API Integration Flow

### 1. Auto-Matcher Hook Usage (Index.tsx)
```typescript
// Fetch API matches
const { matches: allMatches, liveMatches } = useFootballMatches();

// Fetch and match with JSON
useAutoStreamMatcher(allMatches, liveEvents);

// Display merged results
{liveMatches.map(match => (
  <FootballMatchCard key={match.id} match={match} liveEvents={liveEvents} />
))}
```

### 2. Auto-Matcher Fetching
- **Trigger**: Component mount + `allMatches` change
- **Frequency**: Every 2 minutes
- **Process**:
  1. Fetch JSON from configured URL
  2. Match API matches with JSON entries
  3. Create/update/delete LiveEvent documents
  4. Log results to console

### 3. Match Card Rendering
```typescript
// Card looks up if stream exists
const matchingEvent = liveEvents.find(ev => {
  // Fuzzy match teams
});

if (matchingEvent?.streamUrl) {
  return <button className="...">Watch Now</button>;
}
```

---

## 🔧 Configuration Checklist

To activate the system:

1. **Admin Dashboard → App Settings**
   - Enable Football API: ✓
   - Select provider: "apifootball" or "footballdata"
   - Add API key (get from provider)
   - Set hourly call limit (recommended: 2-3)

2. **Admin Dashboard → App Settings → Auto Stream**
   - Enable Auto Stream: ✓
   - Enter JSON URL: `https://your-domain.com/streams.json`
   - Verify JSON format matches spec above

3. **JSON Server Setup**
   - Host JSON file with stream data
   - Ensure CORS headers allow requests
   - Test URL in browser to verify JSON structure

4. **Monitor**
   - Check browser console for debug logs
   - Look for "Auto-stream: X matches linked"
   - Verify "Watch Now" buttons appear on matches with streams

---

## 📊 Example JSON Stream Data

```json
[
  {
    "fixture_id": "12345",
    "Team 1 Name": "Liverpool",
    "Team 2 Name": "Manchester City",
    "Stream URL": "https://stream1.example.com/match1.m3u8",
    "Match Status": "live",
    "League": "Premier League"
  },
  {
    "home": "Arsenal",
    "away": "Chelsea",
    "stream_url": "https://stream2.example.com/match2.m3u8",
    "Match Status": "live"
  },
  {
    "homeTeam": "Manchester United",
    "awayTeam": "Brighton",
    "streamUrl": "https://stream3.example.com/match3.m3u8",
    "player_type": "hls"
  }
]
```

---

## 🐛 Debugging

### Browser Console Logs
```
✅ Auto-imported (API+JSON): Liverpool vs Manchester City
📡 Auto-stream: 5 matches linked
🔄 Updated stream: Arsenal vs Chelsea
✅ JSON-only live: Team A vs Team B
🗑️ Auto-deleted: Team X vs Team Y
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| No streams appearing | JSON URL not set | Add URL in Admin → Auto Stream |
| Matches not matching | Team names differ | Add fixture_id to JSON or improve team names |
| "Rate limit reached" | Too many API calls | Reduce `footballApiCallsPerHour` in admin |
| Old matches stick around | Auto-delete failed | Check if teams still in JSON "live" |
| JSON won't fetch | CORS issue | Verify CORS headers on JSON server |

---

## 🎯 Implementation Completeness

✅ **Fully Implemented Features:**
- [x] Live match fetching from APIs
- [x] JSON stream data fetching (every 2 min)
- [x] Fuzzy team name matching
- [x] Fixture ID matching
- [x] Automatic stream assignment
- [x] Auto-deletion of expired matches
- [x] Duplicate prevention
- [x] Admin configuration panel
- [x] Frontend display with "Watch Now" buttons
- [x] Rate limiting and caching
- [x] Error handling and fallbacks

---

## 📝 Example Workflow

### Scenario: Live Premier League Match

1. **12:00 PM** - Admin sets JSON URL with streams
2. **12:02 PM** - Auto-matcher fetches:
   - API: "Liverpool vs Man City" (Live)
   - JSON: `{ home: "Liverpool", away: "Man City", stream_url: "..." }`
3. **Match Found** - Teams fuzzy-matched
4. **Event Created/Updated** - StreamUrl attached
5. **Frontend** - Match card shows with "Watch Now" button
6. **User Clicks** - Navigates to player with stream

### Scenario: Match Finishes

1. **4:30 PM** - Match ends in JSON
2. **4:32 PM** - Next auto-matcher run
3. **Event Deactivated** - Auto-delete fires if `isActive: true` and not in JSON
4. **Frontend** - Match disappears from "Live Scores"

---

## 🚀 Performance Notes

- **API Calls**: Rate-limited to prevent quota exceeded
- **JSON Fetches**: Every 2 minutes, cached to avoid duplicates
- **Database**: Real-time listeners update frontend instantly
- **Memory**: Normalized strings stored in memory for fuzzy matching
- **Timezone**: All times converted to local client time for display

---

## 📞 Support

For issues or improvements:
1. Check console logs for error messages
2. Verify JSON URL is accessible and CORS-enabled
3. Confirm API keys are valid in admin settings
4. Test JSON structure against provided format

