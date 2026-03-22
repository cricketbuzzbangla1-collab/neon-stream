# Live Match Auto Merge - Complete Documentation

Welcome to the Live Match Auto Merge system! This README provides an overview of all documentation and guides available.

---

## 📚 Documentation Map

### 🚀 Getting Started
- **[QUICK_START.md](./QUICK_START.md)** - 5-minute setup guide
  - API key setup
  - JSON configuration
  - Testing
  - Quick troubleshooting

### 👨‍💼 For Admins
- **[ADMIN_SETUP_GUIDE.md](./ADMIN_SETUP_GUIDE.md)** - Detailed admin manual
  - Where to find settings
  - Football API configuration
  - JSON stream setup
  - Testing procedures
  - Complete troubleshooting

### 📋 For Implementation
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - System overview
  - What's implemented
  - Architecture diagram
  - File structure
  - Configuration options

### 🏗️ Technical Details
- **[LIVE_MATCH_AUTO_MERGE_GUIDE.md](./LIVE_MATCH_AUTO_MERGE_GUIDE.md)** - Complete technical guide
  - System architecture
  - Component descriptions
  - Data flow
  - Merge logic
  - Performance notes

### 📐 JSON Format Reference
- **[JSON_STREAM_FORMAT_GUIDE.md](./JSON_STREAM_FORMAT_GUIDE.md)** - JSON specification
  - Field reference
  - Format requirements
  - Valid examples
  - Invalid examples & fixes
  - Hosting options

### 💻 For Developers
- **[DEVELOPER_EXAMPLES.md](./DEVELOPER_EXAMPLES.md)** - Code examples
  - Custom matching logic
  - Team name mappings
  - Backend APIs
  - Testing
  - Performance optimization

---

## 🎯 Quick Navigation

### I want to...

**Set up the system quickly**
→ Read [QUICK_START.md](./QUICK_START.md)

**Configure as an admin**
→ Read [ADMIN_SETUP_GUIDE.md](./ADMIN_SETUP_GUIDE.md)

**Understand how it works**
→ Read [LIVE_MATCH_AUTO_MERGE_GUIDE.md](./LIVE_MATCH_AUTO_MERGE_GUIDE.md)

**Prepare JSON stream data**
→ Read [JSON_STREAM_FORMAT_GUIDE.md](./JSON_STREAM_FORMAT_GUIDE.md)

**Customize or extend the code**
→ Read [DEVELOPER_EXAMPLES.md](./DEVELOPER_EXAMPLES.md)

