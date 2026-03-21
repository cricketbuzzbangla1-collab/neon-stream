import { useState, useEffect, useCallback } from "react";
import {
  doc, onSnapshot, getDoc, setDoc, updateDoc, collection, getDocs,
} from "firebase/firestore";
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

// --- Rate Limiting Config ---
const MAX_CALLS_PER_DAY = 48;
const UPCOMING_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours
const LIVE_INTERVAL = 10 * 60 * 1000; // 10 minutes
const NO_LIVE_INTERVAL = 30 * 60 * 1000; // 30 min when no live matches

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

function getTodayKey(): string {
  return getToday().replace(/-/g, "");
}

// --- Firestore Cache Layer ---

const CACHE_DOC = "footballCache/matches";
const RATE_DOC_PREFIX = "footballCache/rateLimit_";

async function getRateLimit(): Promise<{ count: number; date: string }> {
  const key = getTodayKey();
  const ref = doc(db, `${RATE_DOC_PREFIX}${key}`);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as { count: number; date: string };
  }
  return { count: 0, date: getToday() };
}

async function incrementRateLimit(): Promise<boolean> {
  const key = getTodayKey();
  const ref = doc(db, `${RATE_DOC_PREFIX}${key}`);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    if ((data.count || 0) >= MAX_CALLS_PER_DAY) return false;
    await updateDoc(ref, { count: (data.count || 0) + 1 });
  } else {
    await setDoc(ref, { count: 1, date: getToday() });
  }
  return true;
}

interface CachedData {
  matches: any[];
  lastFetchUpcoming: number;
  lastFetchLive: number;
  hasLiveMatches: boolean;
  updatedAt: number;
}

async function getCachedMatches(): Promise<CachedData | null> {
  try {
    const ref = doc(db, CACHE_DOC);
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data() as CachedData;
  } catch (e) {
    console.warn("Cache read error:", e);
  }
  return null;
}

async function setCachedMatches(data: Partial<CachedData>) {
  try {
    const ref = doc(db, CACHE_DOC);
    await setDoc(ref, { ...data, updatedAt: Date.now() }, { merge: true });
  } catch (e) {
    console.warn("Cache write error:", e);
  }
}

// --- Smart Fetch Logic ---

async function smartFetchMatches(apiKey: string): Promise<FootballMatch[] | null> {
  const cached = await getCachedMatches();
  const now = Date.now();

  // Determine if we need to fetch
  const needsUpcoming = !cached || (now - (cached.lastFetchUpcoming || 0)) > UPCOMING_INTERVAL;
  const hasLive = cached?.hasLiveMatches || false;
  const liveInterval = hasLive ? LIVE_INTERVAL : NO_LIVE_INTERVAL;
  const needsLive = !cached || (now - (cached.lastFetchLive || 0)) > liveInterval;

  if (!needsUpcoming && !needsLive && cached?.matches) {
    // Return cached data - no API call needed
    return cached.matches.map(parseMatch);
  }

  // Check rate limit before calling API
  const rateLimit = await getRateLimit();
  if (rateLimit.count >= MAX_CALLS_PER_DAY) {
    console.warn(`⚠️ Football API: Daily limit reached (${rateLimit.count}/${MAX_CALLS_PER_DAY})`);
    // Return cached even if stale
    if (cached?.matches) return cached.matches.map(parseMatch);
    return null;
  }

  try {
    const today = getToday();
    const tomorrow = getTomorrow();
    const leagueIds = [...MAJOR_LEAGUE_IDS].join(",");

    const url = `${API_BASE}?action=get_events&from=${today}&to=${tomorrow}&league_id=${leagueIds}&APIkey=${apiKey}`;

    const allowed = await incrementRateLimit();
    if (!allowed) {
      console.warn("⚠️ Rate limit exceeded, using cache");
      if (cached?.matches) return cached.matches.map(parseMatch);
      return null;
    }

    const res = await fetch(url);
    const json = await res.json();

    if (Array.isArray(json)) {
      const liveExists = json.some((m: any) => m.match_live === "1");

      // Store raw data in Firestore cache
      await setCachedMatches({
        matches: json,
        lastFetchUpcoming: now,
        lastFetchLive: now,
        hasLiveMatches: liveExists,
      });

      return json
        .map(parseMatch)
        .filter(m => m.matchStatus !== "Finished" && m.matchStatus !== "After Pens." && m.matchStatus !== "After ET");
    }

    return [];
  } catch (err) {
    console.error("Football API error:", err);
    if (cached?.matches) return cached.matches.map(parseMatch);
    return null;
  }
}

// --- React Hook ---

export function useFootballMatches() {
  const [matches, setMatches] = useState<FootballMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState<string>(DEFAULT_API_KEY);
  const [enabled, setEnabled] = useState(true);

  // Listen to settings for API key / toggle
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

    const result = await smartFetchMatches(apiKey);
    if (result) {
      const filtered = result.filter(
        m => m.matchStatus !== "Finished" && m.matchStatus !== "After Pens." && m.matchStatus !== "After ET"
      );
      filtered.sort((a, b) => {
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        return `${a.matchDate} ${a.matchTime}`.localeCompare(`${b.matchDate} ${b.matchTime}`);
      });
      setMatches(filtered);
    }
    setLoading(false);
  }, [apiKey, enabled]);

  useEffect(() => {
    fetchMatches();
    // Smart interval: check every 5 min, actual API calls governed by cache timestamps
    const interval = setInterval(fetchMatches, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchMatches]);

  const liveMatches = matches.filter(m => m.isLive);
  const upcomingMatches = matches.filter(m => !m.isLive && !m.matchStatus);

  return { matches, liveMatches, upcomingMatches, loading, enabled };
}
