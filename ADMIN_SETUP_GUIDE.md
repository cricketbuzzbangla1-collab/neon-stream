# Admin Setup Guide - Live Match Auto Merge

This guide explains how to configure the live match streaming system through the admin dashboard.

---

## 🎮 Quick Setup (3 Steps)

### Step 1: Enable Football API
1. Go to **Admin Dashboard** → **App Settings**
2. Find the **App Settings** card
3. Ensure `footballApiEnabled` is enabled (default: ON)

### Step 2: Set Your API Key
1. Get an API key from:
   - **Option A:** [API-Football](https://www.api-football.com/) (Recommended)
   - **Option B:** [Football-Data.org](https://www.football-data.org/)

2. In Admin Dashboard → **App Settings** (scroll down to find the API settings)
3. Enter your API key

### Step 3: Setup JSON Streams
1. Prepare your stream JSON file (see example below)
2. Host it on a server with CORS enabled
3. In Admin Dashboard → **App Settings** → **Auto Stream (JSON)**
4. Enter the JSON URL
5. Click **Save Stream Settings**

✅ **Done!** Matches should now appear with "Watch Now" buttons.

---

## 🎯 Where to Find Settings

### Path: Admin Dashboard → App Settings

The App Settings page has multiple sections:

```
┌─────────────────────────────────────────┐
│  App Settings (General)                 │
│  ├─ Enable Chat                         │
│  ├─ Enable Posts                        │
│  ├─ Enable Polls                        │
│  ├─ Bad Word Filter                     │
│  ├─ Allow Guest Watch                   │
│  ├─ Maintenance Mode                    │
│  ├─ Slow Mode (seconds)                 │
│  └─ [Save Button]                       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  Auto Stream (JSON)                     │
│  ├─ Auto Stream Enabled                 │
│  ├─ JSON URL Input                      │
│  └─ [Save Stream Settings Button]       │
└─────────────────────────────────────────┘
```

---

## 🔌 Configuring Football API

### Setting 1: Enable/Disable
**Toggle:** "Football API Enabled"
- **ON** (✓): Fetch live matches from API
- **OFF**: No matches fetched

### Setting 2: Choose Provider
**Select:** "Football API Provider"
- **apifootball** (Default): Faster, better support
- **footballdata**: Alternative if apifootball is down

### Setting 3: API Key
**Input:** "Football API Key" or "Football-Data API Key"

#### Getting API-Football Key
1. Visit [api-football.com](https://www.api-football.com/)
2. Sign up (free tier available)
3. Go to Dashboard → API Section
4. Copy your API key (long string of letters/numbers)
5. Paste in admin settings

#### Getting Football-Data Key
1. Visit [football-data.org](https://www.football-data.org/)
2. Register account
3. Go to Account → Token
4. Copy token
5. Paste in admin settings

### Setting 4: Rate Limiting
**Select:** "Football API Calls Per Hour"
- **1**: Minimal (1 call/hour) - Very limited data
- **2**: Conservative (2 calls/hour)
- **3**: Balanced (3 calls/hour) - Recommended
- **5+**: Aggressive (more updates but higher API cost)

### Setting 5: Disable Specific Leagues
**Multi-select:** "Disabled Leagues"
- Uncheck leagues you don't want to show
- Unchecked leagues won't appear in "Live Scores"

---

## 🌐 Configuring JSON Streams

### Setting 1: Enable/Disable
**Toggle:** "Auto Stream Enabled"
- **ON** (✓): Fetch streams from JSON every 2 minutes
- **OFF**: No streams fetched

### Setting 2: JSON URL
**Input:** "JSON URL"
- Enter full URL to your stream JSON file
- Must be publicly accessible
- Must have CORS headers enabled

#### Example URLs
```
https://example.com/streams.json
https://cdn.example.com/api/live-matches
https://streams.example.com/data.json
```

---

## 📝 Preparing Your JSON Streams File

### Format Requirements
JSON must be an array of stream objects:

```json
[
  {
    "fixture_id": "12345",
    "Team 1 Name": "Liverpool",
    "Team 2 Name": "Manchester City",
    "Stream URL": "https://stream.example.com/match1.m3u8",
    "Match Status": "live",
    "League": "Premier League"
  },
  {
    "home": "Arsenal",
    "away": "Chelsea",
    "stream_url": "https://stream.example.com/match2.m3u8",
    "Match Status": "live"
  }
]
```

### Accepted Field Names
The system recognizes multiple field name variations:

| Field | Alternatives |
|-------|--------------|
| Home Team | `home`, `home_team`, `homeTeam`, `Team 1 Name` |
| Away Team | `away`, `away_team`, `awayTeam`, `Team 2 Name` |
| Stream URL | `stream_url`, `streamUrl`, `url`, `source`, `Stream URL` |
| Match ID | `fixture_id`, `id` |
| Status | `Match Status` |
| League | `League`, `Category` |
| Team 1 Logo | `Team 1 Logo` |
| Team 2 Logo | `Team 2 Logo` |

### ✅ Valid Examples

**Example 1: Minimal**
```json
[
  {
    "home": "Team A",
    "away": "Team B",
    "stream_url": "https://stream1.m3u8",
    "Match Status": "live"
  }
]
```

**Example 2: Complete**
```json
[
  {
    "fixture_id": "123",
    "Team 1 Name": "Liverpool",
    "Team 2 Logo": "https://logo.png",
    "Team 2 Name": "Chelsea",
    "Team 2 Logo": "https://logo2.png",
    "Stream URL": "https://stream.m3u8",
    "Match Status": "live",
    "League": "Premier League",
    "Team 1 Logo": "https://logo1.png"
  }
]
```

**Example 3: Different Format**
```json
[
  {
    "id": "456",
    "homeTeam": "Arsenal",
    "awayTeam": "Brighton",
    "streamUrl": "https://stream2.m3u8",
    "player_type": "hls"
  }
]
```

### ❌ Common Mistakes

**Wrong: Not an array**
```json
{
  "home": "Team A",
  "away": "Team B"
}
```
✓ Fix: Wrap in brackets: `[{ ... }]`

**Wrong: Missing stream URL**
```json
[
  {
    "home": "Team A",
    "away": "Team B"
  }
]
```
✓ Fix: Add one of: `stream_url`, `streamUrl`, `url`, `source`, `Stream URL`

**Wrong: Wrong status**
```json
[
  {
    "home": "Team A",
    "away": "Team B",
    "stream_url": "https://...",
    "Match Status": "upcoming"
  }
]
```
✓ Fix: Use `"Match Status": "live"` for active matches

---

## 🔍 Testing Your Setup

### Step 1: Verify JSON is Accessible
```
1. Copy your JSON URL
2. Paste in browser address bar
3. You should see the JSON array appear
4. Check JSON format is valid (not error)
```

### Step 2: Check Admin Settings
```
1. Go to Admin Dashboard → App Settings
2. Verify JSON URL is entered
3. Verify "Auto Stream Enabled" is ON
4. Click "Save Stream Settings"
5. Check browser console (F12) for logs
```

### Step 3: Check Football API
```
1. Go to Home page
2. Scroll to "Live Scores" section
3. If matches appear = API working ✓
4. If no matches = Check API key is valid
```

### Step 4: Verify Matching
```
1. Check browser Console (F12)
2. Look for message: "Auto-stream: X matches linked"
3. Open Live Scores section
4. Look for [Watch Now] buttons
5. If buttons appear = Matching working ✓
```

---

## 📊 Console Logs (Debug Info)

Open Browser DevTools (F12) → Console to see:

```
✅ Auto-imported (API+JSON): Liverpool vs Man City
   → Match was in both API and JSON, stream added

📡 Auto-stream: 5 matches linked
   → Successfully linked 5 matches with streams

🔄 Updated stream: Arsenal vs Chelsea
   → Stream URL was updated for existing match

✅ JSON-only live: Team A vs Team B
   → Match only in JSON, no API match found

🗑️ Auto-deleted: Team X vs Team Y
   → Match no longer live in JSON, was deleted

⚠️ Hourly limit reached
   → Too many API calls, increase call limit in admin
```

---

## 🚨 Troubleshooting

### Problem 1: No Matches Appear
**Cause:** API not enabled or API key invalid  
**Fix:**
1. Check "Football API Enabled" is ON
2. Verify API key is correct
3. Refresh page, wait 30 seconds
4. Check console for errors

### Problem 2: Matches Appear But No "Watch Now" Buttons
**Cause:** JSON not configured or teams don't match  
**Fix:**
1. Check "Auto Stream Enabled" is ON
2. Verify JSON URL is correct
3. Test JSON URL in browser
4. Check team names match between API and JSON
5. Try adding `fixture_id` to JSON for exact matching

### Problem 3: "CORS Error" in Console
**Cause:** JSON server doesn't allow cross-origin requests  
**Fix:**
1. Contact JSON server owner
2. Ask them to enable CORS headers
3. Headers needed: `Access-Control-Allow-Origin: *`
4. Use CORS proxy temporarily (not recommended for production)

### Problem 4: Old Matches Stick Around
**Cause:** JSON still lists them as "live" or auto-delete disabled  
**Fix:**
1. Remove matches from JSON when they finish
2. Set `"Match Status": "finished"` in JSON
3. Wait 2 minutes for next auto-delete run
4. Manually delete from Firestore if needed

### Problem 5: Same Match Appears Multiple Times
**Cause:** API and JSON both imported separately  
**Fix:**
1. Add `fixture_id` to JSON entries (should be same as API ID)
2. Or ensure team names match exactly
3. Check for duplicate entries in JSON

---

## 📞 Getting Help

### API Issues
- **API-Football**: [Support](https://www.api-football.com/support)
- **Football-Data**: [FAQ](https://www.football-data.org/faq)

### JSON Hosting
Popular free options:
- GitHub Raw Content
- Vercel Serverless Functions
- Firebase Realtime Database
- AWS S3
- Any web server with CORS enabled

### Common CORS Solution
If your JSON is on a different domain, ensure these headers:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

---

## 🎬 Complete Setup Example

### Scenario: Setting up with GitHub JSON file

**Step 1: Create JSON file on GitHub**
```
Repository: my-streams-repo
File: streams.json
Content: [
  {
    "fixture_id": "1",
    "home": "Liverpool",
    "away": "Manchester City",
    "stream_url": "https://stream1.example.com/live.m3u8",
    "Match Status": "live"
  }
]
```

**Step 2: Get raw URL**
```
https://raw.githubusercontent.com/myusername/my-streams-repo/main/streams.json
```

**Step 3: Add to Admin Settings**
```
Admin Dashboard → App Settings → Auto Stream
JSON URL: https://raw.githubusercontent.com/...
Enable: ON
Save ✓
```

**Step 4: Verify**
```
Home → Live Scores → Should show matches with [Watch Now]
```

---

## ⚙️ Advanced Configuration

### Disable Specific Leagues
1. Admin Dashboard → App Settings
2. Scroll to "Disabled Leagues"
3. Uncheck leagues to hide
4. Click Save

### Change Update Frequency
JSON fetches every **2 minutes** (fixed). To change:
- Modify `FETCH_INTERVAL` in `useAutoStreamMatcher.ts`
- Default: `2 * 60 * 1000` (2 minutes)

### Manual API Rate Limiting
Set different call limits based on:
- **1**: Test/development mode
- **2-3**: Standard production
- **5+**: High-volume streaming sites

---

## 📋 Checklist

Before going live:

- [ ] API key obtained and entered
- [ ] Football API enabled
- [ ] JSON file created with correct format
- [ ] JSON hosted on public URL with CORS
- [ ] JSON URL entered in admin settings
- [ ] Auto Stream enabled
- [ ] Test with sample match
- [ ] Verified "Watch Now" button appears
- [ ] Console logs show matching success
- [ ] Set appropriate call rate limit

✅ **All set!** System should now be fully operational.

