import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export type ThemeType = "dark-neon" | "dark-blue" | "amoled" | "light";

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

const VALID_THEMES: ThemeType[] = ["dark-neon", "dark-blue", "amoled", "light"];
const isValidTheme = (t: any): t is ThemeType => VALID_THEMES.includes(t);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    const stored = localStorage.getItem("ott-theme");
    return isValidTheme(stored) ? stored : "dark-neon";
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [adminDefault, setAdminDefault] = useState<ThemeType | null>(null);

  // Listen to admin default theme
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "appSettings", "main"), (snap) => {
      if (snap.exists()) {
        const dt = snap.data()?.defaultTheme;
        if (isValidTheme(dt)) setAdminDefault(dt);
      }
    }, () => {});
    return unsub;
  }, []);

  // On first load: if no user preference stored, use admin default
  useEffect(() => {
    if (adminDefault && !localStorage.getItem("ott-theme")) {
      setThemeState(adminDefault);
      document.documentElement.setAttribute("data-theme", adminDefault);
    }
  }, [adminDefault]);

  const setTheme = useCallback((t: ThemeType) => {
    if (t === theme) return;
    // Trigger transition animation
    setIsTransitioning(true);
    document.documentElement.classList.add("theme-transitioning");

    setThemeState(t);
    localStorage.setItem("ott-theme", t);
    document.documentElement.setAttribute("data-theme", t);

    // Save to Firestore for logged-in users (fire and forget)
    try {
      const authModule = import("firebase/auth");
      authModule.then(({ getAuth }) => {
        const currentUser = getAuth().currentUser;
        if (currentUser) {
          setDoc(doc(db, "users", currentUser.uid), { theme: t }, { merge: true }).catch(() => {});
        }
      });
    } catch {}

    setTimeout(() => {
      setIsTransitioning(false);
      document.documentElement.classList.remove("theme-transitioning");
    }, 400);
  }, [theme]);

  // Apply theme attribute on mount
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  // Load user's saved theme from Firestore on auth change
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

    // Small delay to let auth settle
    const timer = setTimeout(loadUserTheme, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isTransitioning }}>
      {children}
    </ThemeContext.Provider>
  );
};
