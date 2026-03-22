import { useState, useEffect, useCallback, useRef } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FootballMatch } from "@/hooks/useFootballAPI";
import { LiveEvent, addDocument, updateDocument, deleteDocument } from "@/hooks/useFirestore";

const FETCH_INTERVAL = 2 * 60 * 1000; // 2 minutes

interface StreamEntry {
  fixture_id?: string | number;
  id?: string | number;
  home?: string;
  home_team?: string;
  homeTeam?: string;
  "Team 1 Name"?: string;
  away?: string;
  away_team?: string;
  awayTeam?: string;
  "Team 2 Name"?: string;
  stream_url?: string;
  streamUrl?: string;
  url?: string;
  source?: string;
  "Stream URL"?: string;
  player_type?: string;
  playerType?: string;
  "Match Status"?: string;
  "League"?: string;
  "Team 1 Logo"?: string;
  "Team 2 Logo"?: string;
  "Category"?: string;
  "User-Agent"?: string;
  "Referer"?: string;
}

interface StreamCache {
  data: StreamEntry[];
  ts: number;
}

function normalize(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]/g, "").replace(/\s+/g, "");
}

function fuzzyMatch(a: string, b: string): boolean {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb || na.length < 3 || nb.length < 3) return false;
  return na.includes(nb) || nb.includes(na);
}

function getStreamUrl(entry: StreamEntry): string {
  return entry["Stream URL"] || entry.stream_url || entry.streamUrl || entry.url || entry.source || "";
}

function getHome(entry: StreamEntry): string {
  return entry["Team 1 Name"] || entry.home || entry.home_team || entry.homeTeam || "";
}

function getAway(entry: StreamEntry): string {
  return entry["Team 2 Name"] || entry.away || entry.away_team || entry.awayTeam || "";
}

function getFixtureId(entry: StreamEntry): string {
  const id = entry.fixture_id || entry.id || "";
  return String(id);
}

function getMatchStatus(entry: StreamEntry): string {
  return (entry["Match Status"] || "").toLowerCase().trim();
}

function getLeague(entry: StreamEntry): string {
  return entry["League"] || entry["Category"] || "";
}

function findStreamForMatch(match: FootballMatch, streams: StreamEntry[]): StreamEntry | null {
  for (const s of streams) {
    const fid = getFixtureId(s);
    if (fid && fid === match.id) return s;
  }
  for (const s of streams) {
    const home = getHome(s);
    const away = getAway(s);
    if (home && away && fuzzyMatch(match.homeTeam, home) && fuzzyMatch(match.awayTeam, away)) return s;
  }
  for (const s of streams) {
    const home = getHome(s);
    const away = getAway(s);
    if (home && away && fuzzyMatch(match.homeTeam, away) && fuzzyMatch(match.awayTeam, home)) return s;
  }
  return null;
}

function isJsonAutoEvent(ev: LiveEvent): boolean {
  return (ev as any).source === "json-auto";
}

