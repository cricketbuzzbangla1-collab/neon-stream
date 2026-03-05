import { useState, useEffect, useRef, useCallback } from "react";
import {
  collection, onSnapshot, query, orderBy, limit as firestoreLimit,
  addDoc, updateDoc, deleteDoc, doc, getDocs, QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Channel {
  id: string;
  name: string;
  logo: string;
  streamUrl: string;
  playerType: "hls" | "native" | "iframe" | "hls-retry" | "dash" | "external";
  categoryId: string;
  countryId: string;
  isFeatured: boolean;
  isLive: boolean;
  order: number;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  order: number;
}

export interface Country {
  id: string;
  name: string;
  code: string;
  flag: string;
  order: number;
}

export interface LiveEvent {
  id: string;
  title: string;
  teamA: string;
  teamALogo: string;
  teamB: string;
  teamBLogo: string;
  streamUrl: string;
  playerType: "hls" | "native" | "iframe" | "hls-retry" | "dash" | "external";
  startTime: number;
  endTime: number;
  countryId: string;
  isFeatured: boolean;
  isActive: boolean;
  manualStatus?: "" | "live" | "upcoming" | "finished";
  createdAt: number;
}

export interface Ad {
  id: string;
  title: string;
  adType: "banner-top" | "banner-bottom" | "in-feed" | "watch-banner" | "pre-roll" | "interstitial" | "popup" | "sticky";
  adCode: string;
  isActive: boolean;
  position: string;
  frequency: number;
  deviceTarget: "all" | "mobile" | "desktop";
  countryTarget: string;
  startDate: string;
  endDate: string;
  createdAt: number;
}

export interface AppSettings {
  telegramUrl: string;
  noticeBarEnabled: boolean;
  noticeText: string;
  noticeType: "info" | "warning" | "success";
  noticeLink: string;
  defaultTheme: string;
  adsEnabled: boolean;
  siteName: string;
  logo: string;
}

// In-memory cache with TTL
const cache = new Map<string, { data: any[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T[] | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data as T[];
  return null;
}

function setCache(key: string, data: any[]) {
  cache.set(key, { data, ts: Date.now() });
}

// Realtime collection hook (for data that needs live updates like liveEvents)
function useRealtimeCollection<T extends { id: string }>(
  collectionName: string,
  ...constraints: QueryConstraint[]
) {
  const [data, setData] = useState<T[]>(() => getCached<T>(collectionName) || []);
  const [loading, setLoading] = useState(!getCached(collectionName));

  useEffect(() => {
    const q = constraints.length > 0
      ? query(collection(db, collectionName), ...constraints)
      : query(collection(db, collectionName));

    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
      setData(items);
      setCache(collectionName, items);
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [collectionName]);

  return { data, loading };
}

// Cached one-time fetch hook (for static-ish data like categories, countries)
function useCachedCollection<T extends { id: string }>(
  collectionName: string,
  ...constraints: QueryConstraint[]
) {
  const [data, setData] = useState<T[]>(() => getCached<T>(collectionName) || []);
  const [loading, setLoading] = useState(!getCached(collectionName));
  const fetched = useRef(false);

  useEffect(() => {
    // If cached and fresh, skip fetch
    const cached = getCached<T>(collectionName);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }
    if (fetched.current) return;
    fetched.current = true;

    const q = constraints.length > 0
      ? query(collection(db, collectionName), ...constraints)
      : query(collection(db, collectionName));

    getDocs(q).then((snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
      setData(items);
      setCache(collectionName, items);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [collectionName]);

  return { data, loading };
}

// Channels: use realtime since they can change, but with limit
export function useChannels() {
  return useRealtimeCollection<Channel>("channels");
}

// Categories & Countries: mostly static, use cached fetch
export function useCategories() {
  return useCachedCollection<Category>("categories");
}

export function useCountries() {
  return useCachedCollection<Country>("countries");
}

// Live events: need realtime for status updates
export function useLiveEvents() {
  return useRealtimeCollection<LiveEvent>("liveEvents");
}

export function useAds() {
  return useCachedCollection<Ad>("ads");
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "appSettings", "main"), (snap) => {
      if (snap.exists()) {
        setSettings({ id: snap.id, ...snap.data() } as any);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return { settings, loading };
}

export async function addDocument(col: string, data: any) {
  // Invalidate cache on write
  cache.delete(col);
  return addDoc(collection(db, col), { ...data, createdAt: Date.now() });
}

export async function updateDocument(col: string, id: string, data: any) {
  cache.delete(col);
  return updateDoc(doc(db, col, id), data);
}

export async function deleteDocument(col: string, id: string) {
  cache.delete(col);
  return deleteDoc(doc(db, col, id));
}
