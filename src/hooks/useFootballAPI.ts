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

// Major league IDs
const MAJOR_LEAGUE_IDS = new Set([
  "152",  // Premier League (England)
  "175",  // Bundesliga (Germany)
  "207",  // Serie A (Italy)
  "302",  // La Liga (Spain)
  "168",  // Ligue 1 (France)
  "3",    // UEFA Champions League
  "4",    // UEFA Europa League
  "683",  // UEFA Conference League
  "346",  // CAF Champions League
  "727",  // AFC Champions League
  "10",   // AFC Champions League Elite
]);

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

let matchCache: { data: FootballMatch[]; ts: number } | null = null;
const CACHE_TTL = 60_000;

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
    if (!enabled || !apiKey) return;

    if (matchCache && Date.now() - matchCache.ts < CACHE_TTL) {
      setMatches(matchCache.data);
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
        matchCache = { data: parsed, ts: Date.now() };
        setMatches(parsed);
      } else {
        setMatches([]);
      }
    } catch (err) {
      console.error("Football API error:", err);
    } finally {
      setLoading(false);
    }
  }, [apiKey, enabled]);

  useEffect(() => {
    fetchMatches();
    const interval = setInterval(fetchMatches, 60_000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  const liveMatches = matches.filter(m => m.isLive);
  const upcomingMatches = matches.filter(m => !m.isLive && !m.matchStatus);

  return { matches, liveMatches, upcomingMatches, loading, enabled };
}
