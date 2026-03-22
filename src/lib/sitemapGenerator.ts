/**
 * Sitemap Generator
 * Generates XML sitemaps for SEO optimization
 */

export interface UrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

/**
 * Generate sitemap XML for static pages
 */
export function generateStaticSitemap(baseUrl: string): string {
  const urls: UrlEntry[] = [
    {
      loc: "/",
      lastmod: new Date().toISOString().split("T")[0],
      changefreq: "hourly",
      priority: 1.0,
    },
    {
      loc: "/channels",
      lastmod: new Date().toISOString().split("T")[0],
      changefreq: "daily",
      priority: 0.9,
    },
    {
      loc: "/chat",
      lastmod: new Date().toISOString().split("T")[0],
      changefreq: "daily",
      priority: 0.8,
    },
    {
      loc: "/search",
      lastmod: new Date().toISOString().split("T")[0],
      changefreq: "daily",
      priority: 0.8,
    },
    {
      loc: "/favorites",
      lastmod: new Date().toISOString().split("T")[0],
      changefreq: "weekly",
      priority: 0.7,
    },
    {
      loc: "/my-playlist",
      lastmod: new Date().toISOString().split("T")[0],
      changefreq: "weekly",
      priority: 0.7,
    },
  ];

  return generateSitemapXml(urls, baseUrl);
}

/**
 * Generate sitemap XML for dynamic match pages
 */
export function generateMatchSitemap(
  matches: Array<{ id: string; date: string }>,
  baseUrl: string
): string {
  const urls: UrlEntry[] = matches.map((match) => ({
    loc: `/watch/${match.id}`,
    lastmod: match.date,
    changefreq: "never",
    priority: 0.5,
  }));

  return generateSitemapXml(urls, baseUrl);
}

/**
 * Generate sitemap XML for dynamic channel pages
 */
export function generateChannelSitemap(
  channels: Array<{ id: string; updatedAt: string }>,
  baseUrl: string
): string {
  const urls: UrlEntry[] = channels.map((channel) => ({
    loc: `/watch/${channel.id}`,
    lastmod: channel.updatedAt,
    changefreq: "daily",
    priority: 0.6,
  }));

  return generateSitemapXml(urls, baseUrl);
}

/**
 * Generate sitemap index XML (for multiple sitemaps)
 */
export function generateSitemapIndex(
  sitemapUrls: string[],
  lastmod: string = new Date().toISOString().split("T")[0]
): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  sitemapUrls.forEach((url) => {
    xml += `  <sitemap>
    <loc>${escapeXml(url)}</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>
`;
  });

  xml += `</sitemapindex>`;
  return xml;
}

/**
 * Generate XML sitemap from URL entries
 */
function generateSitemapXml(urls: UrlEntry[], baseUrl: string): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;

  urls.forEach((entry) => {
    const loc = `${baseUrl}${entry.loc}`.replace(/\/\//g, "/").replace(":/", "://");
    xml += `  <url>
    <loc>${escapeXml(loc)}</loc>`;

    if (entry.lastmod) {
      xml += `
    <lastmod>${entry.lastmod}</lastmod>`;
    }

    if (entry.changefreq) {
      xml += `
    <changefreq>${entry.changefreq}</changefreq>`;
    }

    if (entry.priority !== undefined) {
      xml += `
    <priority>${entry.priority.toFixed(1)}</priority>`;
    }

    xml += `
  </url>
`;
  });

  xml += `</urlset>`;
  return xml;
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  const xmlMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  };
  return str.replace(/[&<>"']/g, (char) => xmlMap[char] || char);
}

/**
 * Generate robots.txt content
 */
export function generateRobotsTxt(baseUrl: string): string {
  return `# SEO-friendly robots.txt for AbcTV LIVE

User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Crawl-delay: 1

User-agent: Googlebot
Allow: /
Crawl-delay: 0

Sitemap: ${baseUrl}/sitemap.xml
`;
}
