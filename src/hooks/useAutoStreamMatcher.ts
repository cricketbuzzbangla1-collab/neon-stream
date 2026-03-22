import { useState, useEffect, useCallback, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FootballMatch } from "@/hooks/useFootballAPI";
import { LiveEvent, addDocument, updateDocument } from "@/hooks/useFirestore";

const FETCH_INTERVAL = 2 * 60 * 1000; // 2 minutes

interface StreamEntry {
  fixture_id?: string | number;
  id?: string | number;
  home?: string;
  home_team?: string;
  homeTeam?: string;
  away?: string;
  away_team?: string;
  awayTeam?: string;
  stream_url?: string;
  streamUrl?: string;
  url?: string;
  source?: string;
  player_type?: string;
  playerType?: string;
}

interface StreamCache {
  data: StreamEntry[];
  ts: number;
}

function normalize(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, "")
    .replace(/\s+/g, "");
}

function fuzzyMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb || na.length < 3 || nb.length < 3) return false;
  return na.includes(nb) || nb.includes(na);
}

function getStreamUrl(entry: StreamEntry): string {
  return entry.stream_url || entry.streamUrl || entry.url || entry.source || "";
}

function getHome(entry: StreamEntry): string {
  return entry.home || entry.home_team || entry.homeTeam || "";
}

function getAway(entry: StreamEntry): string {
  return entry.away || entry.away_team || entry.awayTeam || "";
}

function getFixtureId(entry: StreamEntry): string {
  const id = entry.fixture_id || entry.id || "";
  return String(id);
}

function findStreamForMatch(match: FootballMatch, streams: StreamEntry[]): StreamEntry | null {
  // 1) Try fixture_id match
  for (const s of streams) {
    const fid = getFixtureId(s);
    if (fid && fid === match.id) return s;
  }

  // 2) Try team name match
  for (const s of streams) {
    const home = getHome(s);
    const away = getAway(s);
    if (home && away && fuzzyMatch(match.homeTeam, home) && fuzzyMatch(match.awayTeam, away)) {
      return s;
    }
  }

  // 3) Reversed team order
  for (const s of streams) {
    const home = getHome(s);
    const away = getAway(s);
    if (home && away && fuzzyMatch(match.homeTeam, away) && fuzzyMatch(match.awayTeam, home)) {
      return s;
    }
  }

  return null;
}

export function useAutoStreamMatcher(
  matches: FootballMatch[],
  liveEvents: LiveEvent[]
) {
  const [streamJsonUrl, setStreamJsonUrl] = useState("");
  const [autoStreamEnabled, setAutoStreamEnabled] = useState(true);
  const [lastFetch, setLastFetch] = useState(0);
  const [streamCount, setStreamCount] = useState(0);
  const cacheRef = useRef<StreamCache | null>(null);
  const processingRef = useRef(false);

  // Listen for settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "appSettings", "main"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStreamJsonUrl(data.streamJsonUrl || "");
        setAutoStreamEnabled(data.autoStreamEnabled !== false);
      }
    });
    return unsub;
  }, []);

  const processStreams = useCallback(async () => {
    if (!streamJsonUrl || !autoStreamEnabled || matches.length === 0) return;
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      // Fetch JSON
      let streams: StreamEntry[] = [];
      const cached = cacheRef.current;
      if (cached && Date.now() - cached.ts < FETCH_INTERVAL) {
        streams = cached.data;
      } else {
        try {
          const res = await fetch(streamJsonUrl, { cache: "no-store" });
          if (res.ok) {
            const json = await res.json();
            streams = Array.isArray(json) ? json : json.streams || json.data || json.matches || [];
            cacheRef.current = { data: streams, ts: Date.now() };
            setLastFetch(Date.now());
            console.log(`📡 Stream JSON: fetched ${streams.length} entries`);
          }
        } catch (err) {
          console.warn("Stream JSON fetch failed:", err);
          if (cached) streams = cached.data;
        }
      }

      if (streams.length === 0) {
        processingRef.current = false;
        return;
      }

      let matched = 0;

      for (const match of matches) {
        const streamEntry = findStreamForMatch(match, streams);
        if (!streamEntry) continue;

        const streamUrl = getStreamUrl(streamEntry);
        if (!streamUrl) continue;

        // Check if already exists in liveEvents
        const existing = liveEvents.find(ev => {
          const evA = String(ev.teamA || "").toLowerCase();
          const evB = String(ev.teamB || "").toLowerCase();
          const home = match.homeTeam.toLowerCase();
          const away = match.awayTeam.toLowerCase();
          return (evA.includes(home) || home.includes(evA)) &&
                 (evB.includes(away) || away.includes(evB)) &&
                 evA.length > 2 && evB.length > 2;
        });

        if (existing) {
          // Update stream URL if different
          if (existing.streamUrl !== streamUrl) {
            await updateDocument("liveEvents", existing.id, { streamUrl });
            console.log(`🔄 Updated stream: ${match.homeTeam} vs ${match.awayTeam}`);
          }
          matched++;
        } else {
          // Create new liveEvent
          const playerType = streamEntry.player_type || streamEntry.playerType || "hls";
          await addDocument("liveEvents", {
            title: `${match.homeTeam} vs ${match.awayTeam}`,
            teamA: match.homeTeam,
            teamALogo: match.homeLogo,
            teamB: match.awayTeam,
            teamBLogo: match.awayLogo,
            streamUrl,
            playerType,
            startTime: match.startTimestamp,
            endTime: match.startTimestamp + 2 * 3600000,
            countryId: "",
            isFeatured: true,
            isActive: true,
            manualStatus: match.isLive ? "live" : "",
            league: match.league,
            leagueLogo: match.leagueLogo,
          });
          console.log(`✅ Auto-imported: ${match.homeTeam} vs ${match.awayTeam}`);
          matched++;
        }
      }

      setStreamCount(matched);
      if (matched > 0) {
        console.log(`📡 Auto-stream: ${matched} matches linked`);
      }
    } catch (err) {
      console.error("Auto-stream error:", err);
    } finally {
      processingRef.current = false;
    }
  }, [streamJsonUrl, autoStreamEnabled, matches, liveEvents]);

  // Run on mount and every 2 minutes
  useEffect(() => {
    if (!streamJsonUrl || !autoStreamEnabled) return;

    processStreams();
    const interval = setInterval(processStreams, FETCH_INTERVAL);
    return () => clearInterval(interval);
  }, [processStreams, streamJsonUrl, autoStreamEnabled]);

  return { streamJsonUrl, autoStreamEnabled, lastFetch, streamCount };
}
