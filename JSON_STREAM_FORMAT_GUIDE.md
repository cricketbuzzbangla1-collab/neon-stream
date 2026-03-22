# JSON Stream Format - Complete Reference

This document details the exact JSON format expected by the Auto Stream Matcher system.

---

## 📐 Basic Structure

The JSON file **must be an array** of stream objects:

```json
[
  { /* Stream Entry 1 */ },
  { /* Stream Entry 2 */ },
  { /* Stream Entry 3 */ }
]
```

---

## 🔑 Field Reference

### Team Names (Required for Matching)

The system recognizes these field names for team data:

| API Field | Aliases | Example |
|-----------|---------|---------|
| Home Team | `home`, `home_team`, `homeTeam`, `Team 1 Name` | `"Liverpool"` |
| Away Team | `away`, `away_team`, `awayTeam`, `Team 2 Name` | `"Manchester City"` |

```json
// All these formats are equivalent:
[
  { "home": "Liverpool", "away": "Chelsea", "stream_url": "..." },
  { "home_team": "Liverpool", "away_team": "Chelsea", "stream_url": "..." },
  { "homeTeam": "Liverpool", "awayTeam": "Chelsea", "streamUrl": "..." },
  { "Team 1 Name": "Liverpool", "Team 2 Name": "Chelsea", "Stream URL": "..." }
]
```

### Stream URL (Required for Streaming)

The system recognizes these field names for stream links:

| API Field | Aliases | Example |
|-----------|---------|---------|
| Stream URL | `stream_url`, `streamUrl`, `url`, `source`, `Stream URL` | `"https://stream.m3u8"` |

```json
// All these work:
[
  { "home": "Team A", "away": "Team B", "stream_url": "https://..." },
  { "home": "Team A", "away": "Team B", "streamUrl": "https://..." },
  { "home": "Team A", "away": "Team B", "url": "https://..." },
  { "home": "Team A", "away": "Team B", "source": "https://..." },
  { "home": "Team A", "away": "Team B", "Stream URL": "https://..." }
]
```

### Match ID (Optional - Highly Recommended)

Exact match by ID - **Best accuracy if available**:

```json
[
  {
    "fixture_id": "12345",          // ← Matches API match.id exactly
    "Team 1 Name": "Liverpool",
    "Team 2 Name": "Chelsea",
    "Stream URL": "https://stream.m3u8"
  }
]
```

Alternative field names: `fixture_id`, `id`

### Match Status (Optional - Controls Auto-Delete)

Controls which matches create auto LiveEvents:

```json
[
  {
    "home": "Liverpool",
    "away": "Chelsea",
    "stream_url": "https://...",
    "Match Status": "live"            // ← Only "live" creates auto events
  }
]
```

**Valid values:**
- `"live"` - Match is currently live, create event
- `"upcoming"` - Match not yet live, skip (or match to API upcoming)
- `"finished"` - Match ended, skip
- (any other value) - Skip

### League (Optional - For Display)

League/category information:

```json
[
  {
    "home": "Liverpool",
    "away": "Chelsea",
    "stream_url": "https://...",
    "League": "Premier League"        // ← Display in match card
  }
]
```

Alternative: `Category`

### Team Logos (Optional - For Display)

```json
[
  {
    "Team 1 Name": "Liverpool",
    "Team 1 Logo": "https://logo1.png",
    "Team 2 Name": "Chelsea",
    "Team 2 Logo": "https://logo2.png",
    "Stream URL": "https://stream.m3u8"
  }
]
```

### Player Type (Optional)

Stream player type (if not HLS):

```json
[
  {
    "home": "Liverpool",
    "away": "Chelsea",
    "stream_url": "https://...",
    "player_type": "hls"              // or "dash", "iframe", etc.
  }
]
```

---

## 📋 Complete Field List

