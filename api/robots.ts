import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { VercelRequest, VercelResponse } from "@vercel/node";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDqB0UWEf00H5cL9T7JNSmqLmBYQ5wUYnw",
  authDomain: "livestream-db-3cae7.firebaseapp.com",
  projectId: "livestream-db-3cae7",
  storageBucket: "livestream-db-3cae7.appspot.com",
  messagingSenderId: "462883900379",
  appId: "1:462883900379:web:14c44d52c47ddc5bec1834",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const DEFAULT_ROBOTS_TXT = `# SEO-friendly robots.txt for AbcTV LIVE
# Optimized for fast crawling and indexing

# Default rules for all crawlers
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /*.json$
Disallow: *.js
Disallow: *.css
Disallow: /node_modules/
Disallow: /dist/
Crawl-delay: 1
Request-rate: 30/60

# Google Bot - aggressive crawling allowed
User-agent: Googlebot
Allow: /
Disallow: /admin
Disallow: /api/
Crawl-delay: 0

# Bing Bot
User-agent: Bingbot
Allow: /
Disallow: /admin
Disallow: /api/
Crawl-delay: 1

# Social Media Crawlers
User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

User-agent: LinkedInBot
Allow: /

User-agent: WhatsApp
Allow: /

# Block known bad actors
User-agent: AhrefsBot
Disallow: /

User-agent: SemrushBot
Disallow: /

# Sitemap
Sitemap: https://abctvlive.vercel.app/api/sitemap
`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Try to fetch custom robots.txt from Firebase settings
    let robotsText = DEFAULT_ROBOTS_TXT;

    try {
      const settingsSnap = await getDoc(doc(db, "appSettings", "config"));
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        if (data.seo?.robotsText) {
          robotsText = data.seo.robotsText;
        }
      }
    } catch (error) {
      console.warn("Could not fetch custom robots.txt, using default:", error);
    }

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Cache-Control", "public, max-age=86400, must-revalidate");
    return res.status(200).send(robotsText);
  } catch (error: any) {
    console.error("Robots.txt generation error:", error);
    res.setHeader("Content-Type", "text/plain");
    return res.status(200).send(DEFAULT_ROBOTS_TXT);
  }
}
