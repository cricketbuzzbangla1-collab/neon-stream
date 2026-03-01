import React, { createContext, useContext, useState, useEffect } from "react";

export type ThemeType = "dark-neon" | "dark-blue" | "amoled" | "light";

interface ThemeContextType {
  theme: ThemeType;
  setTheme: (t: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark-neon",
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeType>(() => {
    return (localStorage.getItem("ott-theme") as ThemeType) || "dark-neon";
  });

  const setTheme = (t: ThemeType) => {
    setThemeState(t);
    localStorage.setItem("ott-theme", t);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
