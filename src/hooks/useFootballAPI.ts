import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ApiProvider = "apifootball" | "footballdata";

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

const APIFOOTBALL_BASE = "https://apiv3.apifootball.com/";
const DEFAULT_APIFOOTBALL_KEY = "10144b1b1c0934e60629f08a37064aec805f0a3b4fa6488a654ff791ef86aac7";
const FOOTBALLDATA_BASE = "https://api.football-data.org/v4";
const DEFAULT_FOOTBALLDATA_KEY = "e4df9b4f6d364f2d9950728666d9a897";

export const ALLOWED_LEAGUES: Record<string, { name: string; country: string }> = {
  "152": { name: "Premier League", country: "England" },
  "302": { name: "La Liga", country: "Spain" },
  "207": { name: "Serie A", country: "Italy" },
  "175": { name: "Bundesliga", country: "Germany" },
  "168": { name: "Ligue 1", country: "France" },
  "278": { name: "Saudi Pro League", country: "Saudi Arabia" },
  "332": { name: "Major League Soccer", country: "USA" },
  "3": { name: "UEFA Champions League", country: "Europe" },
  "4": { name: "UEFA Europa League", country: "Europe" },
  "683": { name: "UEFA Europa Conference League", country: "Europe" },
  "10": { name: "UEFA Nations League", country: "Europe" },
};

export const FOOTBALLDATA_LEAGUES: Record<string, { name: string; country: string }> = {
  "PL": { name: "Premier League", country: "England" },
  "PD": { name: "La Liga", country: "Spain" },
  "SA": { name: "Serie A", country: "Italy" },
  "BL1": { name: "Bundesliga", country: "Germany" },
  "FL1": { name: "Ligue 1", country: "France" },
  "CL": { name: "UEFA Champions League", country: "Europe" },
  "EC": { name: "European Championship", country: "Europe" },
  "WC": { name: "FIFA World Cup", country: "World" },
};

const RATE_KEY_PREFIX = "football_api_rate_hourly";

function getCurrentHour(): string {
  const d = new Date();
  return `${d.toISOString().split("T")[0]}_${d.getHours()}`;
}

function getRateKey(provider: ApiProvider): string {
  return `${RATE_KEY_PREFIX}_${provider}`;
}

function getRateInfo(provider: ApiProvider): { count: number; hour: string } {
  try {
    const raw = localStorage.getItem(getRateKey(provider));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.hour === getCurrentHour()) return parsed;
    }
  } catch {}

  return { count: 0, hour: getCurrentHour() };
}

function incrementRate(provider: ApiProvider, maxPerHour: number): boolean {
  const info = getRateInfo(provider);
  if (info.count >= maxPerHour) return false;

  localStorage.setItem(
    getRateKey(provider),
    JSON.stringify({ count: info.count + 1, hour: getCurrentHour() }),
  );

  return true;
}

interface MatchCache {
  data: FootballMatch[];
  ts: number;
  hasLive: boolean;
}

const matchCache: Record<ApiProvider, MatchCache | null> = {
  apifootball: null,
  footballdata: null,
};

function getCacheTTL(provider: ApiProvider): number {
  return matchCache[provider]?.hasLive ? 10 * 60 * 1000 : 30 * 60 * 1000;
}

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export function getMinutesUntilStart(startTs: number): number {
  return (startTs - Date.now()) / 60000;
}

function normalizeKey(value: string): string {
  return value.trim();
}

function parseApifootballMatch(m: any): FootballMatch {
  const matchDate = m.match_date || "";
  const matchTime = m.match_time || "";
  const [year, month, day] = matchDate.split("-").map(Number);
  const [hour, minute] = matchTime.split(":").map(Number);
  const startTimestamp = new Date(year, month - 1, day, hour, minute).getTime();

  return {
    id: String(m.match_id || ""),
    homeTeam: m.match_hometeam_name || "",
    awayTeam: m.match_awayteam_name || "",
    homeLogo: m.team_home_badge || "",
    awayLogo: m.team_away_badge || "",
    homeScore: m.match_hometeam_score || "",
    awayScore: m.match_awayteam_score || "",
    matchTime,
    matchDate,
    matchStatus: m.match_status || "",
    isLive: m.match_live === "1",
    league: m.league_name || "",
    leagueId: String(m.league_id || ""),
    leagueLogo: m.league_logo || "",
    country: m.country_name || "",
    stadium: m.match_stadium || "",
    round: m.match_round || "",
    startTimestamp,
  };
}

function calcLiveMinute(startTimestamp: number): string {
  const elapsed = Math.floor((Date.now() - startTimestamp) / 60000);
  if (elapsed <= 0) return "1";
  if (elapsed > 120) return "90+";
  return String(elapsed);
}

