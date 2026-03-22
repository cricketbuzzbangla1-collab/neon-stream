# SEO and Performance Optimization Checklist

## Quick Start (Complete These First)

### 1. Prepare for Deployment
```bash
# Build the project
npm run build

# Test production build locally
npm run preview

# Check for warnings and errors
npm run lint
```

### 2. Update Site-Specific Information
Edit `index.html` and update:
- [ ] Replace `https://abctv-live.app` with your actual domain
- [ ] Update OG image URLs to your actual images
- [ ] Update Twitter handle `@Lovable` to your handle
- [ ] Verify all meta descriptions

### 3. Deploy to Vercel
```bash
# Push to GitHub
git add .
git commit -m "Performance and SEO optimizations"
git push

# Vercel will auto-deploy
# Monitor at https://vercel.com/dashboard
```

---

## Post-Deployment Tasks

### Google Search Console Setup (Day 1)
- [ ] Add property for your domain
- [ ] Verify ownership (DNS or HTML file method)
- [ ] Submit sitemap.xml
- [ ] Check for crawl errors
- [ ] Request indexing for main pages

**URL:** https://search.google.com/search-console

### Google Analytics Setup (Day 1)
- [ ] Create Google Analytics 4 property
- [ ] Add tracking code to index.html (optional - can use GTM)
- [ ] Set up goals/events
- [ ] Enable demographic reports

**URL:** https://analytics.google.com

### Site Configuration (Day 1-2)
- [ ] Add favicon.ico to public/
- [ ] Add apple-touch-icon.png to public/
- [ ] Configure custom domain in Vercel
- [ ] Enable HTTPS (automatic)
- [ ] Test robots.txt at `yoursite.com/robots.txt`

### Performance Testing (Day 2)
```bash
# Run Lighthouse audit
1. Open https://yoursite.com in Chrome
2. Press F12 (DevTools)
3. Go to Lighthouse tab
4. Click "Analyze page load"
5. Check all metrics:
   - Performance: 90+
   - Accessibility: 90+
   - Best Practices: 90+
   - SEO: 95+
```

**Alternative:** https://pagespeed.web.dev/

### Mobile Testing (Day 2)
- [ ] Test on iPhone/Android
- [ ] Verify responsive design
- [ ] Test touch interactions
- [ ] Check image loading on 4G

**Chrome DevTools:**
1. Press F12
2. Click device toggle (Ctrl+Shift+M)
3. Test various screen sizes
4. Run Lighthouse mobile audit

---

## Ongoing Optimization Tasks

### Weekly Tasks
- [ ] Check Google Search Console for errors
- [ ] Monitor Core Web Vitals in PageSpeed Insights
- [ ] Check Analytics traffic trends
- [ ] Review server error logs

### Monthly Tasks
- [ ] Full Lighthouse audit
- [ ] Core Web Vitals analysis
- [ ] Crawl error investigation
- [ ] Mobile usability check
- [ ] Performance benchmark

### Quarterly Tasks
- [ ] Update content and sitemaps
- [ ] Review SEO strategy
- [ ] Analyze user behavior
- [ ] Test new optimizations

---

## Key Metrics to Monitor

### Core Web Vitals (Target)
| Metric | Target | Status |
|--------|--------|--------|
| LCP (Largest Contentful Paint) | < 2.5s | ✓ |
| FID (First Input Delay) | < 100ms | ✓ |
| CLS (Cumulative Layout Shift) | < 0.1 | ✓ |

### Performance Metrics
| Metric | Target | Status |
|--------|--------|--------|
| Page Load Time | < 3s | ✓ |
| Time to First Byte | < 600ms | ✓ |
| DOM Interactive | < 2s | ✓ |

### SEO Metrics
| Metric | Target | Status |
|--------|--------|--------|
| Indexed Pages | 100+ | Monitor |
| Average Position | Top 10 | Monitor |
| Click-Through Rate | 30%+ | Monitor |
| Core Web Vitals | Good | Monitor |

---

## Troubleshooting

### Pages Not Indexed
**Check:**
1. `robots.txt` - Ensure paths aren't blocked
2. Canonical URLs - No redirect chains
3. Meta robots - No noindex tags
4. Search Console - Check for errors

**Solution:**
1. Fix robots.txt if needed
2. Request indexing in Search Console
3. Submit sitemap
4. Wait 2-4 weeks for indexing

