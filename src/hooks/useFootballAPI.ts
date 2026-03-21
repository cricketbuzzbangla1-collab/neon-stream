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

const API_BASE = "https://api.football-data.org/v4";

// football-data.org competition codes (free tier)
export const ALLOWED_LEAGUES: Record<string, { name: string; country: string; code: string }> = {
  "PL":  { name: "Premier League", country: "England", code: "PL" },
  "PD":  { name: "La Liga", country: "Spain", code: "PD" },
  "SA":  { name: "Serie A", country: "Italy", code: "SA" },
  "BL1": { name: "Bundesliga", country: "Germany", code: "BL1" },
  "FL1": { name: "Ligue 1", country: "France", code: "FL1" },
  "CL":  { name: "UEFA Champions League", country: "Europe", code: "CL" },
  "EC":  { name: "European Championship", country: "Europe", code: "EC" },
  "WC":  { name: "FIFA World Cup", country: "World", code: "WC" },
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

function incrementRate(maxPerHour: number): boolean {
  const info = getRateInfo();
  if (info.count >= maxPerHour) return false;
  localStorage.setItem(RATE_KEY, JSON.stringify({ count: info.count + 1, hour: getCurrentHour() }));
  return true;
}

// --- Cache ---
interface MatchCache {
  data: FootballMatch[];
  ts: number;
  hasLive: boolean;
}

let matchCache: MatchCache | null = null;

function getCacheTTL(): number {
  if (matchCache?.hasLive) return 10 * 60 * 1000;
  return 30 * 60 * 1000;
}

// Map football-data.org status to display status
function mapStatus(status: string): { displayStatus: string; isLive: boolean } {
  switch (status) {
    case "IN_PLAY":
    case "HALFTIME":
    case "EXTRA_TIME":
    case "PENALTY_SHOOTOUT":
      return { displayStatus: status === "HALFTIME" ? "HT" : status === "IN_PLAY" ? "LIVE" : status, isLive: true };
    case "PAUSED":
      return { displayStatus: "HT", isLive: true };
    case "FINISHED":
    case "AWARDED":
      return { displayStatus: "Finished", isLive: false };
    case "TIMED":
    case "SCHEDULED":
      return { displayStatus: "", isLive: false };
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

function parseMatch(m: any): FootballMatch {
  const utcDate = m.utcDate || "";
  const startTs = new Date(utcDate).getTime();
  const matchDate = utcDate.split("T")[0] || "";
  const d = new Date(utcDate);
  const matchTime = `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;

  const { displayStatus, isLive } = mapStatus(m.status || "");
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
    startTimestamp: startTs,
  };
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

export function useFootballMatches() {
  const [matches, setMatches] = useState<FootballMatch[]>(matchCache?.data || []);
  const [loading, setLoading] = useState(!matchCache);
  const [apiKey, setApiKey] = useState<string>("");
  const [enabled, setEnabled] = useState(true);
  const [disabledLeagues, setDisabledLeagues] = useState<string[]>([]);
  const [maxCallsPerHour, setMaxCallsPerHour] = useState(3);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "appSettings", "main"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.footballApiKey) setApiKey(data.footballApiKey);
        if (data.footballApiEnabled === false) setEnabled(false);
        else setEnabled(true);
        if (Array.isArray(data.disabledLeagues)) setDisabledLeagues(data.disabledLeagues);
        else setDisabledLeagues([]);
        if (typeof data.footballApiCallsPerHour === "number") setMaxCallsPerHour(data.footballApiCallsPerHour);
      }
    });
    return unsub;
  }, []);

  const fetchMatches = useCallback(async () => {
    if (!enabled || !apiKey) {
      setLoading(false);
      return;
    }

    if (matchCache && Date.now() - matchCache.ts < getCacheTTL()) {
      setMatches(matchCache.data);
      setLoading(false);
      return;
    }

    const rateInfo = getRateInfo();
    if (rateInfo.count >= maxCallsPerHour) {
      console.warn(`⚠️ Football API: Hourly limit reached (${rateInfo.count}/${maxCallsPerHour})`);
      if (matchCache) setMatches(matchCache.data);
      setLoading(false);
      return;
    }

    if (!incrementRate(maxCallsPerHour)) {
      if (matchCache) setMatches(matchCache.data);
      setLoading(false);
      return;
    }

    try {
      const today = getToday();
      const tomorrow = getTomorrow();

      const url = `${API_BASE}/matches?dateFrom=${today}&dateTo=${tomorrow}`;
      const res = await fetch(url, {
        headers: { "X-Auth-Token": apiKey },
      });

      if (!res.ok) {
        console.error(`Football API error: ${res.status} ${res.statusText}`);
        if (matchCache) setMatches(matchCache.data);
        setLoading(false);
        return;
      }

      const json = await res.json();

      if (json.matches && Array.isArray(json.matches)) {
        // Filter only allowed competitions
        const allowedCodes = Object.keys(ALLOWED_LEAGUES);
        const parsed = json.matches
          .filter((m: any) => allowedCodes.includes(m.competition?.code))
          .map(parseMatch)
          .filter((m: FootballMatch) => m.matchStatus !== "Finished" && m.matchStatus !== "Cancelled" && m.matchStatus !== "Postponed");

        parsed.sort((a: FootballMatch, b: FootballMatch) => {
          if (a.isLive && !b.isLive) return -1;
          if (!a.isLive && b.isLive) return 1;
          return a.startTimestamp - b.startTimestamp;
        });

        const hasLive = parsed.some((m: FootballMatch) => m.isLive);
        matchCache = { data: parsed, ts: Date.now(), hasLive };
        setMatches(parsed);

        console.log(`⚽ Football API (football-data.org): Fetched ${parsed.length} matches (${getRateInfo().count}/${maxCallsPerHour} calls this hour)`);
      } else {
        matchCache = { data: [], ts: Date.now(), hasLive: false };
        setMatches([]);
      }
    } catch (err) {
      console.error("Football API error:", err);
      if (matchCache) setMatches(matchCache.data);
    } finally {
      setLoading(false);
    }
  }, [apiKey, enabled, maxCallsPerHour]);

  useEffect(() => {
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

  return { matches: filteredMatches, liveMatches, upcomingMatches, loading, enabled, disabledLeagues };
}