function mapFDStatus(status: string, startTimestamp: number): { displayStatus: string; isLive: boolean } {
  switch (status) {
    case "IN_PLAY":
      return { displayStatus: calcLiveMinute(startTimestamp), isLive: true };
    case "HALFTIME":
    case "PAUSED":
      return { displayStatus: "HT", isLive: true };
    case "EXTRA_TIME":
      return { displayStatus: "EXTRA_TIME", isLive: true };
    case "PENALTY_SHOOTOUT":
      return { displayStatus: "PENALTY_SHOOTOUT", isLive: true };
    case "FINISHED":
    case "AWARDED":
      return { displayStatus: "Finished", isLive: false };
    case "POSTPONED":
      return { displayStatus: "Postponed", isLive: false };
    case "CANCELLED":
      return { displayStatus: "Cancelled", isLive: false };
    case "SUSPENDED":
      return { displayStatus: "Suspended", isLive: false };
    default:
      return { displayStatus: "", isLive: false };
  }
}

function parseFootballdataMatch(m: any): FootballMatch {
  const utcDate = m.utcDate || "";
  const startTimestamp = new Date(utcDate).getTime();
  const d = new Date(utcDate);
  const matchDate = utcDate.split("T")[0] || "";
  const matchTime = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  const { displayStatus, isLive } = mapFDStatus(m.status || "", startTimestamp);
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
    matchTime,
    matchDate,
    matchStatus: displayStatus,
    isLive,
    league: m.competition?.name || "",
    leagueId: m.competition?.code || "",
    leagueLogo: m.competition?.emblem || "",
    country: m.area?.name || "",
    stadium: m.venue || "",
    round: m.matchday ? `Matchday ${m.matchday}` : "",
    startTimestamp,
  };
}

async function fetchJsonWithTimeout(url: string, options?: RequestInit, timeoutMs = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function fetchFromApifootball(apiKey: string): Promise<FootballMatch[]> {
  const today = getToday();
  const tomorrow = getTomorrow();
  const leagueIds = Object.keys(ALLOWED_LEAGUES).join(",");
  const url = `${APIFOOTBALL_BASE}?action=get_events&from=${today}&to=${tomorrow}&league_id=${leagueIds}&APIkey=${apiKey}`;

  try {
    const res = await fetchJsonWithTimeout(url);
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      console.error(`apifootball.com error ${res.status}: ${errorText}`);
      return [];
    }

    const json = await res.json();
    if (!Array.isArray(json)) {
      console.warn("apifootball.com returned non-array response", json);
      return [];
    }

    return json
      .map(parseApifootballMatch)
      .filter((m: FootballMatch) => Object.prototype.hasOwnProperty.call(ALLOWED_LEAGUES, m.leagueId))
      .filter((m: FootballMatch) => m.matchStatus !== "Finished" && m.matchStatus !== "After Pens." && m.matchStatus !== "After ET");
  } catch (err) {
    console.error("apifootball.com fetch error:", err);
    return [];
  }
}

