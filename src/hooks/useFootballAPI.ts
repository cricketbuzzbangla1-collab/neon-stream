import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface FootballMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeLogo: string;
  awayLogo: string;
  homeScore: string;
  awayScore: string;
  matchTime: string;
  matchDate: string;
  matchStatus: string;
  isLive: boolean;
  league: string;
  leagueId: string;
  leagueLogo: string;
  country: string;
  stadium: string;
  round: string;
  startTimestamp: number;
}

// ===== apifootball.com =====
const APIFOOTBALL_BASE = "https://apiv3.apifootball.com/";
const DEFAULT_APIFOOTBALL_KEY = "10144b1b1c0934e60629f08a37064aec805f0a3b4fa6488a654ff791ef86aac7";

export const ALLOWED_LEAGUES: Record<string, { name: string; country: string }> = {
  "152": { name: "Premier League", country: "England" },
  "302": { name: "La Liga", country: "Spain" },
  "207": { name: "Serie A", country: "Italy" },
  "175": { name: "Bundesliga", country: "Germany" },
  "168": { name: "Ligue 1", country: "France" },
  "278": { name: "Saudi Pro League", country: "Saudi Arabia" },
  "332": { name: "Major League Soccer", country: "USA" },
  "3":   { name: "UEFA Champions League", country: "Europe" },
  "4":   { name: "UEFA Europa League", country: "Europe" },
  "683": { name: "UEFA Europa Conference League", country: "Europe" },
  "10":  { name: "UEFA Nations League", country: "Europe" },
};

// ===== football-data.org =====
const FOOTBALLDATA_BASE = "https://api.football-data.org/v4";
const DEFAULT_FOOTBALLDATA_KEY = "e4df9b4f6d364f2d9950728666d9a897";

export const FOOTBALLDATA_LEAGUES: Record<string, { name: string; country: string }> = {
  "PL":  { name: "Premier League", country: "England" },
  "PD":  { name: "La Liga", country: "Spain" },
  "SA":  { name: "Serie A", country: "Italy" },
  "BL1": { name: "Bundesliga", country: "Germany" },
  "FL1": { name: "Ligue 1", country: "France" },
  "CL":  { name: "UEFA Champions League", country: "Europe" },
  "EC":  { name: "European Championship", country: "Europe" },
  "WC":  { name: "FIFA World Cup", country: "World" },
};

// --- Rate Limiting ---
const RATE_KEY = "football_api_rate_hourly";

function getCurrentHour(): string {
  const d = new Date();
  return `${d.toISOString().split("T")[0]}_${d.getHours()}`;
}

function getRateInfo(): { count: number; hour: string } {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.hour === getCurrentHour()) return parsed;
    }
  } catch {}
  return { count: 0, hour: getCurrentHour() };
}

function resetRateLimit(): void {
  localStorage.removeItem(RATE_KEY);
}

function incrementRate(maxPerHour: number): boolean {
  const info = getRateInfo();
  if (info.count >= maxPerHour) return false;
  localStorage.setItem(RATE_KEY, JSON.stringify({ count: info.count + 1, hour: getCurrentHour() }));
  return true;
}

// --- Cache ---
interface MatchCache { data: FootballMatch[]; ts: number; hasLive: boolean; }
let matchCache: MatchCache | null = null;

function getCacheTTL(): number {
  return matchCache?.hasLive ? 10 * 60 * 1000 : 30 * 60 * 1000;
}

