# SEO Implementation Guide - AbcTV LIVE

## Overview

This guide walks you through implementing and configuring SEO features for AbcTV LIVE, including Google Search Console verification, dynamic sitemaps, and robots.txt management.

## Features Implemented

### 1. **SEO Settings Manager in Admin Panel**
- Manage Google verification code
- Configure sitemap URLs
- Customize robots.txt rules

### 2. **Dynamic Sitemap Generation**
- Auto-generated `/api/sitemap` endpoint
- Includes all static pages
- Dynamically adds channels, live events, and playlists
- Updates `lastmod` dates automatically
- Implements proper priority levels

### 3. **Dynamic Robots.txt**
- `/api/robots` endpoint with customizable rules
- Default rules optimized for search engines
- Block admin and API routes from crawling
- Allow social media crawlers

### 4. **Google Site Verification**
- Dynamically inject meta tag into `<head>`
- Auto-update from admin settings
- No rebuild required

## Setup Instructions

### Step 1: Get Google Verification Code

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add your property: `https://abctvlive.vercel.app`
3. Choose "URL prefix" method
4. Go to **Settings** → **Verification** (sidebar)
5. Select **HTML tag** verification method
6. Copy the verification code from the meta tag:
   ```html
   <meta name="google-site-verification" content="YOUR_CODE_HERE" />
   ```
   - You need just the code: `YOUR_CODE_HERE`

### Step 2: Add Verification Code in Admin Panel

1. Log in to **Admin Dashboard**
2. Navigate to **SEO** tab
3. Paste your Google verification code in the field:
   ```
   Google Verification Code: xNDd2M9HVxh9zsGbQUTIccUKqK_1vDgwRkkOSNC1ukA
   ```
4. The generated meta tag will be shown:
   ```html
   <meta name="google-site-verification" content="YOUR_CODE" />
   ```
5. Click **Save SEO Settings**

### Step 3: Verify in Google Search Console

