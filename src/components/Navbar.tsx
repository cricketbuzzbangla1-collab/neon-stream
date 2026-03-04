import { Link, useLocation } from "react-router-dom";
import { Home, Search, ListMusic, Palette, User, LogOut, Send } from "lucide-react";
import { useTheme, ThemeType } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
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
  const { user, profile, isAdmin, logout } = useAuth();
  const [showThemes, setShowThemes] = useState(false);
  const [showUser, setShowUser] = useState(false);

  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/search", icon: Search, label: "Search" },
    { to: "/my-playlist", icon: ListMusic, label: "My Playlist" },
  ];

  return (
    <>
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/30">
        <div className="container flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-display font-bold text-lg text-foreground">
              Abc<span className="text-primary">TV</span> <span className="text-primary">LIVE</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            {/* Telegram */}
            <a href="https://t.me/abctvlive" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-secondary transition-all">
              <Send className="w-5 h-5 text-muted-foreground" />
            </a>
            {/* Theme */}
            <div className="relative">
              <button onClick={() => { setShowThemes(!showThemes); setShowUser(false); }} className="p-2 rounded-lg hover:bg-secondary transition-all">
                <Palette className="w-5 h-5 text-muted-foreground" />
              </button>
              {showThemes && (
                <div className="absolute right-0 top-12 glass-card neon-border p-2 min-w-[160px] z-50">
                  {themes.map((t) => (
                    <button key={t.value} onClick={() => { setTheme(t.value); setShowThemes(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${theme === t.value ? "bg-primary/20 text-primary" : "hover:bg-secondary text-foreground"}`}>
                      <span>{t.icon}</span>{t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* User */}
            {user && profile ? (
              <div className="relative">
                <button onClick={() => { setShowUser(!showUser); setShowThemes(false); }} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-secondary transition-all">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">{profile.name?.charAt(0).toUpperCase()}</span>
                  </div>
                  <span className="text-sm text-foreground hidden sm:inline max-w-[80px] truncate">{profile.name}</span>
                </button>
                {showUser && (
                  <div className="absolute right-0 top-12 glass-card neon-border p-2 min-w-[160px] z-50">
                    <p className="px-3 py-1 text-xs text-muted-foreground">{profile.phone}</p>
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setShowUser(false)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary text-foreground">
                        ⚙️ Admin Panel
                      </Link>
                    )}
                    <button onClick={() => { logout(); setShowUser(false); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10">
                      <LogOut className="w-4 h-4" /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-all">
                <User className="w-4 h-4" /> Login
              </Link>
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
              <Link key={item.to} to={item.to}
                className={`flex flex-col items-center gap-1 px-4 py-2 transition-all ${active ? "text-primary" : "text-muted-foreground"}`}>
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