```json
[
  {
    // REQUIRED for matching
    "Team 1 Name": "Liverpool",      // or: home, home_team, homeTeam
    "Team 2 Name": "Chelsea",        // or: away, away_team, awayTeam
    "Stream URL": "https://...",     // or: stream_url, streamUrl, url, source

    // HIGHLY RECOMMENDED (for exact matching)
    "fixture_id": "12345",           // or: id

    // OPTIONAL (for auto-delete logic)
    "Match Status": "live",          // "live", "upcoming", "finished"

    // OPTIONAL (for display)
    "League": "Premier League",      // or: Category
    "Team 1 Logo": "https://...",    // Team 1 logo URL
    "Team 2 Logo": "https://...",    // Team 2 logo URL
    "player_type": "hls",            // Player type

    // OTHER FIELDS (ignored but OK to include)
    "any_other_field": "value"       // Won't cause errors
  }
]
```

---

## ✅ Valid Examples

### Example 1: Minimal (Bare Minimum)
```json
[
  {
    "home": "Liverpool",
    "away": "Chelsea",
    "stream_url": "https://stream.example.com/1.m3u8"
  }
]
```

### Example 2: With Fixture ID (Recommended)
```json
[
  {
    "fixture_id": "123456",
    "home": "Liverpool",
    "away": "Chelsea",
    "stream_url": "https://stream.example.com/1.m3u8",
    "Match Status": "live"
  }
]
```

### Example 3: Full Featured
```json
[
  {
    "fixture_id": "123456",
    "Team 1 Name": "Liverpool",
    "Team 1 Logo": "https://crests.football-data.org/58.svg",
    "Team 2 Name": "Chelsea",
    "Team 2 Logo": "https://crests.football-data.org/8.svg",
    "Stream URL": "https://stream.example.com/match1.m3u8",
    "Match Status": "live",
    "League": "Premier League",
    "player_type": "hls",
    "stadium": "Anfield",
    "referee": "John Moss"
  }
]
```

### Example 4: Multiple Matches
```json
[
  {
    "fixture_id": "1",
    "home": "Liverpool",
    "away": "Chelsea",
    "stream_url": "https://stream.com/1.m3u8",
    "Match Status": "live"
  },
  {
    "fixture_id": "2",
    "home": "Arsenal",
    "away": "Brighton",
    "stream_url": "https://stream.com/2.m3u8",
    "Match Status": "live"
  },
  {
    "fixture_id": "3",
    "home": "Man City",
    "away": "Man United",
    "stream_url": "https://stream.com/3.m3u8",
    "Match Status": "live"
  }
]
```

### Example 5: Mixed Field Names
```json
[
  {
    "fixture_id": "1",
    "homeTeam": "Liverpool",
    "awayTeam": "Chelsea",
    "streamUrl": "https://stream.com/1.m3u8"
  },
  {
    "id": "2",
    "home_team": "Arsenal",
    "away_team": "Brighton",
    "stream_url": "https://stream.com/2.m3u8"
  },
  {
    "fixture_id": "3",
    "Team 1 Name": "Man City",
    "Team 2 Name": "Man United",
    "Stream URL": "https://stream.com/3.m3u8"
  }
]
```

---

## ❌ Invalid Examples & Fixes

### ❌ Error 1: Not an Array
```json
{
  "home": "Liverpool",
  "away": "Chelsea",
  "stream_url": "https://..."
}
```

✅ **Fix:**
```json
[
  {
    "home": "Liverpool",
    "away": "Chelsea",
    "stream_url": "https://..."
  }
]
```

---

### ❌ Error 2: Missing Stream URL
```json
[
  {
    "home": "Liverpool",
    "away": "Chelsea"
  }
]
```

✅ **Fix:**
```json
[
  {
    "home": "Liverpool",
    "away": "Chelsea",
    "stream_url": "https://..."
  }
]
```

---

### ❌ Error 3: Missing Both Team Names
```json
[
  {
    "Team 1": "Liverpool",
    "Team 2": "Chelsea",
    "stream_url": "https://..."
  }
]
```

✅ **Fix:** Use recognized field names
```json
[
  {
    "home": "Liverpool",
    "away": "Chelsea",
    "stream_url": "https://..."
  }
]
```

