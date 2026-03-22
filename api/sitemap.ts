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

interface UrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: number;
}

function escapeXml(str: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  };
  return str.replace(/[&<>"']/g, (char) => map[char]);
}

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

async function generateSitemap(): Promise<string> {
  const baseUrl = "https://abctvlive.vercel.app";
  const today = new Date().toISOString().split("T")[0];

  // Static pages
  const urls: UrlEntry[] = [
    {
      loc: "/",
      lastmod: today,
      changefreq: "hourly",
      priority: 1.0,
    },
    {
      loc: "/channels",
      lastmod: today,
      changefreq: "daily",
      priority: 0.9,
    },
    {
      loc: "/chat",
      lastmod: today,
      changefreq: "daily",
      priority: 0.8,
    },
    {
      loc: "/search",
      lastmod: today,
      changefreq: "daily",
      priority: 0.8,
    },
    {
      loc: "/favorites",
      lastmod: today,
      changefreq: "weekly",
      priority: 0.7,
    },
    {
      loc: "/my-playlist",
      lastmod: today,
      changefreq: "weekly",
      priority: 0.7,
    },
  ];

  try {
    // Add dynamic channels
    const channelsSnap = await getDoc(doc(db, "metadata", "channels"));
    if (channelsSnap.exists()) {
      const channelsData = channelsSnap.data();
      if (channelsData && Array.isArray(channelsData.channels)) {
        channelsData.channels.forEach((channel: any) => {
          urls.push({
            loc: `/watch/${channel.id}`,
            lastmod: channel.updatedAt || today,
            changefreq: "daily",
            priority: 0.6,
          });
        });
      }
    }

    // Add dynamic live events
    const eventsSnap = await getDoc(doc(db, "metadata", "liveEvents"));
    if (eventsSnap.exists()) {
      const eventsData = eventsSnap.data();
      if (eventsData && Array.isArray(eventsData.events)) {
        eventsData.events.forEach((event: any) => {
          urls.push({
            loc: `/watch/${event.id}`,
            lastmod: event.updatedAt || today,
            changefreq: "never",
            priority: 0.5,
          });
        });
      }
    }

    // Add dynamic playlists
    const playlistsSnap = await getDoc(doc(db, "metadata", "playlists"));
    if (playlistsSnap.exists()) {
      const playlistsData = playlistsSnap.data();
      if (playlistsData && Array.isArray(playlistsData.playlists)) {
        playlistsData.playlists.forEach((playlist: any) => {
          urls.push({
            loc: `/playlist/${playlist.id}/0`,
            lastmod: playlist.updatedAt || today,
            changefreq: "weekly",
            priority: 0.5,
          });
        });
      }
    }
  } catch (error) {
    console.error("Error fetching dynamic content for sitemap:", error);
  }

  return generateSitemapXml(urls, baseUrl);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const sitemap = await generateSitemap();
    res.setHeader("Content-Type", "application/xml");
    res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
    return res.status(200).send(sitemap);
  } catch (error: any) {
    console.error("Sitemap generation error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate sitemap" });
  }
}
