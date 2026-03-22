# SEO Architecture & Integration Guide

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Admin Dashboard                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ SEO Settings Manager (SeoSettingsManager.tsx)         │  │
│  │ - Input: Google verification code                      │  │
│  │ - Input: Custom robots.txt rules                       │  │
│  │ - Input: Sitemap URL                                   │  │
│  │ - Output: Meta tag preview, Robots.txt preview         │  │
│  └───────────────────────────────────────────────────────┘  │
│                          ↓                                   │
│                   Save to Firebase                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
                  ┌────────────────┐
                  │  Firebase DB   │
                  │ (appSettings)  │
                  └────────────────┘
                    ↓              ↓
         ┌──────────────┐  ┌───────────────┐
         │  App.tsx     │  │ API Routes    │
         │ Meta Tag     │  │ - sitemap.ts  │
         │ Injection    │  │ - robots.ts   │
         └──────────────┘  └───────────────┘
                ↓                 ↓
         ┌──────────────┐  ┌───────────────┐
         │ <head> Tag   │  │ HTTP Response│
         │ (Dynamic)    │  │ (Cached)     │
         └──────────────┘  └───────────────┘
```

## Data Flow

### 1. Admin Settings Update

```
Admin Input
    ↓
SeoSettingsManager.tsx
    ↓
Firebase Firestore (appSettings/config)
    {
      seo: {
        googleVerificationCode: "...",
        sitemapUrl: "...",
        robotsText: "..."
      }
    }
    ↓
App.tsx (useAppSettings hook)
    ↓
React Effect Hook
    ↓
Inject Meta Tag in <head>
```

### 2. Sitemap Generation

```
HTTP Request → /api/sitemap
    ↓
sitemap.ts Handler
    ↓
Firebase Query (channels, events, playlists)
    ↓
Generate XML
    {
      <url>
        <loc>...</loc>
        <lastmod>...</lastmod>
        <changefreq>...</changefreq>
        <priority>...</priority>
      </url>
    }
    ↓
Return with Cache Headers
    ↓
Google Search Console
```

### 3. Robots.txt Generation

```
HTTP Request → /api/robots
    ↓
robots.ts Handler
    ↓
Firebase Query (appSettings/config)
    ↓
Check for Custom Rules
    ├─ YES → Use Custom rules
    └─ NO  → Use Default rules
    ↓
Return Text Response
    ↓
