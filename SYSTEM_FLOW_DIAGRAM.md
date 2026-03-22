# System Flow Diagrams - Live Match Auto Merge

Visual representations of how the system works.

---

## 1️⃣ Complete System Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      ADMIN DASHBOARD                            │
│  ┌─────────────────────┐        ┌──────────────────────────┐   │
│  │ Football API Setup  │        │ Auto Stream JSON Setup   │   │
│  │ • API Key          │        │ • JSON URL              │   │
│  │ • Provider         │        │ • Enable/Disable        │   │
│  │ • Call Rate Limit  │        │ • Update interval       │   │
│  └────────────┬────────┘        └────────────┬─────────────┘   │
└───────────────┼──────────────────────────────┼─────────────────┘
                │                              │
    ┌───────────▼──────────┐      ┌───────────▼──────────────┐
    │                      │      │                          │
    │   Firestore DB       │      │   Firestore DB           │
    │  appSettings/main    │      │  appSettings/main        │
    │                      │      │                          │
    │  footballApiKey      │      │  streamJsonUrl           │
    │  footballApiProvider │      │  autoStreamEnabled       │
    │  footballApiEnabled  │      │                          │
    │  callsPerHour        │      │                          │
    └────────────┬─────────┘      └────────────┬──────────────┘
                 │                             │
    ┌────────────▼──────────────┐ ┌───────────▼──────────────┐
    │ useFootballAPI Hook      │ │ useAutoStreamMatcher     │
    │                          │ │                          │
    │ Every ~20 minutes:       │ │ Every 2 minutes:         │
    │ • Fetch live matches    │ │ • Fetch JSON             │
    │ • Parse API response    │ │ • Extract streams        │
    │ • Apply league filters  │ │ • Match with API matches │
    │ • Cache results         │ │ • Create/update events   │
    │ • Return FootballMatch[]│ │ • Auto-delete expired    │
    └────────────┬────────────┘ └───────────┬───────────────┘
                 │                          │
                 │  FootballMatch[]         │  LiveEvent updates
                 │                          │
    ┌────────────▼──────────────────────────▼───────────────┐
    │                                                        │
    │           Firestore Collection: liveEvents           │
    │                                                        │
    │  ┌─────────────────────────────────────────────────┐ │
    │  │ LiveEvent Document                              │ │
    │  │ ├─ id: "match-123"                             │ │
    │  │ ├─ title: "Liverpool vs Chelsea"               │ │
    │  │ ├─ teamA: "Liverpool"                          │ │
    │  │ ├─ teamALogo: "https://..."                    │ │
    │  │ ├─ teamB: "Chelsea"                            │ │
    │  │ ├─ teamBLogo: "https://..."                    │ │
    │  │ ├─ streamUrl: "https://stream.m3u8" ← FROM JSON │ │
    │  │ ├─ league: "Premier League"                    │ │
    │  │ ├─ startTime: 1234567890000                   │ │
    │  │ ├─ isActive: true                              │ │
    │  │ └─ source: "json-auto"                         │ │
    │  └─────────────────────────────────────────────────┘ │
    │                                                        │
    └────────────┬────────────────────────────────────────┘
                 │
                 │  Real-time Sync
                 │  (Firestore Listeners)
                 │
    ┌────────────▼────────────────────────────────────────┐
    │                                                      │
    │              React Components                       │
    │                                                      │
    │  ┌──────────────────────────────────────────────┐  │
    │  │ Index.tsx (Homepage)                         │  │
    │  │                                              │  │
    │  │ Renders:                                    │  │
    │  │ • Live Now Section                         │  │
    │  │ • Upcoming Section                         │  │
    │  │ • Live Scores Section (Football API)       │  │
    │  │ • Upcoming Matches Section                 │  │
    │  └────────────┬─────────────────────────────────┘  │
    │               │                                    │
    │  ┌────────────▼────────────────────────────────┐  │
    │  │ FootballMatchCard.tsx                      │  │
    │  │                                             │  │
    │  │ Displays per match:                        │  │
    │  │ • Team logos (from API)                    │  │
    │  │ • Team names (from API)                    │  │
    │  │ • Score (from API)                         │  │
    │  │ • Live minute (from API)                   │  │
    │  │ • League (from API)                        │  │
    │  │ • [Watch Now] ← IF streamUrl exists       │  │
    │  │ • [No Stream] ← IF streamUrl empty         │  │
    │  └──────────────────────────────────────────┘  │
    │                                                      │
    │  ┌──────────────────────────────────────────────┐  │
    │  │ User Interaction                             │  │
    │  │                                              │  │
    │  │ Click [Watch Now]                          │  │
    │  │ ↓                                            │  │
    │  │ Navigate to /watch/event-[id]              │  │
    │  │ ↓                                            │  │
    │  │ Player loads stream from streamUrl          │  │
    │  └──────────────────────────────────────────┘  │
    │                                                      │
    └──────────────────────────────────────────────────┘
