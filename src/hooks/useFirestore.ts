import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Channel {
  id: string;
  name: string;
  logo: string;
  streamUrl: string;
  playerType: "hls" | "native" | "iframe" | "hls-retry";
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
  channelId: string;
  startTime: number;
  endTime: number;
  thumbnail: string;
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
  notice: string;
  defaultTheme: string;
  adsEnabled: boolean;
  siteName: string;
  logo: string;
}

function useCollection<T extends { id: string }>(
  collectionName: string,
  ...constraints: QueryConstraint[]
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = constraints.length > 0
      ? query(collection(db, collectionName), ...constraints)
      : query(collection(db, collectionName));

    const unsub = onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
      setData(items);
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [collectionName]);

  return { data, loading };
}

export function useChannels() {
  return useCollection<Channel>("channels");
}

export function useCategories() {
  return useCollection<Category>("categories");
}

export function useCountries() {
  return useCollection<Country>("countries");
}

export function useLiveEvents() {
  return useCollection<LiveEvent>("liveEvents");
}

export function useAds() {
  return useCollection<Ad>("ads");
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "settings"), (snap) => {
      if (snap.docs.length > 0) {
        setSettings({ id: snap.docs[0].id, ...snap.docs[0].data() } as any);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return { settings, loading };
}

export async function addDocument(col: string, data: any) {
  return addDoc(collection(db, col), { ...data, createdAt: Date.now() });
}

export async function updateDocument(col: string, id: string, data: any) {
  return updateDoc(doc(db, col, id), data);
}

export async function deleteDocument(col: string, id: string) {
  return deleteDoc(doc(db, col, id));
}
