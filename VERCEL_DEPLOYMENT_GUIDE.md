# Vercel Deployment & Performance Optimization Guide

## Table of Contents
1. [Performance Optimization](#performance-optimization)
2. [SEO Optimization](#seo-optimization)
3. [Core Web Vitals](#core-web-vitals)
4. [Vercel Deployment](#vercel-deployment)
5. [Google Indexing](#google-indexing)
6. [Mobile Optimization](#mobile-optimization)
7. [Security Best Practices](#security-best-practices)
8. [Monitoring & Analytics](#monitoring--analytics)

---

## Performance Optimization

### Bundle Size Optimization
- **Code Splitting**: Routes are lazy-loaded with React Router
- **Tree Shaking**: Unused code is removed during build
- **Minification**: Production builds use Terser with console removal
- **Asset Compression**: gzip/brotli compression enabled via Vercel

**Current Build Configuration:**
```bash
npm run build
# Produces optimized bundles in dist/
```

### Image Optimization
- Use WebP format for modern browsers
- Implement responsive images with srcset
- Lazy load images with `loading="lazy"`
- Example:
```html
<img src="image.webp" alt="Description" loading="lazy" />
```

### Caching Strategy
1. **HTML**: 0s (always fresh for routing)
2. **CSS/JS**: 1 year (immutable - versioned)
3. **Assets**: 30 days with SWR

**Vercel Headers** (automatically applied):
- Static assets: `Cache-Control: public, max-age=31536000, immutable`
- HTML: `Cache-Control: public, max-age=0, s-maxage=86400, stale-while-revalidate`

### JavaScript Bundle Analysis
Run after build to analyze bundle:
```bash
npm run build
# Check dist/ folder for bundle-analysis.html
```

---

## SEO Optimization

### Meta Tags & Open Graph
All pages include:
- Dynamic title and description
- Open Graph tags (for social sharing)
- Twitter Card tags
- Canonical URLs
- Robots meta tags

**Implementation:**
```typescript
import { setSeoMetadata } from "@/hooks/useSeoMetadata";

setSeoMetadata({
  title: "Page Title",
  description: "Page description",
  keywords: ["keyword1", "keyword2"],
  ogImage: "https://example.com/image.png",
  canonical: "https://abctv-live.app/page",
});
```

### Structured Data (Schema.org)
Implement Schema.org for:
- Website structure
- Sports events/matches
- Articles
- Organization info
- Breadcrumbs

**Example - Event Schema:**
```typescript
import { createEventSchema, setStructuredData } from "@/hooks/useSeoMetadata";

setStructuredData(createEventSchema({
  name: "Cricket Match",
  description: "Live cricket match",
  startDate: "2026-03-22T18:00:00Z",
  location: "Cricket Ground",
}));
```

### Sitemap Generation
- Dynamic sitemap.xml generation for all pages
- Update frequency indicators
- Priority levels for crawling
- Automatic sitemap index for large sites

**Sitemaps:**
- `/sitemap.xml` - Static pages sitemap
- `/sitemap-matches.xml` - Dynamic match pages

### robots.txt Configuration
- Properly configured for Google, Bing crawling
- Bad bot blocking (AhrefsBot, SemrushBot)
- Crawl-delay optimization
- Sitemap references

---

## Core Web Vitals

### LCP (Largest Contentful Paint) - Target: < 2.5s
**Optimization:**
- Prioritize hero content loading
- Optimize critical resources
- Avoid large layout shifts
- Preload critical fonts

**Current Implementation:**
```typescript
// index.html
<link rel="preload" as="style" href="fonts.googleapis.com/css...">
<link rel="preconnect" href="https://fonts.googleapis.com">
```

### FID (First Input Delay) - Target: < 100ms
**Optimization:**
- Break long JavaScript tasks
- Use requestIdleCallback for non-critical work
- Minimize main thread blocking
- Lazy load non-critical code

### CLS (Cumulative Layout Shift) - Target: < 0.1
**Optimization:**
- Fixed dimensions for images/videos
- Avoid dynamic content insertion
- Use `content-visibility` CSS property
- Reserve space for ads/dynamic content

### Performance Monitoring
Monitor metrics in development:
```typescript
import { initPerformanceMonitoring } from "@/lib/performanceMonitor";

initPerformanceMonitoring();
```

---

## Vercel Deployment

### Pre-Deployment Checklist
- [ ] Run `npm run build` and check for warnings
- [ ] Test production build locally: `npm run preview`
- [ ] Verify all meta tags in index.html
- [ ] Check robots.txt and sitemap configuration
- [ ] Run Lighthouse audit
- [ ] Test mobile responsiveness
- [ ] Check console for errors

### Deployment Steps
1. Connect GitHub repository to Vercel
2. Select repository and branch
3. Configure environment variables
4. Click "Deploy"
5. Monitor deployment in dashboard

### Environment Variables
Required for production:
- Firebase configuration variables
- API endpoints
- Google Analytics tracking ID
- Custom domain settings

### Edge Caching
Vercel automatically:
- Caches static assets globally
- Serves from nearest edge location
- Invalidates cache on deployment
- Compresses with gzip/brotli

### Custom Domain
1. Add domain in Vercel project settings
2. Update DNS records with Vercel nameservers
3. Enable SSL certificate (automatic)
4. Configure redirects for www/non-www

---

## Google Indexing

### Google Search Console Setup
1. **Verify Ownership:**
   - Add property for your domain
   - Verify with DNS record or HTML file
   
2. **Submit Sitemap:**
   - Go to Sitemaps section
   - Add `/sitemap.xml`
   - Wait for indexing

3. **Monitor Performance:**
   - Check CTR (Click-Through Rate)
   - Monitor average position
   - Fix crawl errors

4. **Mobile Usability:**
   - Ensure responsive design
   - Check for mobile issues
   - Verify touch-friendly interface

### Structured Data Testing
Use Google's Rich Results Test:
- https://search.google.com/test/rich-results
- Validate Schema.org markup
- Check for rich snippet eligibility

### Indexing Issues
**If pages aren't indexed:**
1. Check robots.txt - ensure paths aren't blocked
2. Verify canonical URLs
3. Check noindex meta tags
4. Submit sitemap manually
5. Request indexing in Search Console

---

## Mobile Optimization

### Responsive Design
- Mobile-first approach (Tailwind CSS)
- Flexible layouts with flexbox/grid
- Responsive typography with clamp()
- Touch-friendly buttons (min 44x44px)

### Mobile Performance
- Minimize CSS/JS for mobile
- Optimize images for mobile resolution
- Reduce animation on mobile devices
- Enable viewport optimizations

**Viewport Meta Tag:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
```

### Touch Interactions
- Avoid hover-only interactions
- Implement touch-friendly navigation
- Use semantic HTML for accessibility
- Support gesture-based controls

### Mobile-Specific Testing
```bash
# Test with Chrome DevTools
1. Open Chrome DevTools (F12)
2. Click device toggle (Ctrl+Shift+M)
3. Test all screen sizes
4. Run Lighthouse mobile audit
```

---

## Security Best Practices

### HTTPS/TLS
- Automatic SSL via Vercel (Let's Encrypt)
- HSTS header enabled (1 year)
- Force HTTPS in all requests

### Content Security Policy
Headers configured in `vercel.json`:
- `X-Content-Type-Options: nosniff` - Prevent MIME-type sniffing
- `X-Frame-Options: DENY` - Prevent clickjacking
- `X-XSS-Protection: 1; mode=block` - XSS protection
- `Referrer-Policy: strict-origin-when-cross-origin`

### API Security
- Use HTTPS for all API calls
- Validate input on backend
- Implement rate limiting
- Use secure headers for API routes

### Data Protection
- No sensitive data in client code
- Use environment variables for secrets
- Implement proper authentication
- Use secure cookie flags (HttpOnly, Secure, SameSite)

---

## Monitoring & Analytics

### Performance Monitoring
Built-in monitoring tracks:
- Page Load Time
- Time to First Byte (TTFB)
- Core Web Vitals (LCP, FID, CLS)
- Long Tasks (>50ms)
- Resource loading times

```typescript
import { generatePerformanceReport } from "@/lib/performanceMonitor";

console.log(generatePerformanceReport());
```

### Google Analytics Setup
1. Add Google Analytics tag to index.html
2. Configure event tracking
3. Set up goals and conversions
4. Monitor user behavior
5. Track page views and performance

### Error Tracking
Implement error reporting:
- Frontend error logging
- Error boundary components
- Sentry integration (optional)
- Performance anomaly detection

### Lighthouse Audit
Run monthly:
```bash
# Using Google PageSpeed Insights
# or Lighthouse CLI

npx lighthouse https://abctv-live.app --view
```

**Target Scores:**
- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 95+

---

## Quick Deployment Checklist

```
Pre-deployment:
✓ npm run build (check for warnings)
✓ npm run preview (test production build)
✓ Verify all meta tags and Open Graph tags
✓ Check robots.txt and sitemap.xml
✓ Test on mobile devices
✓ Run Lighthouse audit
✓ Verify environment variables

Deployment:
✓ Push to GitHub
✓ Vercel auto-deploys
✓ Check deployment status
✓ Test production URL
✓ Verify all functionality

Post-deployment:
✓ Submit sitemap to Google Search Console
✓ Monitor Core Web Vitals
✓ Check for crawl errors
✓ Verify indexing status
✓ Set up monitoring/alerts
✓ Configure analytics
```

---

## Resources

- **Vercel Docs**: https://vercel.com/docs
- **Web Vitals**: https://web.dev/vitals
- **SEO Guide**: https://developers.google.com/search/docs
- **Google Analytics**: https://analytics.google.com
- **Search Console**: https://search.google.com/search-console
- **Lighthouse**: https://developers.google.com/web/tools/lighthouse
- **Schema.org**: https://schema.org

---

**Last Updated:** March 2026
**Status:** Production Ready