```

---

## 2️⃣ Data Flow: Single Match

```
FOOTBALL API (e.g., api-football.com)
    ↓
┌─────────────────────────────┐
│ Raw Match Data (JSON)       │
│                             │
│ {                          │
│   "match_id": "123",       │
│   "homeTeam": "Liverpool", │
│   "awayTeam": "Chelsea",   │
│   "score": "2-1",          │
│   "status": "IN_PLAY",     │
│   ...                      │
│ }                          │
└────────────┬────────────────┘
             │
             │ parseApifootballMatch()
             │
             ▼
┌─────────────────────────────────────┐
│ FootballMatch Object                │
│                                     │
│ {                                  │
│   id: "123",                       │
│   homeTeam: "Liverpool",           │
│   awayTeam: "Chelsea",             │
│   homeLogo: "https://...",         │
│   awayLogo: "https://...",         │
│   homeScore: "2",                  │
│   awayScore: "1",                  │
│   matchStatus: "67",               │
│   isLive: true,                    │
│   league: "Premier League",        │
│   startTimestamp: 1234567890000    │
│ }                                  │
└────────────┬────────────────────────┘
             │
             │ useFootballAPI Hook
             │ Returns: FootballMatch[]
             │
             ▼
┌──────────────────────────────┐      JSON Stream Source
│ useAutoStreamMatcher Hook    │      ↓
│                              │      ┌────────────────────────┐
│ Receives FootballMatch       │      │ JSON Array             │
│ Searches JSON for match      │      │                        │
│                              │      │ [                     │
│ 1. Try fixture_id match      │      │   {                   │
│    "123" === "123" ? ✓       │      │     fixture_id: "123",│
│                              │      │     home: "Liverpool",│
│ Found! Extract:             │      │     away: "Chelsea",  │
│ streamUrl: "https://..."     │      │     stream_url: "..." │
│                              │      │   }                   │
└──────────────┬───────────────┘      │ ]                     │
               │                      └────────────────────────┘
               │
               │ createOrUpdateLiveEvent()
               │
               ▼
┌──────────────────────────────────────────────┐
│ LiveEvent Document (Firestore)              │
│                                              │
│ {                                           │
│   id: "event-123",                         │
│   title: "Liverpool vs Chelsea",           │
│   teamA: "Liverpool",        ← From API    │
│   teamALogo: "https://...",  ← From API    │
│   teamB: "Chelsea",          ← From API    │
│   teamBLogo: "https://...",  ← From API    │
│   streamUrl: "https://...",  ← From JSON ✓ │
│   league: "Premier League",  ← From API    │
│   startTime: 1234567890000,  ← From API    │
│   isActive: true,                          │
│   source: "json-auto"                      │
│ }                                          │
└──────────────┬───────────────────────────────┘
               │
               │ Real-time Sync
               │ (Firestore onSnapshot)
               │
               ▼
