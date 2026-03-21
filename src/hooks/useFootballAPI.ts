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
}

const DEFAULT_API_KEY = "10144b1b1c0934e60629f08a37064aec805f0a3b4fa6488a654ff791ef86aac7";
const API_BASE = "https://apiv3.apifootball.com/";

const MAJOR_LEAGUE_IDS = new Set([
  "152", "175", "207", "302", "168", "3", "4", "683", "346", "727", "10",
]);

// --- Rate Limiting (localStorage) ---
const MAX_CALLS_PER_DAY = 48;
const RATE_KEY = "football_api_rate";

function getRateInfo(): { count: number; date: string } {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.date === getToday()) return parsed;
    }
  } catch {}
  return { count: 0, date: getToday() };
}

function incrementRate(): boolean {
  const info = getRateInfo();
  if (info.count >= MAX_CALLS_PER_DAY) return false;
  const updated = { count: info.count + 1, date: getToday() };
  localStorage.setItem(RATE_KEY, JSON.stringify(updated));
  return true;
}

// --- Smart Cache ---
interface MatchCache {
  data: FootballMatch[];
  ts: number;
  hasLive: boolean;
}

let matchCache: MatchCache | null = null;

// Dynamic TTL: shorter when live matches exist
function getCacheTTL(): number {
  if (matchCache?.hasLive) return 10 * 60 * 1000; // 10 min for live
  return 30 * 60 * 1000; // 30 min no live
}

function parseMatch(m: any): FootballMatch {
  return {
    id: m.match_id,
    homeTeam: m.match_hometeam_name || "",
    awayTeam: m.match_awayteam_name || "",
    homeLogo: m.team_home_badge || "",
    awayLogo: m.team_away_badge || "",
    homeScore: m.match_hometeam_score || "",
    awayScore: m.match_awayteam_score || "",
    matchTime: m.match_time || "",
    matchDate: m.match_date || "",
    matchStatus: m.match_status || "",
    isLive: m.match_live === "1",
    league: m.league_name || "",
    leagueId: m.league_id || "",
    leagueLogo: m.league_logo || "",
    country: m.country_name || "",
    stadium: m.match_stadium || "",
    round: m.match_round || "",
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

export function useFootballMatches() {
  const [matches, setMatches] = useState<FootballMatch[]>(matchCache?.data || []);
  const [loading, setLoading] = useState(!matchCache);
  const [apiKey, setApiKey] = useState<string>(DEFAULT_API_KEY);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "appSettings", "main"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.footballApiKey) setApiKey(data.footballApiKey);
        if (data.footballApiEnabled === false) setEnabled(false);
        else setEnabled(true);
      }
    });
    return unsub;
  }, []);

  const fetchMatches = useCallback(async () => {
    if (!enabled || !apiKey) {
      setLoading(false);
      return;
    }

    // Check cache freshness
    if (matchCache && Date.now() - matchCache.ts < getCacheTTL()) {
      setMatches(matchCache.data);
      setLoading(false);
      return;
    }

    // Check daily rate limit
    const rateInfo = getRateInfo();
    if (rateInfo.count >= MAX_CALLS_PER_DAY) {
      console.warn(`⚠️ Football API: Daily limit reached (${rateInfo.count}/${MAX_CALLS_PER_DAY})`);
      if (matchCache) {
        setMatches(matchCache.data);
      }
      setLoading(false);
      return;
    }

    // Increment rate counter
    if (!incrementRate()) {
      if (matchCache) setMatches(matchCache.data);
      setLoading(false);
      return;
    }

    try {
      const today = getToday();
      const tomorrow = getTomorrow();
      const leagueIds = [...MAJOR_LEAGUE_IDS].join(",");

      const url = `${API_BASE}?action=get_events&from=${today}&to=${tomorrow}&league_id=${leagueIds}&APIkey=${apiKey}`;
      const res = await fetch(url);
      const json = await res.json();

      if (Array.isArray(json)) {
        const parsed = json
          .map(parseMatch)
          .filter(m => m.matchStatus !== "Finished" && m.matchStatus !== "After Pens." && m.matchStatus !== "After ET");

        parsed.sort((a, b) => {
          if (a.isLive && !b.isLive) return -1;
          if (!a.isLive && b.isLive) return 1;
          return `${a.matchDate} ${a.matchTime}`.localeCompare(`${b.matchDate} ${b.matchTime}`);
        });

        const hasLive = parsed.some(m => m.isLive);
        matchCache = { data: parsed, ts: Date.now(), hasLive };
        setMatches(parsed);

        console.log(`⚽ Football API: Fetched ${parsed.length} matches (${getRateInfo().count}/${MAX_CALLS_PER_DAY} calls today, ${hasLive ? "LIVE detected → 10min refresh" : "no live → 30min refresh"})`);
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
  }, [apiKey, enabled]);

  useEffect(() => {
    fetchMatches();
    // Check every 5 min; actual API calls governed by cache TTL + rate limit
    const interval = setInterval(fetchMatches, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  const liveMatches = matches.filter(m => m.isLive);
  const upcomingMatches = matches.filter(m => !m.isLive && !m.matchStatus);

  return { matches, liveMatches, upcomingMatches, loading, enabled };
}