function findExistingEvent(liveEvents: LiveEvent[], teamA: string, teamB: string): LiveEvent | undefined {
  return liveEvents.find(ev => {
    const evA = String(ev.teamA || "").toLowerCase();
    const evB = String(ev.teamB || "").toLowerCase();
    if (evA.length < 2) return false;
    return (fuzzyMatch(evA, teamA.toLowerCase()) && fuzzyMatch(evB, teamB.toLowerCase())) ||
           (fuzzyMatch(evA, teamB.toLowerCase()) && fuzzyMatch(evB, teamA.toLowerCase()));
  });
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
    if (!streamJsonUrl || !autoStreamEnabled) return;
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      let rawStreams: StreamEntry[] = [];
      const cached = cacheRef.current;
      if (cached && Date.now() - cached.ts < FETCH_INTERVAL) {
        rawStreams = cached.data;
      } else {
        try {
          const res = await fetch(streamJsonUrl, { cache: "no-store" });
          if (res.ok) {
            const json = await res.json();
            rawStreams = Array.isArray(json)
              ? json
              : json.channels || json.streams || json.data || json.matches || [];
            cacheRef.current = { data: rawStreams, ts: Date.now() };
            setLastFetch(Date.now());
            console.log(`📡 Stream JSON: fetched ${rawStreams.length} entries`);
          }
        } catch (err) {
          console.warn("Stream JSON fetch failed:", err);
          if (cached) rawStreams = cached.data;
        }
      }

      if (rawStreams.length === 0) {
        processingRef.current = false;
        return;
      }

      let matched = 0;
      const processedJsonTeams = new Set<string>();

      // 1) Match API matches with JSON streams
      for (const match of matches) {
        const streamEntry = findStreamForMatch(match, rawStreams);
        if (!streamEntry) continue;

        const streamUrl = getStreamUrl(streamEntry);
        if (!streamUrl) continue;

        const home = getHome(streamEntry);
        const away = getAway(streamEntry);
        processedJsonTeams.add(`${normalize(home)}__${normalize(away)}`);

        const existing = findExistingEvent(liveEvents, match.homeTeam, match.awayTeam);

        if (existing) {
          const updates: Record<string, any> = {};
          if (existing.streamUrl !== streamUrl) updates.streamUrl = streamUrl;
          if (Object.keys(updates).length > 0) {
            await updateDocument("liveEvents", existing.id, updates);
            console.log(`🔄 Updated stream: ${match.homeTeam} vs ${match.awayTeam}`);
          }
          matched++;
        } else {
          await addDocument("liveEvents", {
            title: `${match.homeTeam} vs ${match.awayTeam}`,
            teamA: match.homeTeam,
            teamALogo: match.homeLogo,
            teamB: match.awayTeam,
            teamBLogo: match.awayLogo,
            streamUrl,
            playerType: streamEntry.player_type || streamEntry.playerType || "hls",
            startTime: match.startTimestamp,
            endTime: match.startTimestamp + 2 * 3600000,
            countryId: "",
            isFeatured: true,
            isActive: true,
            manualStatus: match.isLive ? "live" : "",
            league: match.league,
            leagueLogo: match.leagueLogo,
            source: "json-auto",
          });
          console.log(`✅ Auto-imported (API+JSON): ${match.homeTeam} vs ${match.awayTeam}`);
          matched++;
        }
      }

      // 2) Import JSON-only LIVE matches (not matched to any API match)
      for (const entry of rawStreams) {
        const status = getMatchStatus(entry);
        if (status !== "live") continue;

        const streamUrl = getStreamUrl(entry);
        if (!streamUrl) continue;

        const home = getHome(entry);
        const away = getAway(entry);
        if (!home || home.length < 2) continue;

        // Skip intro/placeholder
        if (normalize(home) === "bingstream" || normalize(away) === "intro") continue;

        const key = `${normalize(home)}__${normalize(away)}`;
        if (processedJsonTeams.has(key)) continue;
        processedJsonTeams.add(key);

        const existing = findExistingEvent(liveEvents, home, away || home);

        if (existing) {
          const updates: Record<string, any> = {};
          if (existing.streamUrl !== streamUrl) updates.streamUrl = streamUrl;
          if (!existing.isActive) updates.isActive = true;
          if (existing.manualStatus !== "live") updates.manualStatus = "live";
          if (Object.keys(updates).length > 0) {
            await updateDocument("liveEvents", existing.id, updates);
            console.log(`🔄 Updated JSON-live: ${home} vs ${away}`);
          }
          matched++;
        } else {
          const league = getLeague(entry);
          const now = Date.now();
          await addDocument("liveEvents", {
            title: away ? `${home} vs ${away}` : home,
            teamA: home,
            teamALogo: entry["Team 1 Logo"] || "",
            teamB: away || "",
            teamBLogo: entry["Team 2 Logo"] || "",
            streamUrl,
            playerType: "hls",
            startTime: now,
            endTime: now + 3 * 3600000,
            countryId: "",
            isFeatured: true,
            isActive: true,
            manualStatus: "live",
            league,
            leagueLogo: "",
            source: "json-auto",
          });
          console.log(`✅ JSON-only live: ${home} vs ${away || "N/A"}`);
          matched++;
        }
      }

      // 3) Auto-delete json-auto events no longer live in JSON
      const jsonLiveKeys = new Set<string>();
      for (const entry of rawStreams) {
        if (getMatchStatus(entry) === "live") {
          const h = normalize(getHome(entry));
          const a = normalize(getAway(entry));
          if (h) jsonLiveKeys.add(`${h}__${a}`);
        }
      }

      for (const ev of liveEvents) {
        if (!isJsonAutoEvent(ev)) continue;
        if (!ev.isActive) continue;

        const evHome = normalize(String(ev.teamA || ""));
        const evAway = normalize(String(ev.teamB || ""));

        let stillLive = false;
        for (const key of jsonLiveKeys) {
          const [kh, ka] = key.split("__");
          if ((fuzzyMatch(evHome, kh) && fuzzyMatch(evAway, ka)) ||
              (fuzzyMatch(evHome, ka) && fuzzyMatch(evAway, kh))) {
            stillLive = true;
            break;
          }
        }

        if (!stillLive) {
          await deleteDocument("liveEvents", ev.id);
          console.log(`🗑️ Auto-deleted: ${ev.teamA} vs ${ev.teamB}`);
        }
      }

      setStreamCount(matched);
      if (matched > 0) console.log(`📡 Auto-stream: ${matched} matches linked`);
    } catch (err) {
      console.error("Auto-stream error:", err);
    } finally {
      processingRef.current = false;
    }
  }, [streamJsonUrl, autoStreamEnabled, matches, liveEvents]);

  useEffect(() => {
    if (!streamJsonUrl || !autoStreamEnabled) return;
    processStreams();
    const interval = setInterval(processStreams, FETCH_INTERVAL);
    return () => clearInterval(interval);
  }, [processStreams, streamJsonUrl, autoStreamEnabled]);

  return { streamJsonUrl, autoStreamEnabled, lastFetch, streamCount };
}