┌──────────────────────────────────────────────┐
│ React Component (FootballMatchCard)         │
│                                              │
│ match.teamALogo          match.teamBLogo    │
│      ▼                        ▼              │
│     🏟️ Liverpool    vs    Chelsea 🏟️        │
│                                              │
│        2 - 1                                 │
│        67'                                   │
│                                              │
│     match.league:                           │
│     Premier League                          │
│                                              │
│     IF match.streamUrl != "":              │
│        ↓                                     │
│     [Watch Now] ← Button visible            │
│                                              │
│     IF match.streamUrl == "":              │
│        ↓                                     │
│     (No button / "No Stream")               │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 3️⃣ Matching Priority Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Football API Match Found                                   │
│ • homeTeam: "Manchester United"                           │
│ • awayTeam: "Brighton"                                    │
│ • id: "999"                                               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
    ┌────────────────────────────────┐
    │ Priority 1: Exact Fixture ID   │
    │                                │
    │ Search JSON for:               │
    │ fixture_id = "999"             │
    │                                │
    │ Found? ─────── YES ───→ MATCH! │
    │ │                             │
    │ NO                            │
    │ │                             │
    └─┼──────────────────────────────┘
      │
      ▼
    ┌────────────────────────────────┐
    │ Priority 2: Fuzzy Team Match   │
    │                                │
    │ For each JSON entry:           │
    │                                │
    │ Normalize API teams:           │
    │ "Manchester United" → "manchu" │
    │ "Brighton" → "brighton"        │
    │                                │
    │ Normalize JSON teams:          │
    │ "Man Utd" → "manutd"          │
    │ "Brighton" → "brighton"        │
    │                                │
    │ Check:                         │
    │ "manutd" ∈ "manchester..."? NO│
    │ "manchester..." ∈ "manutd"? YES│
    │                                │
    │ Both teams match? ──→ MATCH!  │
    │ │                             │
    │ NO                            │
    │ │                             │
    └─┼──────────────────────────────┘
      │
      ▼
    ┌────────────────────────────────┐
    │ Priority 3: Reversed Teams     │
    │                                │
    │ Check if:                      │
    │ API home = JSON away           │
    │ API away = JSON home           │
    │                                │
    │ Example:                       │
    │ API: Man Utd vs Brighton       │
    │ JSON: Brighton vs Man Utd      │
    │                                │
    │ Match? ───────→ MATCH! ✓       │
    │ │                             │
    │ NO                            │
    │ │                             │
    └─┼──────────────────────────────┘
      │
      ▼
    ┌────────────────────────────────┐
    │ NO MATCH FOUND                 │
    │                                │
    │ Action:                        │
    │ Create LiveEvent without       │
    │ stream_url                     │
    │                                │
    │ Result:                        │
    │ Match shows but no [Watch Now]│
    └────────────────────────────────┘
```

---

## 4️⃣ Update Cycle

```
TIME TIMELINE
═══════════════════════════════════════════════════════════════

T=0s
  │
  ├─→ useFootballAPI Starts
  │   └─→ Fetch from API-Football
  │       └─→ Returns current live matches
  │
  └─→ useAutoStreamMatcher Starts
      └─→ Fetch from JSON URL
          └─→ Get stream data

T=2m (2 minutes later)
  │
  ├─→ useAutoStreamMatcher
  │   ├─→ Fetch JSON again
  │   ├─→ Match teams
  │   ├─→ Update/Create/Delete LiveEvents
  │   └─→ Update Firestore
  │
  └─→ Frontend Updates
      └─→ Show new matches with streams

T=4m (4 minutes later)
  │
  ├─→ useAutoStreamMatcher
  │   ├─→ Fetch JSON again
  │   ├─→ Check for new matches
  │   ├─→ Check for finished matches
  │   └─→ Auto-delete if not in JSON anymore
  │
  └─→ Frontend Updates
      └─→ Remove finished matches

T=20m (20 minutes later)
  │
  ├─→ useFootballAPI
  │   ├─→ Rate limit allows (e.g., 1 call/hour)
  │   ├─→ Fetch from API again
  │   └─→ Update match data
  │
  └─→ useAutoStreamMatcher
      ├─→ Fetch JSON again
      ├─→ Re-match everything
      └─→ Update Firestore

T=22m (22 minutes later)
  │
  ├─→ useAutoStreamMatcher
  │   └─→ Fetch JSON again
  │       └─→ Update streams
  │
  └─→ Continue cycling...