function getToday(): string { return new Date().toISOString().split("T")[0]; }
function getTomorrow(): string {
  const d = new Date(); d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export function getMinutesUntilStart(startTs: number): number {
  return (startTs - Date.now()) / 60000;
}

// ===== apifootball.com parser =====
function parseApifootballMatch(m: any): FootballMatch {
  const matchDate = m.match_date || "";
  const matchTime = m.match_time || "";
  const [year, month, day] = matchDate.split("-").map(Number);
  const [hour, minute] = matchTime.split(":").map(Number);
  const startTimestamp = new Date(year, month - 1, day, hour, minute).getTime();
  return {
    id: m.match_id,
    homeTeam: m.match_hometeam_name || "",
    awayTeam: m.match_awayteam_name || "",
    homeLogo: m.team_home_badge || "",
    awayLogo: m.team_away_badge || "",
    homeScore: m.match_hometeam_score || "",
    awayScore: m.match_awayteam_score || "",
    matchTime, matchDate,
    matchStatus: m.match_status || "",
    isLive: m.match_live === "1",
    league: m.league_name || "",
    leagueId: m.league_id || "",
    leagueLogo: m.league_logo || "",
    country: m.country_name || "",
    stadium: m.match_stadium || "",
    round: m.match_round || "",
    startTimestamp,
  };
}

// ===== football-data.org parser =====
function mapFDStatus(status: string): { displayStatus: string; isLive: boolean } {
  switch (status) {
    case "IN_PLAY": return { displayStatus: "LIVE", isLive: true };
    case "HALFTIME": case "PAUSED": return { displayStatus: "HT", isLive: true };
    case "EXTRA_TIME": return { displayStatus: "EXTRA_TIME", isLive: true };
    case "PENALTY_SHOOTOUT": return { displayStatus: "PENALTY_SHOOTOUT", isLive: true };
    case "FINISHED": case "AWARDED": return { displayStatus: "Finished", isLive: false };
    case "POSTPONED": return { displayStatus: "Postponed", isLive: false };
    case "CANCELLED": return { displayStatus: "Cancelled", isLive: false };
    case "SUSPENDED": return { displayStatus: "Suspended", isLive: false };
    default: return { displayStatus: "", isLive: false };
  }
}

function parseFootballdataMatch(m: any): FootballMatch {
  const utcDate = m.utcDate || "";
  const startTs = new Date(utcDate).getTime();
  const d = new Date(utcDate);
  const matchDate = utcDate.split("T")[0] || "";
  const matchTime = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  const { displayStatus, isLive } = mapFDStatus(m.status || "");
  const homeScore = m.score?.fullTime?.home ?? m.score?.halfTime?.home ?? "";
  const awayScore = m.score?.fullTime?.away ?? m.score?.halfTime?.away ?? "";
  return {
    id: String(m.id),
    homeTeam: m.homeTeam?.shortName || m.homeTeam?.name || "",
    awayTeam: m.awayTeam?.shortName || m.awayTeam?.name || "",
    homeLogo: m.homeTeam?.crest || "",
    awayLogo: m.awayTeam?.crest || "",
    homeScore: homeScore !== null && homeScore !== "" ? String(homeScore) : "",
    awayScore: awayScore !== null && awayScore !== "" ? String(awayScore) : "",
    matchTime, matchDate,
    matchStatus: displayStatus,
    isLive,
    league: m.competition?.name || "",
    leagueId: m.competition?.code || "",
    leagueLogo: m.competition?.emblem || "",
    country: m.area?.name || "",
    stadium: m.venue || "",
    round: m.matchday ? `Matchday ${m.matchday}` : "",
    startTimestamp: startTs,
  };
}

// ===== Fetch functions =====
async function fetchFromApifootball(apiKey: string): Promise<FootballMatch[]> {
  const today = getToday();
  const tomorrow = getTomorrow();
  const leagueIds = Object.keys(ALLOWED_LEAGUES).join(",");
  const url = `${APIFOOTBALL_BASE}?action=get_events&from=${today}&to=${tomorrow}&league_id=${leagueIds}&APIkey=${apiKey}`;
  const res = await fetch(url);
  const json = await res.json();
  if (!Array.isArray(json)) return [];
  return json.map(parseApifootballMatch)
    .filter((m: FootballMatch) => m.matchStatus !== "Finished" && m.matchStatus !== "After Pens." && m.matchStatus !== "After ET");
}

async function fetchFromFootballdata(apiKey: string): Promise<FootballMatch[]> {
  const today = getToday();
  const tomorrow = getTomorrow();
  const targetUrl = `${FOOTBALLDATA_BASE}/matches?dateFrom=${today}&dateTo=${tomorrow}`;

  // Vercel proxy URL (works on deployed sites)
  const isProduction = window.location.hostname !== "localhost" && !window.location.hostname.includes("lovableproject.com");
  const proxyApiUrl = `/api/football-proxy?dateFrom=${today}&dateTo=${tomorrow}&token=${encodeURIComponent(apiKey)}`;

  try {
    let json: any = null;

    // Method 0: Vercel serverless proxy (best for production)
    if (isProduction) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(proxyApiUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          json = await res.json();
          console.log("✅ football-data.org: Vercel proxy success");
        }
      } catch (e: any) {
        console.warn("Vercel proxy failed:", e?.message || e);
      }
    }

    // Method 1: Direct fetch with CORS (football-data.org supports CORS)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(targetUrl, {
        headers: { "X-Auth-Token": apiKey },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        json = await res.json();
        console.log("✅ football-data.org: Direct fetch success");
      } else {
        const errText = await res.text().catch(() => "");
        console.warn(`football-data.org direct error ${res.status}: ${errText}`);
      }
    } catch (e: any) {
      console.warn("football-data.org direct failed:", e?.message || e);
    }

    // Method 2: Use thingproxy (forwards headers properly)
    if (!json) {
      try {
        console.log("Trying thingproxy for football-data.org...");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const proxyRes = await fetch(`https://thingproxy.freeboard.io/fetch/${targetUrl}`, {
          headers: { "X-Auth-Token": apiKey },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (proxyRes.ok) {
          json = await proxyRes.json();
          console.log("✅ football-data.org: thingproxy success");
        }
      } catch (e: any) {
        console.warn("thingproxy failed:", e?.message || e);
      }
    }

    // Method 3: Use corsproxy.io (forwards most headers)
    if (!json) {
      try {
        console.log("Trying corsproxy.io for football-data.org...");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const proxyRes = await fetch(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, {
          headers: { "X-Auth-Token": apiKey },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (proxyRes.ok) {
          json = await proxyRes.json();
          console.log("✅ football-data.org: corsproxy success");
        }
      } catch (e: any) {
        console.warn("corsproxy.io failed:", e?.message || e);
      }
    }

    // Method 4: Use allorigins with JSON wrapper (no custom headers but public endpoints)
    if (!json) {
      try {
        console.log("Trying allorigins for football-data.org...");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const allOriginsUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl + "&_token=" + apiKey)}`;
        const proxyRes = await fetch(allOriginsUrl, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (proxyRes.ok) {
          const wrapper = await proxyRes.json();
          if (wrapper.contents) {
            json = JSON.parse(wrapper.contents);
            console.log("✅ football-data.org: allorigins success");
          }
        }
      } catch (e: any) {
        console.warn("allorigins failed:", e?.message || e);
      }
    }

    if (!json) {
      console.error("❌ football-data.org: All methods failed. Check API key.");
      return [];
    }

    if (!json?.matches || !Array.isArray(json.matches)) {
      console.warn("football-data.org: No matches array in response", json);
      return [];
    }

    const allowedCodes = Object.keys(FOOTBALLDATA_LEAGUES);
    const filtered = json.matches
      .filter((m: any) => allowedCodes.includes(m.competition?.code))
      .map(parseFootballdataMatch)
      .filter((m: FootballMatch) => m.matchStatus !== "Finished" && m.matchStatus !== "Cancelled" && m.matchStatus !== "Postponed");
    
    console.log(`⚽ football-data.org: ${filtered.length} matches after filtering`);
    return filtered;
  } catch (err) {
    console.error("football-data.org fetch error:", err);
    return [];
  }
}

// ===== Hook =====
export type ApiProvider = "apifootball" | "footballdata";

export function useFootballMatches() {
  const [matches, setMatches] = useState<FootballMatch[]>(matchCache?.data || []);
  const [loading, setLoading] = useState(!matchCache);
  const [apiKey, setApiKey] = useState<string>(DEFAULT_APIFOOTBALL_KEY);
  const [footballdataKey, setFootballdataKey] = useState<string>(DEFAULT_FOOTBALLDATA_KEY);
  const [enabled, setEnabled] = useState(true);
  const [apiProvider, setApiProvider] = useState<ApiProvider>("apifootball");
  const [disabledLeagues, setDisabledLeagues] = useState<string[]>([]);
  const [maxCallsPerHour, setMaxCallsPerHour] = useState(3);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "appSettings", "main"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.footballApiKey) setApiKey(data.footballApiKey);
        if (data.footballdataApiKey) setFootballdataKey(data.footballdataApiKey);
        if (data.footballApiEnabled === false) setEnabled(false);
        else setEnabled(true);
        if (data.footballApiProvider) setApiProvider(data.footballApiProvider);
        if (Array.isArray(data.disabledLeagues)) setDisabledLeagues(data.disabledLeagues);
        else setDisabledLeagues([]);
        if (typeof data.footballApiCallsPerHour === "number") setMaxCallsPerHour(data.footballApiCallsPerHour);
      }
    });
    return unsub;
  }, []);

  const fetchMatches = useCallback(async () => {
    if (!enabled) { setLoading(false); return; }

    const activeKey = apiProvider === "footballdata" ? footballdataKey : apiKey;
    if (!activeKey) { setLoading(false); return; }

    if (matchCache && Date.now() - matchCache.ts < getCacheTTL()) {
      setMatches(matchCache.data); setLoading(false); return;
    }

    if (getRateInfo().count >= maxCallsPerHour) {
      console.warn(`⚠️ Football API: Hourly limit reached`);
      if (matchCache) setMatches(matchCache.data);
      setLoading(false); return;
    }

    if (!incrementRate(maxCallsPerHour)) {
      if (matchCache) setMatches(matchCache.data);
      setLoading(false); return;
    }

    try {
      let parsed: FootballMatch[];
      if (apiProvider === "footballdata") {
        parsed = await fetchFromFootballdata(footballdataKey);
      } else {
        parsed = await fetchFromApifootball(apiKey);
      }

      parsed.sort((a, b) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        return a.startTimestamp - b.startTimestamp;
      });

      const hasLive = parsed.some(m => m.isLive);
      matchCache = { data: parsed, ts: Date.now(), hasLive };
      setMatches(parsed);
      console.log(`⚽ ${apiProvider}: Fetched ${parsed.length} matches (${getRateInfo().count}/${maxCallsPerHour} calls/hr)`);
    } catch (err) {
      console.error("Football API error:", err);
      if (matchCache) setMatches(matchCache.data);
    } finally {
      setLoading(false);
    }
  }, [apiKey, footballdataKey, enabled, maxCallsPerHour, apiProvider]);

  useEffect(() => {
    matchCache = null;
    resetRateLimit(); // reset rate limit when provider changes
    fetchMatches();
    const intervalMs = Math.max(5 * 60 * 1000, Math.floor(60 * 60 * 1000 / Math.max(maxCallsPerHour, 1)));
    const interval = setInterval(fetchMatches, intervalMs);
    return () => clearInterval(interval);
  }, [fetchMatches, maxCallsPerHour]);

  const filteredMatches = matches.filter(m => !disabledLeagues.includes(m.leagueId));
  const liveMatches = filteredMatches.filter(m => m.isLive);
  const upcomingMatches = filteredMatches
    .filter(m => !m.isLive && !m.matchStatus)
    .sort((a, b) => a.startTimestamp - b.startTimestamp);

  return { matches: filteredMatches, liveMatches, upcomingMatches, loading, enabled, disabledLeagues, apiProvider };
}