1. Return to [Google Search Console](https://search.google.com/search-console)
2. Click **Verify** button
3. Google will check for the meta tag in your page's `<head>`
4. Once verified, you'll see: ✓ **Verified**

### Step 4: Submit Sitemap

1. In Google Search Console sidebar: **Sitemaps**
2. Click **Add a new sitemap**
3. Enter URL: `https://abctvlive.vercel.app/api/sitemap`
4. Click **Submit**
5. Monitor the **Sitemaps** page for:
   - Status: "Success"
   - URLs found in sitemap
   - Indexing status

## API Endpoints

### Sitemap Endpoint
- **URL**: `https://abctvlive.vercel.app/api/sitemap`
- **Type**: `GET`
- **Content-Type**: `application/xml`
- **Cache**: 1 hour (`max-age=3600`)
- **Response**: XML sitemap with all pages

**Example Response:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://abctvlive.vercel.app/</loc>
    <lastmod>2026-03-22</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://abctvlive.vercel.app/channels</loc>
    <lastmod>2026-03-22</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  ...
</urlset>
```

### Robots.txt Endpoint
- **URL**: `https://abctvlive.vercel.app/api/robots`
- **Type**: `GET`
- **Content-Type**: `text/plain`
- **Cache**: 24 hours (`max-age=86400`)
- **Response**: Plain text robots rules

**Example Response:**
```
# SEO-friendly robots.txt for AbcTV LIVE
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
...
Sitemap: https://abctvlive.vercel.app/api/sitemap
```

## Pages Included in Sitemap

### Static Pages (Always Included)
- `/` - Homepage (priority: 1.0)
- `/channels` - All channels (priority: 0.9)
- `/chat` - Live chat (priority: 0.8)
- `/search` - Search page (priority: 0.8)
- `/favorites` - User favorites (priority: 0.7)
- `/my-playlist` - User playlists (priority: 0.7)

### Dynamic Pages (Auto-added)
- `/watch/{channelId}` - Individual channels (priority: 0.6)
- `/watch/{eventId}` - Live events (priority: 0.5)
- `/playlist/{playlistId}/0` - User playlists (priority: 0.5)

## Robots.txt Rules

### Default Rules
```
User-agent: *
Allow: /
Disallow: /admin        # Protect admin panel
Disallow: /api/         # Protect API routes
Disallow: /*.json$      # Protect JSON files
```

### Search Engine Specific
- **Googlebot**: Crawl-delay: 0 (aggressive)
- **Bingbot**: Crawl-delay: 1
- **Others**: Crawl-delay: 1

### Blocked Crawlers
- AhrefsBot
- SemrushBot

### Allowed Social Crawlers
- Twitterbot
- facebookexternalhit
- LinkedInBot
- WhatsApp

## Custom Robots.txt

Edit robots.txt in the admin panel to:
- Block specific directories
- Set custom crawl delays
- Add additional rules

**Changes apply immediately** - no rebuild required.

## SEO Best Practices Implemented

### ✓ Meta Tags
- Dynamic title tags per page
- Meta descriptions
- Open Graph tags (og:title, og:image, etc.)
- Twitter Card tags
- Canonical URLs

### ✓ Performance
- Code splitting for fast page loads
- Image optimization
- CSS minification
- Service worker for offline access
- Lazy loading components

### ✓ Crawlability
- Semantic HTML structure
- Proper heading hierarchy (H1, H2, etc.)
- Alt text for images
- Internal linking strategy
- Breadcrumb navigation (via useSeoMetadata hook)

### ✓ Security
- HTTPS only
- Security headers (CSP, X-Frame-Options, etc.)
- Input validation on all forms
- Protection against XSS

## Monitoring & Optimization

### Google Search Console Monitoring

1. **Coverage Report**
   - Check for errors blocking indexing
   - Review excluded URLs
   - Monitor new pages discovered

2. **Performance Report**
   - Monitor clicks and impressions
   - Track average CTR (Click-Through Rate)
   - Optimize title and meta descriptions

3. **Mobile Usability**
   - Ensure mobile-friendly design
   - Check for mobile errors
   - Optimize viewport settings

### Core Web Vitals

Monitor at: https://web.dev/vitals/

Key metrics:
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

View results in GSC → Experience → Core Web Vitals

## Page-Level SEO Implementation

All pages use the `useSeoMetadata` hook to set:

```tsx
import { setSeoMetadata } from "@/hooks/useSeoMetadata";

useEffect(() => {
  setSeoMetadata({
    title: "Page Title",
    description: "Page description for search results",
    keywords: ["keyword1", "keyword2"],
    ogImage: "https://example.com/image.jpg",
    canonical: "https://abctvlive.vercel.app/page",
    robots: "index, follow",
  });
}, []);
```

## Troubleshooting

### Google Verification Fails
**Problem**: Meta tag not found  
**Solution**:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Make sure code is pasted correctly (no extra spaces)
3. Wait 24 hours for propagation
4. Check that meta tag appears in page source (F12 → Elements)

### Sitemap Shows 0 URLs
**Problem**: No URLs in sitemap  
**Solution**:
1. Check `/api/sitemap` endpoint directly in browser
2. Verify Firebase connection is working
3. Check server logs for errors
4. Try submitting static sitemap first (public/sitemap.xml)

### Pages Not Indexing
**Problem**: Pages appear in sitemap but not in Google index  
**Solution**:
1. Check for robots meta tag: `robots: noindex` (remove if present)
2. Check for noindex in robots.txt
3. Verify pages are accessible (no 404 errors)
4. Check mobile usability issues in GSC
5. Request indexing in Google Search Console

### High Bounce Rate
**Problem**: Users leaving quickly  
**Solution**:
1. Improve page load speed
2. Make content more relevant
3. Fix broken internal links
4. Improve mobile experience
5. Add call-to-action buttons

## Performance Tips

1. **Enable Caching**
   - Sitemap: 1 hour
   - Robots.txt: 24 hours
   - Static assets: 1 year

2. **Optimize Images**
   - Use next-gen formats (WebP)
   - Implement lazy loading
   - Compress before upload

3. **Minimize JavaScript**
   - Code split large bundles
   - Lazy load non-critical components
   - Remove unused dependencies

4. **Leverage CDN**
   - Vercel automatically uses CDN
   - Content cached globally
   - Fast delivery worldwide

## Additional Resources

- [Google Search Console Help](https://support.google.com/webmasters)
- [SEO Starter Guide](https://developers.google.com/search/docs)
- [Core Web Vitals Guide](https://web.dev/vitals/)
- [Structured Data]](https://schema.org/)
- [Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)

## Summary

✓ Google verification code management  
✓ Dynamic sitemap generation with auto-updates  
✓ Customizable robots.txt rules  
✓ Meta tag injection in real-time  
✓ Performance optimized  
✓ Mobile-friendly design  
✓ Security hardened  

**Your site is now fully SEO-optimized and monitored!**
