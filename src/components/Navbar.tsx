import { Link, useLocation } from "react-router-dom";
import { Home, Search, Settings, Tv, Palette } from "lucide-react";
import { useTheme, ThemeType } from "@/contexts/ThemeContext";
import { useState } from "react";

const themes: { value: ThemeType; label: string; icon: string }[] = [
  { value: "dark-neon", label: "Dark Neon", icon: "🟢" },
  { value: "dark-blue", label: "Dark Blue", icon: "🔵" },
  { value: "amoled", label: "AMOLED", icon: "⚫" },
  { value: "light", label: "Light", icon: "⚪" },
];

const Navbar = () => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [showThemes, setShowThemes] = useState(false);

  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/search", icon: Search, label: "Search" },
    { to: "/admin", icon: Settings, label: "Admin" },
  ];

  return (
    <>
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/30">
        <div className="container flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center gap-2">
            <Tv className="w-6 h-6 text-primary neon-text" />
            <span className="font-display font-bold text-lg text-foreground">
              Abc<span className="text-primary">TV</span> <span className="text-primary">LIVE</span>
            </span>
          </Link>
          <div className="relative">
            <button
              onClick={() => setShowThemes(!showThemes)}
              className="p-2 rounded-lg hover:bg-secondary transition-all duration-300"
            >
              <Palette className="w-5 h-5 text-muted-foreground" />
            </button>
            {showThemes && (
              <div className="absolute right-0 top-12 glass-card neon-border p-2 min-w-[160px] z-50">
                {themes.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => { setTheme(t.value); setShowThemes(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-300 ${
                      theme === t.value
                        ? "bg-primary/20 text-primary"
                        : "hover:bg-secondary text-foreground"
                    }`}
                  >
                    <span>{t.icon}</span>
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Bottom nav - mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-card border-t border-border/30 md:hidden">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 px-4 py-2 transition-all duration-300 ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 ${active ? "neon-text" : ""}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
};

export default Navbar;
