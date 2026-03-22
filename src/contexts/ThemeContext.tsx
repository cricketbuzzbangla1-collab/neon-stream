import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ThemeType = "modern-minimalist" | "dark-neon" | "dark-blue" | "amoled" | "light";

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (t: ThemeType) => void;
  isTransitioning: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark-neon",
  setTheme: () => {},
  isTransitioning: false,
});

export const useTheme = () => useContext(ThemeContext);

const VALID_THEMES: ThemeType[] = ["modern-minimalist", "dark-neon", "dark-blue", "amoled", "light"];
const isValidTheme = (t: any): t is ThemeType => VALID_THEMES.includes(t);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const stored = localStorage.getItem("ott-theme");
    return isValidTheme(stored) ? stored : "modern-minimalist";
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [adminDefault, setAdminDefault] = useState<ThemeType | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "appSettings", "main"), (snap) => {
      if (snap.exists()) {
        const dt = snap.data()?.defaultTheme;
        if (isValidTheme(dt)) setAdminDefault(dt);
      }
    }, () => {});
    return unsub;
  }, []);

  useEffect(() => {
    if (adminDefault && !localStorage.getItem("ott-theme")) {
      setThemeState(adminDefault);
      document.documentElement.setAttribute("data-theme", adminDefault);
    }
  }, [adminDefault]);

  const setTheme = useCallback((t: ThemeType) => {
    if (t === theme) return;
    setIsTransitioning(true);
    setThemeState(t);
    localStorage.setItem("ott-theme", t);
    document.documentElement.setAttribute("data-theme", t);

    try {
      import("firebase/auth").then(({ getAuth }) => {
        const currentUser = getAuth().currentUser;
        if (currentUser) {
          setDoc(doc(db, "users", currentUser.uid), { theme: t }, { merge: true }).catch(() => {});
        }
      });
    } catch {}

    setTimeout(() => setIsTransitioning(false), 300);
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  useEffect(() => {
    const loadUserTheme = async () => {
      try {
        const { getAuth } = await import("firebase/auth");
        const currentUser = getAuth().currentUser;
        if (currentUser) {
          const snap = await getDoc(doc(db, "users", currentUser.uid));
          if (snap.exists()) {
            const userTheme = snap.data()?.theme;
            if (isValidTheme(userTheme) && userTheme !== theme) {
              setThemeState(userTheme);
              localStorage.setItem("ott-theme", userTheme);
              document.documentElement.setAttribute("data-theme", userTheme);
            }
          }
        }
      } catch {}
    };
    const timer = setTimeout(loadUserTheme, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isTransitioning }}>
      {children}
    </ThemeContext.Provider>
  );
};