---

### ❌ Error 4: Empty Stream URL
```json
[
  {
    "home": "Liverpool",
    "away": "Chelsea",
    "stream_url": ""
  }
]
```

✅ **Fix:** Add valid URL
```json
[
  {
    "home": "Liverpool",
    "away": "Chelsea",
    "stream_url": "https://stream.example.com/live.m3u8"
  }
]
```

---

### ❌ Error 5: Status Not Recognized
```json
[
  {
    "home": "Liverpool",
    "away": "Chelsea",
    "stream_url": "https://...",
    "Match Status": "active"
  }
]
```

✅ **Fix:** Use "live"
```json
[
  {
    "home": "Liverpool",
    "away": "Chelsea",
    "stream_url": "https://...",
    "Match Status": "live"
  }
]
```

---

## 🔄 Matching Algorithm

### Priority 1: Fixture ID (Best)
```
If Match.id === Stream.fixture_id
  → Match found! Link stream to match
```

Example:
```json
// API Match has id: "100"
// JSON Entry has fixture_id: "100"
→ Matched immediately (best accuracy)
```

### Priority 2: Team Name Fuzzy Match
```
Normalize both names:
1. Convert to lowercase
2. Trim whitespace
3. Remove special characters ([^a-z0-9])

If normalized names match or contain each other:
  → Match found
```

Examples:
```
API: "Manchester United"   vs   JSON: "Man Utd"
Norm: "manchesterunited"   vs   Norm: "manutd"
Contains check: "manchesterunited" contains "manutd"? NO
Contains check: "manutd" in "manchesterunited"? YES ✓

API: "São Paulo" vs JSON: "Sao Paulo"
Norm: "saopaulo" vs Norm: "saopaulo"
Exact match: YES ✓

API: "FC Basel 1893" vs JSON: "Basel"
Norm: "fcbasel1893" vs Norm: "basel"
Contains check: YES ✓
```

### Priority 3: Reverse Team Matching
```
If (Home team matches Away team) AND (Away team matches Home team)
  → Match found (teams in different order)
```

Example:
```json
API Match: { home: "Liverpool", away: "Chelsea" }
JSON Entry: { home: "Chelsea", away: "Liverpool" }
→ Matched with teams reversed
```

---

## 🎯 Matching Strategy Recommendations

### Best: Use Fixture IDs
```json
[
  {
    "fixture_id": "100",
    "home": "Liverpool",
    "away": "Chelsea",
    "stream_url": "https://..."
  }
]
```
**Pros:** Exact matching, 100% accuracy  
**Cons:** Requires knowledge of API fixture IDs

### Good: Use Standard Team Names
```json
[
  {
    "home": "Liverpool",
    "away": "Chelsea",
    "stream_url": "https://..."
  }
]
```
**Pros:** Works with any team names  
**Cons:** Fuzzy matching may have false positives

### Better: Combine Both
```json
[
  {
    "fixture_id": "100",
    "home": "Liverpool",
    "away": "Chelsea",
    "stream_url": "https://..."
  }
]
```
**Pros:** Exact match first, fallback to fuzzy  
**Cons:** Need fixture IDs

---

## 🔍 Team Name Matching Examples

| API Team | JSON Team | Match? | Reason |
|----------|-----------|--------|--------|
| Liverpool | Liverpool | ✓ | Exact |
| Liverpool | liverpool | ✓ | Case-insensitive |
| Liverpool | LIVERPOOL | ✓ | Case-insensitive |
| Manchester United | Man Utd | ✓ | Fuzzy match |
| Manchester United | Manchester United FC | ✓ | Contains |
| Manchester City | Man City | ✓ | Fuzzy match |
| Tottenham Hotspur | Spurs | ✗ | No match (too different) |
| Borussia Dortmund | Dortmund | ✓ | Contains |
| FC Barcelona | Barcelona | ✓ | Contains |
| Paris Saint-Germain | PSG | ✗ | No match (too different) |

---

## 📍 Hosting Your JSON File