**See what's implemented**
→ Read [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

---

## ✨ Feature Overview

### What This System Does

1. **Fetches LIVE Matches** from professional APIs
   - Real-time scores and match status
   - Team information with logos
   - League and competition data

2. **Merges with Stream Data** from JSON sources
   - Automatically finds matching streams
   - Smart matching by fixture ID or team names
   - Handles different team name formats

3. **Displays for Users** with action buttons
   - "Live Scores" section on home page
   - Match info with logos and scores
   - "Watch Now" button when streams available

4. **Manages Automatically**
   - Updates every 2 minutes
   - Auto-creates/updates/deletes events
   - Handles duplicates
   - Error recovery

---

## 🚀 Quick Start (30 seconds)

### Step 1: Get API Key
Visit [api-football.com](https://www.api-football.com), sign up, copy key

### Step 2: Add to Admin Settings
Dashboard → Admin → App Settings → Paste key → Save

### Step 3: Prepare JSON
Create JSON array with matches and stream URLs (see examples below)

### Step 4: Host JSON
Upload to GitHub, Vercel, or any CORS-enabled server

### Step 5: Configure
Admin → App Settings → Auto Stream → Paste URL → Save

✅ **Done!** Matches should now appear with "Watch Now" buttons

---

## 📋 Example: Minimal Setup

### Step 1: Minimal JSON
```json
[
  {
    "home": "Liverpool",
    "away": "Chelsea",
    "stream_url": "https://stream.example.com/1.m3u8"
  }
]
```

### Step 2: Upload to GitHub
- Create repo: `my-streams`
- Add file: `streams.json` with above content
- Use raw URL: `https://raw.githubusercontent.com/[you]/my-streams/main/streams.json`

### Step 3: Configure
- Admin Dashboard → App Settings
- Football API Key: [from api-football.com]
- Auto Stream JSON URL: [GitHub raw URL]
- Click Save

### Step 4: Verify
- Go to home page
- See "Live Scores" section
- Should show matches with [Watch Now] buttons

---

## 🔧 Configuration

### Required Settings
```
Football API:
  - footballApiEnabled: true
  - footballApiKey: [your key]
  
Auto Stream JSON:
  - autoStreamEnabled: true
  - streamJsonUrl: https://your-json-url.com/streams.json
```

### Optional Settings
```
Football API:
  - footballApiProvider: "apifootball" (or "footballdata")
  - footballApiCallsPerHour: 3 (1-10)
  - disabledLeagues: [] (leagues to hide)
```

---

## 📊 Architecture at a Glance

```
┌──────────────────────────────────────────────┐
│          Admin Configuration Panel           │
│  (Football API Key + JSON Stream URL)        │
└──────────────┬───────────────────────────────┘
               │
    ┌──────────┴───────────┐
    ▼                      ▼
┌─────────────────┐  ┌──────────────────┐
│ useFootballAPI  │  │ useAutoStream    │
│ Hook            │  │ Matcher Hook     │
│                 │  │                  │
│ • Fetch API     │  │ • Fetch JSON     │
│ • Parse data    │  │ • Match teams    │
│ • Cache results │  │ • Auto-delete    │
└────────┬────────┘  └────────┬─────────┘
         │                    │
         └──────────┬─────────┘
                    ▼
         ┌──────────────────────┐
         │  Firestore Database  │
         │  (liveEvents)        │
         └──────────┬───────────┘
                    ▼
         ┌──────────────────────┐
         │  Frontend Display    │
         │  • Live Scores       │
         │  • Watch buttons     │
         └──────────────────────┘
```

---

## 🔄 How It Works

### 1. Football API Fetches
- Every ~20 minutes (based on call limit)
- Gets live and upcoming matches
- Returns team names, scores, logos

### 2. JSON Stream Fetches
- Every 2 minutes
- Extracts team names and stream URLs
- Caches results

### 3. Auto Merge
- Matches teams using fuzzy logic
- Attaches stream URLs to matches
- Creates/updates database records

### 4. Frontend Displays
- Real-time sync from database
- Shows "Watch Now" button if stream exists
- Updates automatically

---

## 📋 File Structure

### Core Implementation
```
src/hooks/
├── useFootballAPI.ts         ← API integration
├── useAutoStreamMatcher.ts   ← Stream matching
└── useFirestore.ts           ← Database

src/pages/
└── Index.tsx                 ← Main display

src/components/
├── FootballMatchCard.tsx     ← Match card UI
├── LiveEventCard.tsx         ← Event card UI
└── admin/
    └── AppSettingsManager.tsx ← Admin panel
```

### Documentation
```
📄 QUICK_START.md                    ← Start here (5 min)
📄 ADMIN_SETUP_GUIDE.md              ← Admin manual
📄 LIVE_MATCH_AUTO_MERGE_GUIDE.md    ← Technical details
📄 JSON_STREAM_FORMAT_GUIDE.md       ← JSON reference
📄 DEVELOPER_EXAMPLES.md             ← Code examples
📄 IMPLEMENTATION_SUMMARY.md         ← Overview
📄 README_LIVE_STREAMS.md            ← This file
```

---

## 🆘 Troubleshooting

### Matches Not Appearing
1. Check API key is valid
2. Verify Football API Enabled = ON
3. Refresh page
4. Check console (F12) for errors

### No "Watch Now" Buttons
1. Check JSON URL is accessible
2. Verify Auto Stream Enabled = ON
3. Check team names match between API and JSON
4. Try adding `fixture_id` to JSON

### JSON Won't Load
1. Test URL in browser
2. Check CORS headers enabled
3. Verify JSON format is valid
4. Use jsonlint.com to validate

### Stale Matches
1. Remove from JSON when finished
2. Update JSON every 1-2 minutes
3. Check auto-delete console logs
4. Manually delete if needed

**See [ADMIN_SETUP_GUIDE.md](./ADMIN_SETUP_GUIDE.md) for complete troubleshooting**

---

## ✅ Implementation Status

All requirements fully implemented:

- ✅ Live match fetching from APIs
- ✅ JSON stream data fetching (every 2 min)
- ✅ Fuzzy team name matching
- ✅ Fixture ID matching
- ✅ Automatic stream assignment
- ✅ Auto-deletion of expired matches
- ✅ Duplicate prevention
- ✅ Admin configuration panel
- ✅ Frontend display with watch buttons
- ✅ Rate limiting and caching
- ✅ Error handling and fallbacks
- ✅ CORS support
- ✅ Real-time database sync

---

## 🔐 Security Considerations

### API Keys
- Stored in Firestore (accessible to frontend)
- **For production:** Use backend proxy instead
- Keep keys private

### JSON URL
- Should use HTTPS
- Validate incoming data
- Consider field validation

### CORS
- Verify JSON server is trusted
- Consider using proxy for sensitive data
- Monitor for abuse

---

## 🚀 Deployment Checklist

- [ ] API key configured and tested
- [ ] JSON format validated (jsonlint.com)
- [ ] JSON URL publicly accessible
- [ ] CORS headers enabled on JSON server
- [ ] Admin settings saved
- [ ] Test with live matches
- [ ] Verify "Watch Now" buttons appear
- [ ] Monitor console for errors
- [ ] Set appropriate call rate limit

---

## 📞 Getting Help

### Documentation
- **Setup issues:** See [ADMIN_SETUP_GUIDE.md](./ADMIN_SETUP_GUIDE.md)
- **JSON format:** See [JSON_STREAM_FORMAT_GUIDE.md](./JSON_STREAM_FORMAT_GUIDE.md)
- **Technical details:** See [LIVE_MATCH_AUTO_MERGE_GUIDE.md](./LIVE_MATCH_AUTO_MERGE_GUIDE.md)
- **Code customization:** See [DEVELOPER_EXAMPLES.md](./DEVELOPER_EXAMPLES.md)

### External Resources
- [API-Football Docs](https://www.api-football.com/documentation)
- [Football-Data Docs](https://www.football-data.org/documentation)
- [Firebase Docs](https://firebase.google.com/docs)
- [React Documentation](https://react.dev)

---

## 💡 Pro Tips

### Tip 1: Use Fixture IDs
Add `fixture_id` to JSON for 100% accurate matching

### Tip 2: Regular Updates
Update JSON every 1-2 minutes for best experience

### Tip 3: Monitor Logs
Use browser console (F12) to monitor system activity

### Tip 4: Test Locally
Download JSON file and validate in browser first

### Tip 5: Rate Limit
Start with lower call limit, increase if needed

---

## 🎓 Learning Path

1. **Start:** [QUICK_START.md](./QUICK_START.md) (5 min)
2. **Setup:** [ADMIN_SETUP_GUIDE.md](./ADMIN_SETUP_GUIDE.md) (15 min)
3. **Understanding:** [LIVE_MATCH_AUTO_MERGE_GUIDE.md](./LIVE_MATCH_AUTO_MERGE_GUIDE.md) (30 min)
4. **JSON Data:** [JSON_STREAM_FORMAT_GUIDE.md](./JSON_STREAM_FORMAT_GUIDE.md) (20 min)
5. **Customization:** [DEVELOPER_EXAMPLES.md](./DEVELOPER_EXAMPLES.md) (varies)

---

## 🎉 Next Steps

1. **Read [QUICK_START.md](./QUICK_START.md)** to get up and running
2. **Configure in Admin Dashboard** with your API key and JSON URL
3. **Test on home page** and verify "Watch Now" buttons appear
4. **Monitor console logs** to see matching in action
5. **Customize as needed** using [DEVELOPER_EXAMPLES.md](./DEVELOPER_EXAMPLES.md)

---

## 📝 Notes

- System is production-ready
- All requirements implemented
- Comprehensive documentation provided
- Examples and troubleshooting guides included
- Performance optimized with caching
- Error handling and fallbacks in place

---

## 🙋 Questions?

Refer to the appropriate guide:
1. **"How do I set this up?"** → [QUICK_START.md](./QUICK_START.md)
2. **"Where are the settings?"** → [ADMIN_SETUP_GUIDE.md](./ADMIN_SETUP_GUIDE.md)
3. **"How does it work?"** → [LIVE_MATCH_AUTO_MERGE_GUIDE.md](./LIVE_MATCH_AUTO_MERGE_GUIDE.md)
4. **"What JSON format?"** → [JSON_STREAM_FORMAT_GUIDE.md](./JSON_STREAM_FORMAT_GUIDE.md)
5. **"How to customize?"** → [DEVELOPER_EXAMPLES.md](./DEVELOPER_EXAMPLES.md)

---

## 🏁 Summary

The Live Match Auto Merge system:
- ✅ Is **fully implemented**
- ✅ Is **production-ready**
- ✅ Is **well documented**
- ✅ Has **comprehensive guides**
- ✅ Includes **code examples**
- ✅ Provides **troubleshooting help**

**Get started with [QUICK_START.md](./QUICK_START.md) now!** 🚀

