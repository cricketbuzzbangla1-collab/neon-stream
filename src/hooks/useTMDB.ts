import { useState, useEffect, useCallback } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG = "https://image.tmdb.org/t/p";

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  popularity: number;
  original_language: string;
}

export interface TMDBMovieDetail extends TMDBMovie {
  runtime: number;
  genres: { id: number; name: string }[];
  tagline: string;
  status: string;
  budget: number;
  revenue: number;
  videos?: { results: { key: string; site: string; type: string; name: string }[] };
}

export const getImageUrl = (path: string | null, size: string = "w500") =>
  path ? `${TMDB_IMG}/${size}${path}` : null;

export const GENRE_MAP: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
  878: "Sci-Fi", 10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
};

async function tmdbFetch(endpoint: string, apiKey: string, params: Record<string, string> = {}) {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("language", "en-US");
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB API error: ${res.status}`);
  return res.json();
}

export function useTMDBSettings() {
  const [apiKey, setApiKey] = useState("");
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "appSettings", "main"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setApiKey(data.tmdbApiKey || "ea17f4c1fca3ed86e12ac87d94bf0fbb");
        setEnabled(data.tmdbEnabled !== false);
      }
    });
    return unsub;
  }, []);

  return { apiKey, enabled };
}

export function useTMDBMovies() {
  const { apiKey, enabled } = useTMDBSettings();
  const [trending, setTrending] = useState<TMDBMovie[]>([]);
  const [popular, setPopular] = useState<TMDBMovie[]>([]);
  const [nowPlaying, setNowPlaying] = useState<TMDBMovie[]>([]);
  const [topRated, setTopRated] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled || !apiKey) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      tmdbFetch("/trending/movie/week", apiKey),
      tmdbFetch("/movie/popular", apiKey),
      tmdbFetch("/movie/now_playing", apiKey),
      tmdbFetch("/movie/top_rated", apiKey),
    ]).then(([t, p, n, r]) => {
      setTrending(t.results || []);
      setPopular(p.results || []);
      setNowPlaying(n.results || []);
      setTopRated(r.results || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [apiKey, enabled]);

  return { trending, popular, nowPlaying, topRated, loading, enabled };
}

export function useTMDBSearch(query: string) {
  const { apiKey } = useTMDBSettings();
  const [results, setResults] = useState<TMDBMovie[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim() || !apiKey) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(() => {
      tmdbFetch("/search/movie", apiKey, { query }).then(d => setResults(d.results || [])).catch(console.error).finally(() => setLoading(false));
    }, 400);
    return () => clearTimeout(t);
  }, [query, apiKey]);

  return { results, loading };
}

export function useTMDBMovieDetail(movieId: number | null) {
  const { apiKey } = useTMDBSettings();
  const [movie, setMovie] = useState<TMDBMovieDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!movieId || !apiKey) return;
    setLoading(true);
    tmdbFetch(`/movie/${movieId}`, apiKey, { append_to_response: "videos" })
      .then(setMovie).catch(console.error).finally(() => setLoading(false));
  }, [movieId, apiKey]);

  return { movie, loading };
}