### Option 1: GitHub (Free)
```
1. Create file: streams.json
2. Add JSON content
3. Commit to repository
4. Use Raw URL: https://raw.githubusercontent.com/[user]/[repo]/[branch]/streams.json
5. Admin Settings → Auto Stream → Add URL
```

**CORS Status:** ✓ Works

### Option 2: Vercel (Free)
Create `api/streams.json.ts`:
```typescript
export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json([
    {
      "home": "Liverpool",
      "away": "Chelsea",
      "stream_url": "https://..."
    }
  ]);
}
```

**CORS Status:** ✓ Automatic

### Option 3: Firebase (Free Tier)
```
1. Create Realtime Database
2. Add JSON data
3. Use URL: https://[project].firebaseio.com/streams.json
4. Add .json extension for REST API
```

**CORS Status:** ✓ Enabled by default

### Option 4: AWS S3 (Paid)
```
1. Upload JSON to S3
2. Enable CORS: Allow GET from *
3. Use object URL
4. Set metadata: Content-Type: application/json
```

**CORS Status:** ⚠️ Needs configuration

### Option 5: Regular Web Server
```
1. Upload to web server
2. Add headers:
   Access-Control-Allow-Origin: *
   Content-Type: application/json
3. Use direct URL
```

**CORS Status:** ⚠️ Depends on server

---

## 🧪 Testing Your JSON

### Test 1: Validate JSON Syntax
```
1. Copy JSON content
2. Go to jsonlint.com
3. Paste JSON
4. Click "Validate"
5. Should show "Valid JSON"
```

### Test 2: Test Accessibility
```
1. Copy your JSON URL
2. Open in browser: https://...
3. Should see JSON array
4. Check Network tab shows 200 OK
```

### Test 3: Test CORS
```
Open browser console and run:
fetch('https://your-json-url.com/streams.json')
  .then(r => r.json())
  .then(data => console.log(data))
  .catch(e => console.error('CORS Error:', e));

Should print JSON array, not error
```

### Test 4: Test in Admin
```
1. Admin Dashboard → App Settings
2. Enter JSON URL
3. Enable Auto Stream
4. Save
5. Open Console (F12)
6. Should show: "📡 Stream JSON: fetched X entries"
```

---

## 🚀 Example: Dynamic JSON Generation

If you want to generate JSON dynamically from your backend:

### Node.js / Express
```javascript
app.get('/api/streams.json', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.json([
    {
      "fixture_id": Math.floor(Math.random() * 10000),
      "home": "Liverpool",
      "away": "Chelsea",
      "stream_url": process.env.STREAM_URL_1,
      "Match Status": "live"
    }
  ]);
});
```

### Python / Flask
```python
@app.route('/api/streams.json', methods=['GET'])
def streams():
    response = {
        "fixture_id": 123,
        "home": "Liverpool",
        "away": "Chelsea",
        "stream_url": os.getenv("STREAM_URL_1"),
        "Match Status": "live"
    }
    headers = {'Access-Control-Allow-Origin': '*'}
    return jsonify([response]), 200, headers
```

### Static JSON File Update
Update JSON file periodically (e.g., every hour):
```bash
#!/bin/bash
# update-streams.sh
curl -s "https://api-football.com/..." | \
  jq '[.[] | {fixture_id, home, away, stream_url}]' > streams.json
git add streams.json
git commit -m "Update streams"
git push
```

---

## 📞 Validation Checklist

Before deploying:

- [ ] JSON is valid (tested on jsonlint.com)
- [ ] JSON is an array: `[{ ... }]`
- [ ] Each entry has: `home`, `away`, `stream_url`
- [ ] Stream URLs are valid and work
- [ ] JSON URL is publicly accessible
- [ ] CORS headers are enabled
- [ ] Team names match API team names (or use fixture_id)
- [ ] "Match Status" is set to "live" for active matches
- [ ] No special characters breaking JSON syntax
- [ ] File is updated regularly (not stale)

✅ **Ready to deploy!**