### Slow Page Load
**Check:**
1. Bundle size - Run `npm run build` and check dist/
2. Images - Ensure images are optimized
3. Third-party scripts - Check performance impact
4. Network requests - Check Network tab in DevTools

**Solution:**
1. Code split large bundles
2. Optimize/remove unused code
3. Lazy load images
4. Defer non-critical JavaScript

### Low Lighthouse Scores
**Performance:** Check Core Web Vitals, remove unused CSS/JS
**Accessibility:** Add alt text, ensure proper contrast, fix form labels
**Best Practices:** Use HTTPS, avoid deprecated APIs, update libraries
**SEO:** Add meta tags, structured data, mobile-friendly design

### Mobile Issues
**Check:**
1. Viewport meta tag
2. Font sizes (should be ≥12px)
3. Clickable elements (should be ≥48px)
4. Responsive layouts

**Solution:**
1. Use `loading="lazy"` for images
2. Optimize for mobile first
3. Test on real devices
4. Use Chrome DevTools mobile view

---

## Implementation Examples

### Adding SEO to a Page
```typescript
import { setSeoMetadata, createEventSchema, setStructuredData } from "@/hooks/useSeoMetadata";

useEffect(() => {
  // Set page metadata
  setSeoMetadata({
    title: "Live Cricket Match - AbcTV LIVE",
    description: "Watch live cricket match between India vs Pakistan",
    keywords: ["cricket", "live match", "India"],
    ogImage: "https://example.com/match.jpg",
    ogType: "website",
    canonical: `https://abctv-live.app/watch/${matchId}`,
  });

  // Add structured data for the event
  setStructuredData(createEventSchema({
    name: "India vs Pakistan Cricket Match",
    description: "Live cricket match",
    startDate: new Date().toISOString(),
    image: "https://example.com/match.jpg",
    location: "Cricket Ground",
  }));
}, [matchId]);
```

### Lazy Loading Images
```tsx
// Good for SEO - images indexed
<img
  src="sports-event.webp"
  alt="Cricket match between two teams"
  loading="lazy"
  width={800}
  height={600}
/>
```

### Semantic HTML
```tsx
// Good for SEO
<article>
  <h1>Match Title</h1>
  <p>Match description and content...</p>
  <section>
    <h2>Match Details</h2>
    ...
  </section>
</article>
```

---

## Performance Optimization Tips

### Code Splitting
Already implemented:
```typescript
const Index = lazy(() => import("./pages/Index"));
const Watch = lazy(() => import("./pages/Watch"));
// Routes only load when visited
```

### Image Optimization
1. Use WebP format
2. Set width/height to prevent layout shift
3. Use `loading="lazy"` for below-fold images
4. Serve different sizes for different devices

```tsx
<img
  src="image.webp"
  alt="Description"
  loading="lazy"
  width={400}
  height={300}
  srcset="image-sm.webp 400w, image-lg.webp 800w"
/>
```

### Caching Strategy
Handled by Vercel:
- HTML: No cache (always fresh for routing)
- CSS/JS: 1 year cache (immutable files)
- Assets: 30 days with SWR
- API: No cache by default

### Reducing Main Thread Blocking
- Lazy load non-critical code
- Use React.memo for expensive components
- Defer non-critical updates
- Monitor Long Tasks (>50ms)

---

## Resources

### Tools
- **Google PageSpeed Insights:** https://pagespeed.web.dev/
- **Google Search Console:** https://search.google.com/search-console
- **Google Analytics:** https://analytics.google.com
- **Chrome DevTools:** F12 in Chrome browser
- **Lighthouse:** Built into Chrome DevTools

### Documentation
- **Vercel Docs:** https://vercel.com/docs
- **Web Vitals:** https://web.dev/vitals
- **SEO Starter Guide:** https://developers.google.com/search/docs/beginner/seo-starter-guide
- **Schema.org:** https://schema.org

### Learning Resources
- **Google Search Central:** https://developers.google.com/search
- **Web.dev:** https://web.dev
- **MDN Web Docs:** https://developer.mozilla.org

---

## Questions?

Refer to `VERCEL_DEPLOYMENT_GUIDE.md` for detailed information on:
- Performance optimization
- SEO implementation
- Core Web Vitals
- Deployment procedures
- Security best practices