async function fetchFromFootballdata(apiKey: string): Promise<FootballMatch[]> {
  const today = getToday();
  const tomorrow = getTomorrow();
  const targetUrl = `${FOOTBALLDATA_BASE}/matches?dateFrom=${today}&dateTo=${tomorrow}`;
  const proxyUrl = `/api/football-proxy?dateFrom=${today}&dateTo=${tomorrow}&token=${encodeURIComponent(apiKey)}`;

  try {
    let json: any = null;

    // 1) Vercel serverless proxy (production)
    try {
      const proxyRes = await fetchJsonWithTimeout(proxyUrl);
      if (proxyRes.ok) {
        json = await proxyRes.json();
        console.log("✅ football-data.org: vercel proxy success");
      }
    } catch {}

    // 2) Direct fetch
    if (!json) {
      try {
        const res = await fetchJsonWithTimeout(targetUrl, {
          headers: { "X-Auth-Token": apiKey },
          mode: "cors",
        });
        if (res.ok) {
          json = await res.json();
          console.log("✅ football-data.org: direct success");
        }
      } catch (e) {
        console.warn("football-data.org direct failed", e);
      }
    }

    // 3) thingproxy
    if (!json) {
      try {
        const res = await fetchJsonWithTimeout(`https://thingproxy.freeboard.io/fetch/${targetUrl}`, {
          headers: { "X-Auth-Token": apiKey },
        });
        if (res.ok) {
          json = await res.json();
          console.log("✅ football-data.org: thingproxy success");
        }
      } catch (e) {
        console.warn("football-data.org thingproxy failed", e);
      }
    }

    // 4) corsproxy.io
    if (!json) {
      try {
        const res = await fetchJsonWithTimeout(`https://corsproxy.io/?${encodeURIComponent(targetUrl)}`, {
          headers: { "X-Auth-Token": apiKey },
        });
        if (res.ok) {
          json = await res.json();
          console.log("✅ football-data.org: corsproxy success");
        }
      } catch (e) {
        console.warn("football-data.org corsproxy failed", e);
      }
    }

    // 5) allorigins (wraps response as JSON)
    if (!json) {
      try {
        const allOriginsUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl + `&_token=${apiKey}`)}`;
        const res = await fetchJsonWithTimeout(allOriginsUrl);
        if (res.ok) {
          json = await res.json();
          console.log("✅ football-data.org: allorigins success");
        }
      } catch (e) {
        console.warn("football-data.org allorigins failed", e);
      }
    }

    // 6) Last resort: Use apifootball.com as automatic fallback
    if (!json?.matches || !Array.isArray(json.matches)) {
      console.warn("football-data.org all methods failed, falling back to apifootball.com");
      return fetchFromApifootball(DEFAULT_APIFOOTBALL_KEY);
    }

    const allowedCodes = Object.keys(FOOTBALLDATA_LEAGUES);
    return json.matches
      .filter((m: any) => allowedCodes.includes(m.competition?.code))
      .map(parseFootballdataMatch)
      .filter((m: FootballMatch) => m.matchStatus !== "Finished" && m.matchStatus !== "Cancelled" && m.matchStatus !== "Postponed");
  } catch (err) {
    console.error("football-data.org fetch error:", err);
    // Ultimate fallback to apifootball
    return fetchFromApifootball(DEFAULT_APIFOOTBALL_KEY);
  }
}

export function useFootballMatches() {
  const [matches, setMatches] = useState<FootballMatch[]>([]);
  const [loading, setLoading] = useState(true);
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
        const nextProvider = (data.footballApiProvider || "apifootball") as ApiProvider;

        setApiKey(normalizeKey(data.footballApiKey || DEFAULT_APIFOOTBALL_KEY));
        setFootballdataKey(normalizeKey(data.footballdataApiKey || DEFAULT_FOOTBALLDATA_KEY));
        setEnabled(data.footballApiEnabled !== false);
        setApiProvider(nextProvider);
        setDisabledLeagues(Array.isArray(data.disabledLeagues) ? data.disabledLeagues : []);
        setMaxCallsPerHour(typeof data.footballApiCallsPerHour === "number" ? data.footballApiCallsPerHour : 3);

        const cached = matchCache[nextProvider];
        if (cached) {
          setMatches(cached.data);
          setLoading(false);
        }
      }
    });

    return unsub;
  }, []);

  const fetchMatches = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      setMatches([]);
      return;
    }

    const provider = apiProvider;
    const activeKey = normalizeKey(provider === "footballdata" ? footballdataKey : apiKey);
    if (!activeKey) {
      setLoading(false);
      setMatches([]);
      return;
    }

    const providerCache = matchCache[provider];
    if (providerCache && Date.now() - providerCache.ts < getCacheTTL(provider)) {
      setMatches(providerCache.data);
      setLoading(false);
      return;
    }

    if (getRateInfo(provider).count >= maxCallsPerHour) {
      console.warn(`⚠️ ${provider}: Hourly limit reached`);
      if (providerCache) setMatches(providerCache.data);
      setLoading(false);
      return;
    }

    if (!incrementRate(provider, maxCallsPerHour)) {
      if (providerCache) setMatches(providerCache.data);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const parsed = provider === "footballdata"
        ? await fetchFromFootballdata(activeKey)
        : await fetchFromApifootball(activeKey);

      parsed.sort((a, b) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        return a.startTimestamp - b.startTimestamp;
      });

      matchCache[provider] = {
        data: parsed,
        ts: Date.now(),
        hasLive: parsed.some((m) => m.isLive),
      };

      setMatches(parsed);
      console.log(`⚽ ${provider}: fetched ${parsed.length} matches (${getRateInfo(provider).count}/${maxCallsPerHour} calls/hr)`);
    } catch (err) {
      console.error("Football API error:", err);
      if (providerCache) setMatches(providerCache.data);
    } finally {
      setLoading(false);
    }
  }, [apiKey, footballdataKey, enabled, maxCallsPerHour, apiProvider]);

  useEffect(() => {
    const providerCache = matchCache[apiProvider];
    setMatches(providerCache?.data || []);
    setLoading(!providerCache);

    fetchMatches();
    const intervalMs = Math.max(5 * 60 * 1000, Math.floor(60 * 60 * 1000 / Math.max(maxCallsPerHour, 1)));
    const interval = setInterval(fetchMatches, intervalMs);

    return () => clearInterval(interval);
  }, [apiProvider, maxCallsPerHour, fetchMatches]);

  const filteredMatches = matches.filter((m) => !disabledLeagues.includes(m.leagueId));
  const liveMatches = filteredMatches.filter((m) => m.isLive);
  const upcomingMatches = filteredMatches
    .filter((m) => !m.isLive && !m.matchStatus)
    .sort((a, b) => a.startTimestamp - b.startTimestamp);

  return {
    matches: filteredMatches,
    liveMatches,
    upcomingMatches,
    loading,
    enabled,
    disabledLeagues,
    apiProvider,
  };
}