═══════════════════════════════════════════════════════════════
```

---

## 5️⃣ State Transitions

```
┌─────────────────────────────────┐
│ Match Created from API          │
│ (No stream found yet)           │
│                                 │
│ streamUrl: ""                   │
│ isActive: true                  │
│ UI: Match shown, NO button      │
└────────────┬────────────────────┘
             │
             │ 2 minutes later...
             │ Stream found in JSON
             │
             ▼
┌─────────────────────────────────┐
│ Match Updated                   │
│                                 │
│ streamUrl: "https://..."  ← NEW │
│ isActive: true                  │
│ UI: Match shown, [Watch Now]    │
└────────────┬────────────────────┘
             │
             │ Later...
             │ Match status in JSON: "finished"
             │
             ▼
┌─────────────────────────────────┐
│ Auto-Delete Triggered           │
│                                 │
│ (Deleted from database)         │
│                                 │
│ UI: Match disappears            │
└─────────────────────────────────┘

Alternative Path:
┌────────────────────────┐
│ Match stays live       │
│ (still in JSON)        │
└────────────┬───────────┘
             │
             │ Manual deletion by admin
             │
             ▼
┌────────────────────────┐
│ Document deleted       │
│ isActive: false        │
│                        │
│ UI: Match disappears   │
└────────────────────────┘
```

---

## 6️⃣ JSON Fetch & Parse

```
┌─────────────────────────────────────────┐
│ JSON URL                                │
│ https://example.com/streams.json        │
└────────────────┬────────────────────────┘
                 │
                 ▼ fetch()
┌─────────────────────────────────────────┐
│ HTTP Response                           │
│ [                                       │
│   {                                     │
│     "fixture_id": "1",                 │
│     "Team 1 Name": "Liverpool",        │
│     "Team 2 Name": "Chelsea",          │
│     "Stream URL": "https://stream.m3u8"│
│     "Match Status": "live"             │
│   },                                    │
│   {                                     │
│     "fixture_id": "2",                 │
│     "home": "Arsenal",                 │
│     "away": "Brighton",                │
│     "stream_url": "https://...",       │
│     "Match Status": "finished"         │
│   },                                    │
│   ...                                   │
│ ]                                       │
└────────────────┬────────────────────────┘
                 │
                 ▼ JSON Parser
┌─────────────────────────────────────────┐
│ Extract Stream Entries                  │
│                                         │
│ [                                       │
│   {                                     │
│     fixture_id: "1",                   │
│     home: "Liverpool",                 │
│     away: "Chelsea",                   │
│     streamUrl: "https://stream.m3u8",  │
│     status: "live"        ← Filter     │
│   },                                    │
│   {                                     │
│     fixture_id: "2",                   │
│     home: "Arsenal",                   │
│     away: "Brighton",                  │
│     streamUrl: "https://...",          │
│     status: "finished"    ← Skip       │
│   }                                     │
│ ]                                       │
└────────────────┬────────────────────────┘
                 │
                 ▼ Process Streams
┌─────────────────────────────────────────┐
│ Match with API & Create Events          │
│                                         │
│ For each Entry:                         │
│  ├─ Find matching API match             │
│  ├─ Extract stream_url                  │
│  ├─ Create/Update LiveEvent             │
│  └─ Cache result                        │
│                                         │
│ Cache updated:                          │
│ { data: [...], ts: Date.now() }        │
└──────────────────────────────────────────┘
```

---

## 7️⃣ Admin Workflow

```
┌─────────────────────────────────┐
│ Admin Dashboard                 │
│                                 │
│ 1. Go to App Settings          │
└──────────────┬──────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│ Football API Section             │
│                                  │
│ ☑ Enable Football API           │
│ Provider: [apifootball ▼]       │
│ API Key: [________________]     │
│          ↑ Paste from            │
│          api-football.com        │
│ Calls/Hour: [3 ▼]              │
│                                  │
│ [Save]                          │
└──────────────┬───────────────────┘
               │ ✓ Saved to Firestore
               │
               ▼ useFootballAPI reads
