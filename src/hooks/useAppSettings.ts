import { useState, useEffect } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface SectionSettings {
  enabled: boolean;
  lazyLoadLimit?: number;
}

export interface AppConfig {
  chatEnabled: boolean;
  postEnabled: boolean;
  pollEnabled: boolean;
  slowModeSeconds: number;
  maintenanceMode: boolean;
  allowGuestWatch: boolean;
  badWordFilterEnabled: boolean;
  // Section visibility settings
  sections?: {
    liveEvents: SectionSettings;
    footballMatches: SectionSettings;
    noticeBar: SectionSettings;
  };
}

const DEFAULT_CONFIG: AppConfig = {
  chatEnabled: true,
  postEnabled: true,
  pollEnabled: true,
  slowModeSeconds: 3,
  maintenanceMode: false,
  allowGuestWatch: true,
  badWordFilterEnabled: true,
  sections: {
    liveEvents: { enabled: true, lazyLoadLimit: 10 },
    footballMatches: { enabled: true, lazyLoadLimit: 5 },
    noticeBar: { enabled: true },
  },
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
