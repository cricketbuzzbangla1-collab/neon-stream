import { useState, useEffect } from "react";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface SectionConfig {
  liveEventsEnabled: boolean;
  upcomingEventsEnabled: boolean;
  footballLiveEnabled: boolean;
  footballUpcomingEnabled: boolean;
  footballRecentResultsEnabled: boolean;
  matchCardInitialLoad: number; // Default: 10 matches
}

export interface AppConfig {
  chatEnabled: boolean;
  postEnabled: boolean;
  pollEnabled: boolean;
  slowModeSeconds: number;
  maintenanceMode: boolean;
  allowGuestWatch: boolean;
  badWordFilterEnabled: boolean;
  // Section visibility controls
  sectionConfig?: SectionConfig;
}

export const DEFAULT_SECTION_CONFIG: SectionConfig = {
  liveEventsEnabled: true,
  upcomingEventsEnabled: true,
  footballLiveEnabled: true,
  footballUpcomingEnabled: true,
  footballRecentResultsEnabled: true,
  matchCardInitialLoad: 10,
};

const DEFAULT_CONFIG: AppConfig = {
  chatEnabled: true,
  postEnabled: true,
  pollEnabled: true,
  slowModeSeconds: 3,
  maintenanceMode: false,
  allowGuestWatch: true,
  badWordFilterEnabled: true,
  sectionConfig: DEFAULT_SECTION_CONFIG,
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "appSettings", "config"), (snap) => {
      if (snap.exists()) {
        setSettings({ ...DEFAULT_CONFIG, ...snap.data() } as AppConfig);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return { settings, loading };
}

export async function updateAppSettings(data: Partial<AppConfig>) {
  await setDoc(doc(db, "appSettings", "config"), data, { merge: true });
}

export async function updateSectionConfig(data: Partial<SectionConfig>) {
  const current = await getDoc(doc(db, "appSettings", "config"));
  const currentConfig = current.exists() ? current.data()?.sectionConfig || DEFAULT_SECTION_CONFIG : DEFAULT_SECTION_CONFIG;
  await setDoc(doc(db, "appSettings", "config"), { 
    sectionConfig: { ...currentConfig, ...data } 
  }, { merge: true });
}
