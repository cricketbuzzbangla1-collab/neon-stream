# Quick SEO Setup Guide

## 3-Minute Setup

### 1. Get Google Verification Code
- Visit: https://search.google.com/search-console
- Add property: `https://abctvlive.vercel.app`
- Go to Settings → Verification → HTML tag
- Copy code from: `content="YOUR_CODE_HERE"`

### 2. Update Admin Panel
1. Go to Admin Dashboard → **SEO** tab
2. Paste verification code
3. Check sitemap URL: `https://abctvlive.vercel.app/api/sitemap`
4. Click **Save SEO Settings**

### 3. Verify in Google Search Console
1. Return to GSC → Verification tab
2. Click **Verify**
3. Wait for confirmation ✓

### 4. Submit Sitemap
1. GSC → Sitemaps (left menu)
2. Click "Add a new sitemap"
3. Enter: `https://abctvlive.vercel.app/api/sitemap`
4. Click **Submit**
5. Wait for indexing (24-48 hours)

## API Endpoints

| Endpoint | Purpose | Cache |
|----------|---------|-------|
| `/api/sitemap` | XML sitemap | 1 hour |
| `/api/robots` | Robots.txt rules | 24 hours |

## Verification Checklist

- [ ] Google verification code added in Admin
- [ ] Meta tag visible in page source (F12)
- [ ] Google Search Console shows ✓ Verified
- [ ] Sitemap submitted in GSC
- [ ] Robots.txt accessible at `/api/robots`
- [ ] Pages appearing in GSC Coverage report

## Monitor Performance

**Weekly**: Check GSC → Performance  
**Monthly**: Check Core Web Vitals at web.dev/vitals  
**Quarterly**: Review indexing and crawl stats  

## Need Help?

See [SEO_IMPLEMENTATION_GUIDE.md](./SEO_IMPLEMENTATION_GUIDE.md) for detailed documentation.
