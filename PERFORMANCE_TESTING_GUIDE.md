# Performance Testing & Optimization Guide

## Pre-Deployment Testing

### 1. Local Build Testing
```bash
# Clean build
rm -rf dist/
npm run build

# Check for warnings
# Expected: minimal or no warnings

# Test production build locally
npm run preview
# Navigate to http://localhost:4173
# Test all major routes
```

### 2. Bundle Analysis
After running `npm run build`, check:
- `dist/` folder size (target: <500KB)
- Largest files (identify code-split opportunities)
- Unused dependencies

```bash
# Check main bundle sizes
ls -lh dist/*.js

# Expected sizes:
# - main bundle: <200KB
# - vendor bundle: <100KB
# - firebase: <150KB
```

### 3. Chrome DevTools Testing

#### Network Tab
1. Open Chrome DevTools (F12)
2. Click Network tab
3. Hard refresh (Ctrl+Shift+R)
4. Check:
   - Total page size (target: <2MB)
   - Number of requests (target: <80)
   - Load time (target: <3s)
   - Largest resources

#### Coverage Tab
1. Open Chrome DevTools
2. Press Ctrl+Shift+P
3. Type "Coverage"
4. Click "Show Coverage"
5. Reload page
6. Check CSS/JS coverage (target: >80% coverage)

#### Performance Tab
1. Open Chrome DevTools
2. Click Performance tab
3. Click record button
4. Interact with page (scroll, click buttons)
5. Stop recording
6. Analyze:
   - Main thread blocking (target: <50ms)
   - Layout shifts
   - Long tasks (>50ms = red flag)
   - FCP (First Contentful Paint)
   - LCP (Largest Contentful Paint)

### 4. Lighthouse Audit

#### Run Lighthouse
1. Open Chrome DevTools (F12)
2. Click Lighthouse tab
3. Select categories:
   - ✓ Performance
   - ✓ Accessibility
   - ✓ Best Practices
   - ✓ SEO
4. Device: Mobile (more strict)
5. Throttling: Slow 4G
6. Click "Analyze page load"

#### Target Scores
```
Performance:     90+
Accessibility:   90+
Best Practices:  90+
SEO:            95+
```

#### Common Issues & Fixes
| Issue | Fix |
|-------|-----|
| Large images | Optimize with WebP, lazy load |
| Unused CSS/JS | Code split, remove unused code |
| No meta tags | Already fixed in index.html |
| Missing alt text | Add descriptive alt attributes |
| Poor CLS | Fixed dimensions, avoid layout shifts |

### 5. Mobile Testing

#### Chrome Mobile Emulation
1. Open Chrome DevTools (F12)
2. Click device toggle (Ctrl+Shift+M)
3. Select devices:
   - iPhone 14/15
   - Pixel 6/7
   - iPad Pro
4. Test:
   - Responsive layout
   - Touch interactions
   - Font sizing
   - Button accessibility
   - Image loading

#### Real Device Testing
1. Connect Android/iOS device
2. Open site in device browser
3. Test:
   - Load time on 4G
   - Touch responsiveness
   - Landscape/portrait modes
   - Form inputs
   - Navigation

### 6. SEO Testing

#### Google Rich Results Test
Visit: https://search.google.com/test/rich-results

1. Paste your URL
2. Test
3. Check for:
   - Valid structured data
   - No errors
   - Rich snippets eligible (if applicable)

#### Meta Tag Validation
```bash
# Check in browser console
document.querySelector('meta[name="description"]')
document.querySelector('meta[property="og:title"]')
document.querySelector('link[rel="canonical"]')
```

#### robots.txt Validation
Visit: `yoursite.com/robots.txt`
- [ ] Allows Google bot
- [ ] Blocks admin pages
- [ ] Includes sitemap
- [ ] Proper syntax

---

## Post-Deployment Testing

### 1. Google Search Console Setup

#### Add Property
1. Go to https://search.google.com/search-console
2. Click "Add property"
3. Enter domain URL
4. Choose verification method (DNS or HTML file)
5. Verify ownership

#### Submit Sitemap
1. Go to "Sitemaps" section
2. Click "Add a new sitemap"
3. Enter `/sitemap.xml`
4. Click Submit

#### Check Indexing
1. Go to "Coverage" report
2. Check status:
   - "Indexed" pages (should be all main pages)
   - "Excluded" pages (admin, api - expected)
   - "Error" pages (fix immediately)

### 2. Page Speed Testing

#### PageSpeed Insights
Visit: https://pagespeed.web.dev/

1. Enter your URL
2. Analyze Mobile and Desktop
3. Check scores:
   - Performance: 90+
   - Accessibility: 90+
   - Best Practices: 90+
   - SEO: 95+
4. Fix any red/orange items

#### GTmetrix
Visit: https://gtmetrix.com/

1. Analyze page
2. Check:
   - Performance Score (90+)
   - Structure (good)
   - Time to Interactive (<3s)
3. Review recommendations

### 3. Core Web Vitals Monitoring

#### Chrome User Experience Report
Visit: https://crux.webmasters.googleblog.com/

1. Check your domain
2. Monitor:
   - LCP (Largest Contentful Paint) < 2.5s
   - FID (First Input Delay) < 100ms
   - CLS (Cumulative Layout Shift) < 0.1

#### Web Vitals Extension
1. Install: Chrome Web Vitals extension
2. Open extension while browsing your site
3. See real-time metrics
4. Target:
   - LCP: Good (green)
   - FID: Good (green)
   - CLS: Good (green)

### 4. Analytics Setup

