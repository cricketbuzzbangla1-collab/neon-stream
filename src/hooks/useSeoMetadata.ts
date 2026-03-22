/**
 * SEO Metadata Hook
 * Dynamically sets page metadata for better SEO and social sharing
 */

export interface SeoMetadata {
  title: string;
  description: string;
  keywords?: string[];
  ogImage?: string;
  ogType?: string;
  twitterCard?: "summary" | "summary_large_image" | "app" | "player";
  canonical?: string;
  robots?: string;
  author?: string;
  publishedDate?: string;
  modifiedDate?: string;
}

/**
 * Set page metadata
 */
export function setSeoMetadata(metadata: SeoMetadata): void {
  // Title
  document.title = metadata.title;

  // Meta tags
  setMetaTag("name", "description", metadata.description);

  if (metadata.keywords && metadata.keywords.length > 0) {
    setMetaTag("name", "keywords", metadata.keywords.join(", "));
  }

  if (metadata.robots) {
    setMetaTag("name", "robots", metadata.robots);
  }

  if (metadata.author) {
    setMetaTag("name", "author", metadata.author);
  }

  // Open Graph
  setMetaTag("property", "og:title", metadata.title);
  setMetaTag("property", "og:description", metadata.description);
  setMetaTag("property", "og:type", metadata.ogType || "website");

  if (metadata.ogImage) {
    setMetaTag("property", "og:image", metadata.ogImage);
  }

  // Twitter
  setMetaTag("name", "twitter:card", metadata.twitterCard || "summary_large_image");
  setMetaTag("name", "twitter:title", metadata.title);
  setMetaTag("name", "twitter:description", metadata.description);

  if (metadata.ogImage) {
    setMetaTag("name", "twitter:image", metadata.ogImage);
  }

  // Canonical URL
  if (metadata.canonical) {
    setCanonicalUrl(metadata.canonical);
  }

  // Article dates
  if (metadata.publishedDate) {
    setMetaTag("property", "article:published_time", metadata.publishedDate);
  }

  if (metadata.modifiedDate) {
    setMetaTag("property", "article:modified_time", metadata.modifiedDate);
  }
}

/**
 * Set or update a meta tag
 */
function setMetaTag(
  attribute: "name" | "property",
  content: string,
  value: string
): void {
  let tag = document.querySelector(`meta[${attribute}="${content}"]`);

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, content);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", value);
}

/**
 * Set canonical URL
 */
function setCanonicalUrl(url: string): void {
  let canonical = document.querySelector('link[rel="canonical"]');

  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }

  canonical.setAttribute("href", url);
}

/**
 * Get current page metadata
 */
export function getPageMetadata(): Partial<SeoMetadata> {
  return {
    title: document.title,
    description: document.querySelector('meta[name="description"]')?.getAttribute("content") || "",
    keywords: document
      .querySelector('meta[name="keywords"]')
      ?.getAttribute("content")
      ?.split(", "),
  };
}

/**
 * Schema.org structured data helpers
 */
export function setStructuredData(schema: object): void {
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.innerHTML = JSON.stringify(schema);
  document.head.appendChild(script);
}

/**
 * Create Article structured data
 */
export function createArticleSchema(data: {
  headline: string;
  description: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: data.headline,
    description: data.description,
    image: data.image || "",
    datePublished: data.datePublished,
    dateModified: data.dateModified || data.datePublished,
    author: {
      "@type": "Organization",
      name: data.author || "AbcTV LIVE",
    },
  };
}

/**
 * Create Event structured data (for sports events/matches)
 */
export function createEventSchema(data: {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  image?: string;
  location?: string;
  performer?: string;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: data.name,
    description: data.description,
    startDate: data.startDate,
    endDate: data.endDate || data.startDate,
    image: data.image || "",
    location: {
      "@type": "Place",
      name: data.location || "Online",
    },
    performer: {
      "@type": "Organization",
      name: data.performer || "Sports Event",
    },
  };
}

/**
 * Create Organization structured data
 */
export function createOrganizationSchema(): object {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "AbcTV LIVE",
    url: "https://abctv-live.app",
    logo: "https://abctv-live.app/logo.png",
    description: "Live sports streaming platform for cricket and football",
    sameAs: ["https://twitter.com/abctv", "https://facebook.com/abctv"],
  };
}

/**
 * Create BreadcrumbList structured data
 */
export function createBreadcrumbSchema(breadcrumbs: Array<{ name: string; url: string }>): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
