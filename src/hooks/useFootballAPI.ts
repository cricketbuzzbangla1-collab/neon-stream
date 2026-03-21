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
  startTimestamp: number; // parsed start_time for sorting/countdown
}

const DEFAULT_API_KEY = "10144b1b1c0934e60629f08a37064aec805f0a3b4fa6488a654ff791ef86aac7";
const API_BASE = "https://apiv3.apifootball.com/";

// Allowed leagues with IDs and names
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

const ALL_LEAGUE_IDS = Object.keys(ALLOWED_LEAGUES);

// --- Rate Limiting (localStorage, per hour) ---
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

// --- Smart Cache ---
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

function parseMatchTimestamp(date: string, time: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return new Date(year, month - 1, day, hour, minute).getTime();
}

function parseMatch(m: any): FootballMatch {
  const matchDate = m.match_date || "";
  const matchTime = m.match_time || "";
  return {
    id: m.match_id,
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
    leagueId: m.league_id || "",
    leagueLogo: m.league_logo || "",
    country: m.country_name || "",
    stadium: m.match_stadium || "",
    round: m.match_round || "",
    startTimestamp: parseMatchTimestamp(matchDate, matchTime),
  };
}

function getTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

// Helper to get minutes until match starts
export function getMinutesUntilStart(startTs: number): number {
  return (startTs - Date.now()) / 60000;
}

export function useFootballMatches() {
  const [matches, setMatches] = useState<FootballMatch[]>(matchCache?.data || []);
  const [loading, setLoading] = useState(!matchCache);
  const [apiKey, setApiKey] = useState<string>(DEFAULT_API_KEY);
  const [enabled, setEnabled] = useState(true);
  const [disabledLeagues, setDisabledLeagues] = useState<string[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "appSettings", "main"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.footballApiKey) setApiKey(data.footballApiKey);
        if (data.footballApiEnabled === false) setEnabled(false);
        else setEnabled(true);
        if (Array.isArray(data.disabledLeagues)) setDisabledLeagues(data.disabledLeagues);
        else setDisabledLeagues([]);
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
    if (rateInfo.count >= MAX_CALLS_PER_DAY) {
      console.warn(`⚠️ Football API: Daily limit reached (${rateInfo.count}/${MAX_CALLS_PER_DAY})`);
      if (matchCache) setMatches(matchCache.data);
      setLoading(false);
      return;
    }

    if (!incrementRate()) {
      if (matchCache) setMatches(matchCache.data);
      setLoading(false);
      return;
    }

    try {
      const today = getToday();
      const tomorrow = getTomorrow();
      const leagueIds = ALL_LEAGUE_IDS.join(",");

      const url = `${API_BASE}?action=get_events&from=${today}&to=${tomorrow}&league_id=${leagueIds}&APIkey=${apiKey}`;
      const res = await fetch(url);
      const json = await res.json();

      if (Array.isArray(json)) {
        const parsed = json
          .map(parseMatch)
          .filter(m => m.matchStatus !== "Finished" && m.matchStatus !== "After Pens." && m.matchStatus !== "After ET");

        // Sort: live first, then by start_time ascending (soonest first)
        parsed.sort((a, b) => {
          if (a.isLive && !b.isLive) return -1;
          if (!a.isLive && b.isLive) return 1;
          return a.startTimestamp - b.startTimestamp;
        });

        const hasLive = parsed.some(m => m.isLive);
        matchCache = { data: parsed, ts: Date.now(), hasLive };
        setMatches(parsed);

        console.log(`⚽ Football API: Fetched ${parsed.length} matches (${getRateInfo().count}/${MAX_CALLS_PER_DAY} calls today)`);
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
    const interval = setInterval(fetchMatches, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  // Filter out admin-disabled leagues
  const filteredMatches = matches.filter(m => !disabledLeagues.includes(m.leagueId));

  const liveMatches = filteredMatches.filter(m => m.isLive);
  const upcomingMatches = filteredMatches
    .filter(m => !m.isLive && !m.matchStatus)
    .sort((a, b) => a.startTimestamp - b.startTimestamp);

  return { matches: filteredMatches, liveMatches, upcomingMatches, loading, enabled, disabledLeagues };
}
