# Live Match Auto Merge - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Get API Key (2 min)
- Visit [api-football.com](https://www.api-football.com)
- Sign up (free tier available)
- Copy your API key

### Step 2: Configure in Admin
- Dashboard → Admin → App Settings
- Paste API key into "Football API Key"
- Click **Save**

### Step 3: Prepare Stream JSON
```json
[
  {
    "home": "Liverpool",
    "away": "Chelsea",
    "stream_url": "https://stream.example.com/link.m3u8",
    "Match Status": "live"
  }
]
```

### Step 4: Host JSON
- Upload file to GitHub, Vercel, or any web server
- Get public URL
- Ensure CORS is enabled

### Step 5: Connect JSON
- Admin Dashboard → App Settings → Auto Stream
- Paste JSON URL
- Toggle "Auto Stream Enabled"
- Click **Save Stream Settings**

### ✅ Done!
Go to home page → Live Scores should show matches with "Watch Now" buttons

---

## 🎮 Admin Dashboard Checklist

**Location:** Top right corner → Admin

### Enable Football API
```
App Settings → Football API Enabled: ON ✓
```

### Set API Key
```
App Settings → Football API Key: [paste key]
```

### Set JSON URL
```
Auto Stream → JSON URL: https://your-json-url.com/streams.json
```

### Enable Auto Stream
```
Auto Stream → Auto Stream Enabled: ON ✓
```

### Optional: Adjust Call Rate
```
App Settings → Football API Calls Per Hour: 3 (recommended)
```

---

## 📋 JSON Format (Minimal)

```json
[
  {
    "home": "Team A",
    "away": "Team B", 
    "stream_url": "https://..."
  }
]
```

**With Fixture ID (Better):**
```json
[
  {
    "fixture_id": "12345",
    "home": "Team A",
    "away": "Team B",
    "stream_url": "https://...",
    "Match Status": "live"
  }
]
```

---

## 🔍 Verify It Works

1. **Check Home Page**
   - Go to home page
   - Scroll to "Live Scores"
   - Should see football matches

2. **Check for Streams**
   - Look for [Watch Now] buttons
   - If missing, check console

3. **Check Console (F12)**
   - Should see: `📡 Auto-stream: X matches linked`
   - Should see: `✅ Auto-imported...` messages

---

## 🆘 Troubleshooting

### No matches appear
- **Check:** API key is valid
- **Check:** Football API Enabled is ON
- **Fix:** Refresh page, wait 30 seconds

### Matches but no streams
- **Check:** JSON URL is correct
- **Check:** Auto Stream Enabled is ON
- **Check:** Team names match between API and JSON
- **Fix:** Try adding `fixture_id` to JSON

### JSON not loading
- **Check:** URL is accessible in browser
- **Check:** CORS headers enabled
- **Test:** 
  ```javascript
  fetch('https://your-url.com/streams.json')
    .then(r => r.json())
    .then(d => console.log(d))
  ```

---

## 📚 Full Documentation

- **Complete Guide:** `LIVE_MATCH_AUTO_MERGE_GUIDE.md`
- **Admin Manual:** `ADMIN_SETUP_GUIDE.md`
- **JSON Reference:** `JSON_STREAM_FORMAT_GUIDE.md`
- **Implementation:** `IMPLEMENTATION_SUMMARY.md`

---

## 🌐 Free JSON Hosting Options

1. **GitHub Raw**
   - Easy setup, no config
   - URL: `https://raw.githubusercontent.com/[user]/[repo]/[branch]/streams.json`

2. **Vercel Functions**
   - Automatic CORS
   - Dynamic generation possible

3. **Firebase Realtime DB**
   - CORS enabled by default
   - Real-time updates

4. **Any Web Server**
   - Add header: `Access-Control-Allow-Origin: *`

---

## 💡 Pro Tips

### Tip 1: Use Fixture IDs
- Add `fixture_id` to JSON matching API match IDs
- Ensures 100% accurate matching

### Tip 2: Regular Updates
- Update JSON every 1-2 minutes
- Removes finished matches
- Adds new live streams

### Tip 3: Monitor Console
- F12 → Console tab
- Watch for error messages
- Helps debug issues

### Tip 4: Test Locally
- Download your JSON file
- Open in browser → Check format
- Use jsonlint.com for validation

---

## ⚡ System Features

✅ Live score updates from APIs  
✅ Auto-matching with JSON streams  
✅ "Watch Now" buttons on matches  
✅ Admin configuration panel  
✅ Real-time database sync  
✅ Error handling & fallbacks  
✅ CORS support  
✅ Rate limiting  
✅ Caching system  

---

## 🎯 Matching Priority

1. **Fixture ID** (Best accuracy)
   ```json
   { "fixture_id": "100", "home": "...", "away": "...", "stream_url": "..." }
   ```

2. **Team Names** (Fuzzy match)
   ```json
   { "home": "Man Utd", "away": "Chelsea", "stream_url": "..." }
   { "home": "Manchester United", "away": "Chelsea", "stream_url": "..." }
   ↓ Both match! ✓
   ```

3. **Reversed Teams** (Different order)
   ```json
   { "home": "Chelsea", "away": "Man Utd", "stream_url": "..." }
   ↓ Also matches! ✓
   ```

---

## 📊 Live Updates

- **API Matches:** Updated based on call limit (default: every ~20 min)
- **JSON Streams:** Updated every 2 minutes
- **Frontend:** Real-time sync via Firestore
- **Auto-Delete:** Finished matches removed automatically

---

## 🔐 Security

- Store API keys securely
- Use HTTPS for JSON URLs
- CORS validation
- No sensitive data in JSON

---

## 📞 Need Help?

1. Check console logs (F12)
2. Read troubleshooting section above
3. See full guides in documentation files
4. Test JSON format: jsonlint.com

---

## ✨ You're All Set!

Your live match streaming system is now:
- ✅ Fetching live matches from APIs
- ✅ Matching with JSON streams
- ✅ Displaying with watch buttons
- ✅ Auto-updating every 2 minutes

**Go live!** 🚀