Search Engine Crawler
```

## Component Architecture

### SeoSettingsManager.tsx

**Purpose**: Admin UI for SEO settings

**Dependencies**:
- React (useState, useEffect)
- Firebase Firestore (doc, onSnapshot, updateDoc)
- Lucide Icons (Save, Copy, Check, Globe, FileText)
- Sonner (toast notifications)

**State Management**:
```typescript
interface SeoSettings {
  googleVerificationCode: string;
  sitemapUrl: string;
  robotsText: string;
}
```

**Key Functions**:
- `handleSave()` - Persist settings to Firebase
- `copyToClipboard()` - Copy meta tag/robots.txt to clipboard
- Real-time meta tag preview
- Real-time robots.txt preview

### App.tsx Integration

**Code**:
```typescript
const AppContent = () => {
  const { settings } = useAppSettings();

  useEffect(() => {
    if (settings.seo?.googleVerificationCode) {
      let metaTag = document.querySelector('meta[name="google-site-verification"]');
      if (!metaTag) {
        metaTag = document.createElement("meta");
        metaTag.setAttribute("name", "google-site-verification");
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute("content", settings.seo.googleVerificationCode);
    }
  }, [settings.seo?.googleVerificationCode]);
```

**Effect**:
- Runs on component mount
- Re-runs when verification code changes
- Creates or updates meta tag in document head
- No page reload required

### API: sitemap.ts

**Endpoint**: `GET /api/sitemap`

**Returns**: `Content-Type: application/xml`

**Cache**: `max-age=3600` (1 hour)

**Process**:
1. Initialize Firebase connection
2. Fetch static page list
3. Query channels from Firestore
4. Query live events from Firestore
5. Query playlists from Firestore
6. Generate XML with all URLs
7. Return with cache headers

**Sample Output**:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://abctvlive.vercel.app/</loc>
    <lastmod>2026-03-22</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  ...
</urlset>
```

### API: robots.ts

**Endpoint**: `GET /api/robots`

**Returns**: `Content-Type: text/plain`

**Cache**: `max-age=86400` (24 hours)

**Process**:
1. Check if custom rules exist in Firebase
2. If YES → Use custom rules
3. If NO → Use default rules
4. Return as plain text

**Default Rules**:
```
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
...
Sitemap: https://abctvlive.vercel.app/api/sitemap
```

## Firebase Integration

### Firestore Structure

```
Collections:
├── appSettings
│   ├── config (document)
│   │   ├── seo (object)
│   │   │   ├── googleVerificationCode (string)
│   │   │   ├── sitemapUrl (string)
│   │   │   └── robotsText (string)
│   │   ├── chatEnabled (boolean)
│   │   ├── postEnabled (boolean)
│   │   └── ... (other settings)
│   └── main (document)
│       ├── siteName (string)
│       ├── logo (string)
│       └── ... (other settings)
│
├── metadata
│   ├── channels (document)
│   │   └── channels (array)
│   ├── liveEvents (document)
│   │   └── events (array)
│   └── playlists (document)
│       └── playlists (array)
```

### Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Admin-only access to SEO settings
    match /appSettings/config {
      allow read: if request.auth != null && request.auth.token.admin == true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    
    // Public read for metadata (used by API)
    match /metadata/{document=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

## Caching Strategy

### HTTP Caching

| Endpoint | Duration | Strategy |
|----------|----------|----------|
| `/api/sitemap` | 1 hour | Must-revalidate |
| `/api/robots` | 24 hours | Must-revalidate |

### Cache invalidation:
- Sitemap: Auto-updates hourly
- Robots: Auto-updates daily
- Manual: Use Firebase update to trigger fresh generation

### Vercel Edge Caching

```
Cache-Control Headers:
- Sitemap: public, max-age=3600, must-revalidate
- Robots:  public, max-age=86400, must-revalidate
```

## Error Handling

### Sitemap Generation Errors

```typescript
try {
  const sitemap = await generateSitemap();
  res.setHeader("Content-Type", "application/xml");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.status(200).send(sitemap);
} catch (error: any) {
  console.error("Sitemap generation error:", error);
  return res.status(500).json({ error: error.message });
}
```

**Fallback**: Return error JSON with 500 status

### Robots.txt Generation Errors

```typescript
try {
  // ... fetch settings
  res.setHeader("Content-Type", "text/plain");
  res.setHeader("Cache-Control", "public, max-age=86400");
  return res.status(200).send(robotsText);
} catch (error: any) {
  // Fallback to default rules
  res.setHeader("Content-Type", "text/plain");
  return res.status(200).send(DEFAULT_ROBOTS_TXT);
}
```

**Fallback**: Return default rules (ensures crawlers always get valid content)

## Security Considerations

### 1. Input Validation
- Verification code: Trimmed, stored as-is (Google validates)
- Robots.txt: Stored as-is, no script injection possible
- Sitemap URL: URL validation on admin side

### 2. Access Control
- Sitemap API: Public read, public generate
- Robots.txt API: Public read, admin write
- Settings Admin: Admin-only access

### 3. Data Protection
- No sensitive data in sitemap/robots
- Admin routes hidden from crawlers
- API routes hidden from crawlers
- Firebase rules enforce admin-only writes

### 4. Rate Limiting
- Vercel automatically handles rate limiting
- Cache headers reduce request load
- Crawl-delay rules in robots.txt

## Performance Optimization

### 1. Caching
- Vericel CDN caches responses globally
- 1-hour sitemap cache = fewer Firebase queries
- 24-hour robots cache = minimal load

### 2. Database Queries
- Only fetch necessary fields
- Lazy loading for channels/events/playlists
- Metadata collection for size reference

### 3. Response Size
- XML compression via HTTP
- Text response for robots.txt
- ~10-50KB typical sitemap size

### 4. Cold Start Optimization
- Firebase SDK initialized once
- Lazy initialization of app instance
- Vercel serverless function reuse

## Monitoring & Analytics

### Metrics to Track

1. **Google Search Console**
   - Sitemap submission status
   - Indexed pages count
   - Crawl errors
   - Mobile usability

2. **Performance**
   - API response time
   - Cache hit ratio
   - Database query count
   - Sitemap generation time

3. **Security**
   - Unauthorized admin access attempts
   - Invalid verification codes
   - Robots.txt requests per day

### Logging

```typescript
// Sitemap generation
console.error("Sitemap generation error:", error);

// Robots.txt fallback
console.warn("Could not fetch custom robots.txt, using default:", error);

// Firebase queries within API endpoints
```

## Testing Strategy

### Unit Tests
```typescript
import { generateSitemap } from "./sitemap.ts";

describe("Sitemap Generation", () => {
  it("should include static pages", async () => {
    const sitemap = await generateSitemap();
    expect(sitemap).toContain("https://abctvlive.vercel.app/");
    expect(sitemap).toContain("https://abctvlive.vercel.app/channels");
  });

  it("should be valid XML", async () => {
    const sitemap = await generateSitemap();
    expect(() => new DOMParser().parseFromString(sitemap)).not.toThrow();
  });
});
```

### Integration Tests
```typescript
// Test admin panel saving
// Test meta tag injection
// Test API endpoint responses
// Test Firebase persistence
```

### E2E Tests
```typescript
// Complete flow: Admin → Settings → Meta tag → GSC verification
// Sitemap submission to GSC
// Robots.txt verification
```

## Future Enhancements

1. **Advanced Features**
   - Sitemap index for large sites (>50k URLs)
   - Scheduled sitemap refresh
   - Analytics integration (API call tracking)
   - A/B testing for meta descriptions

2. **Performance**
   - Incremental sitemap updates
   - Database connection pooling
   - Response compression

3. **Security**
   - Rate limiting per IP
   - API key for external sitemap submission
   - Audit logging for admin changes

## Deployment Checklist

- [x] All files created and tested
- [x] TypeScript compilation verified
- [x] Firebase configuration present
- [x] API endpoints functional
- [x] Admin UI integrated
- [x] Documentation complete
- [ ] E2E tests written
- [ ] Performance benchmarks run
- [ ] Security audit passed
- [ ] Google Search Console setup completed
- [ ] Production deployment
- [ ] GSC monitoring active

---

**Architecture Version**: 1.0  
**Last Updated**: 2026-03-22  
**Status**: Ready for Integration