#### Google Analytics
1. Create GA4 property
2. Get tracking ID
3. Add to index.html or use Google Tag Manager
4. Wait 24 hours for data
5. Check:
   - Page views
   - User behavior
   - Bounce rate
   - Session duration

#### Monitor Key Metrics
```
- Organic traffic (from Search)
- Average session duration (>2 min)
- Bounce rate (<60%)
- Pages per session (>2)
- Goal conversions (if applicable)
```

---

## Ongoing Performance Monitoring

### Daily Checklist
- [ ] Google Search Console: Check for new errors
- [ ] Core Web Vitals: Status is "Good"
- [ ] Traffic: Normal organic traffic growth
- [ ] Console: No JavaScript errors
- [ ] Analytics: Normal user behavior

### Weekly Checklist
- [ ] Lighthouse audit (full page)
- [ ] PageSpeed Insights (Mobile & Desktop)
- [ ] Core Web Vitals report
- [ ] Search Console coverage
- [ ] Crawl errors (should be 0)
- [ ] Page indexing progress

### Monthly Checklist
- [ ] Full SEO audit
- [ ] Competitor analysis
- [ ] Analytics deep dive
- [ ] Content performance review
- [ ] User experience feedback
- [ ] Technical improvements

---

## Performance Optimization Guide

### If LCP is Slow (>2.5s)

**Causes:**
- Slow server response
- Render-blocking resources
- Large images
- Render-blocking CSS

**Solutions:**
1. Preload critical fonts:
   ```html
   <link rel="preload" as="font" href="font.woff2" crossorigin>
   ```

2. Preload critical CSS:
   ```html
   <link rel="preload" as="style" href="critical.css">
   ```

3. Optimize images:
   ```html
   <img src="image.webp" alt="..." loading="lazy" width="800" height="600">
   ```

4. Reduce CSS/JS:
   ```bash
   npm run build  # Check bundle size
   ```

### If FID is High (>100ms)

**Causes:**
- Long JavaScript execution
- Main thread blocking
- Heavy computation

**Solutions:**
1. Break long tasks:
   ```typescript
   // Defer heavy work
   setTimeout(() => heavyComputation(), 0);
   ```

2. Lazy load code:
   ```typescript
   const Component = lazy(() => import('./Heavy.tsx'));
   ```

3. Use React.memo:
   ```typescript
   const MyComponent = memo(({ data }) => ...);
   ```

### If CLS is High (>0.1)

**Causes:**
- Unoptimized images
- Unsized content
- Dynamically injected content
- Web fonts

**Solutions:**
1. Set image dimensions:
   ```html
   <img src="..." width="800" height="600" alt="...">
   ```

2. Reserve space for dynamic content:
   ```css
   .ad-space {
     width: 300px;
     height: 250px;
   }
   ```

3. Use `font-display: swap`:
   ```css
   @font-face {
     font-family: 'Custom';
     src: url('font.woff2');
     font-display: swap;
   }
   ```

---

## Testing Checklist Template

Use this template for weekly testing:

```markdown
## Week of [DATE] Performance Test

### Lighthouse Scores
- [ ] Performance: __/100 (target: 90+)
- [ ] Accessibility: __/100 (target: 90+)
- [ ] Best Practices: __/100 (target: 90+)
- [ ] SEO: __/100 (target: 95+)

### Core Web Vitals
- [ ] LCP: __ms (target: <2500ms) - Green/Yellow/Red
- [ ] FID: __ms (target: <100ms) - Good/Needs Work
- [ ] CLS: __score (target: <0.1) - Good/Needs Work

### Page Speed
- [ ] Mobile Score: __/100 (PageSpeed Insights)
- [ ] Desktop Score: __/100 (PageSpeed Insights)
- [ ] Load Time: __s (target: <3s)
- [ ] Total Page Size: __KB (target: <2000KB)

### SEO
- [ ] Indexed Pages: ____ (search console)
- [ ] Crawl Errors: ____ (should be 0)
- [ ] Mobile Usability: No issues
- [ ] Meta Tags: Valid
- [ ] Structured Data: No errors

### Issues Found
1. [Issue]: [Priority] - [Cause] - [Solution]
2. [Issue]: [Priority] - [Cause] - [Solution]

### Next Week Actions
- [ ] Fix [issue]
- [ ] Optimize [area]
- [ ] Test [feature]
```

---

## Automated Testing Setup (Optional)

### Lighthouse CI
```bash
npm install -g @lhci/cli@latest

# Create lighthouserc.json
# Run: lhci autorun
# Generates report and compares to baseline
```

### Performance Budget
```json
// In package.json or .budgetrc
{
  "bundles": [
    {
      "name": "main",
      "maxSize": "200kb"
    }
  ]
}
```

---

## Success Metrics

### Target Metrics (First Month)
```
✓ Lighthouse Score: 90+
✓ Core Web Vitals: All Green
✓ Organic Traffic: 50% increase
✓ Indexed Pages: 100%
✓ Crawl Errors: 0
```

### Long-term Metrics (3-6 Months)
```
✓ Organic Traffic: +200-300%
✓ Keyword Rankings: Top 10 for target keywords
✓ Click-Through Rate: 30%+
✓ Domain Authority: +5-10 points
✓ Core Web Vitals: Consistent Green
```

---

## Resources

- **Chrome DevTools:** F12 in Chrome
- **Lighthouse:** Built into DevTools
- **PageSpeed Insights:** https://pagespeed.web.dev/
- **GTmetrix:** https://gtmetrix.com/
- **Search Console:** https://search.google.com/search-console
- **Web Vitals:** https://web.dev/vitals
- **Performance API:** https://developer.mozilla.org/en-US/docs/Web/API/Performance

---

**Created:** March 2026
**Version:** 1.0