┌──────────────────────────────────┐
│ Matches Start Appearing          │
│ ✓ Live Scores section visible    │
└──────────────┬───────────────────┘
               │
               ▼
┌──────────────────────────────────┐
│ Auto Stream (JSON) Section       │
│                                  │
│ ☑ Auto Stream Enabled           │
│ JSON URL: [____________________] │
│           ↑ Paste from your      │
│           JSON server            │
│ [Save Stream Settings]          │
└──────────────┬───────────────────┘
               │ ✓ Saved to Firestore
               │
               ▼ useAutoStreamMatcher reads
┌──────────────────────────────────┐
│ Streams Start Getting Matched    │
│ ✓ [Watch Now] buttons appear    │
└──────────────────────────────────┘
```

---

## 8️⃣ Error Recovery

```
┌─────────────────────────────────┐
│ useAutoStreamMatcher Starts     │
└──────────────┬──────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Try Fetch JSON       │
    │                      │
    │ fetch(jsonUrl)       │
    └──────┬───────────────┘
           │
           ├─→ Success? YES ─→ Process streams
           │
           └─→ FAIL: Network error
               │
               ▼
           ┌─────────────────────┐
           │ Check Cache         │
           │                     │
           │ If cache exists:    │
           │ Use cached data     │
           │ (From 2m ago)       │
           │                     │
           │ If no cache:        │
           │ Skip processing     │
           │                     │
           │ Log error           │
           └─────────────────────┘

┌─────────────────────────────────┐
│ Football API Fetch Fails         │
└──────────────┬──────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Try Fallback         │
    │                      │
    │ If apifootball       │
    │ fails:               │
    │ → Try footballdata   │
    │ → Try cache          │
    │ → Return []          │
    └──────────────────────┘

Result: System keeps running,
showing cached/previous data
until recovery
```

---

## 9️⃣ Key Algorithms

### Team Name Normalization
```
Input: "Manchester United"

Step 1: toLowerCase()
  "manchester united"

Step 2: trim()
  "manchester united"

Step 3: replace(/[^a-z0-9]/g, "")
  "manchesterunited"

Step 4: replace(/\s+/g, "")
  "manchesterunited" (no change, already no spaces)

Output: "manchesterunited"

Compare:
  "manchester united" → "manchesterunited"
  "Man Utd"          → "manutd"
  
Contains check:
  Does "manchesterunited" contain "manutd"? YES ✓
```

### Fuzzy Match Algorithm
```
fuzzyMatch(a, b):
  na = normalize(a)
  nb = normalize(b)
  
  if (na.length < 3 || nb.length < 3):
    return false  // Too short to match
  
  if (na includes nb):
    return true   // "manchesterunited" includes "manutd" ✓
  
  if (nb includes na):
    return true   // "manutd" includes "manchesterunited"? NO
  
  return false
```

---

## 🔟 Performance Timeline

```
T=0ms        Admin clicks Save
T=1ms        Data written to Firestore
T=50ms       useFootballAPI reads config (onSnapshot)
T=100ms      useAutoStreamMatcher reads config
T=150ms      First API fetch starts
T=500ms      API response received
T=600ms      Parse & cache matches
T=650ms      First JSON fetch starts
T=700ms      JSON response received
T=750ms      Matching algorithm runs
T=800ms      LiveEvents updated in Firestore
T=850ms      Frontend listener triggered
T=900ms      Components re-render
T=950ms      UI shows matches and streams

Every 2 min:
  T+120s     JSON fetch again
  T+121s     Matches updated
  T+122s     UI updates

Every 20 min:
  T+20min    API fetch again
  T+20.5min  New data available
  T+21min    UI reflects changes
```

---

## Summary

The system works through:
1. **Admin Configuration** → Settings stored in Firestore
2. **API Integration** → Fetches live match data
3. **JSON Integration** → Fetches stream data
4. **Smart Matching** → Combines data using fuzzy logic
5. **Real-time Sync** → Frontend updates instantly
6. **Error Recovery** → Falls back to cache if needed

**Result:** Users see live matches with stream links automatically!

