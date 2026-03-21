import { Link, useLocation } from "react-router-dom";
import { Home, Tv, MessageCircle, Palette, User, LogOut, Send, Menu, Film } from "lucide-react";
import { useTheme, ThemeType } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/hooks/useFirestore";
import { useState } from "react";
import AppSidebar from "@/components/AppSidebar";

const themes: { value: ThemeType; label: string; icon: string }[] = [
  { value: "dark-neon", label: "Neon Dark", icon: "🟢" },
  { value: "light", label: "Light", icon: "⚪" },
];

const Navbar = () => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { user, profile, isAdmin, logout } = useAuth();
  const { settings } = useSettings();
  const [showThemes, setShowThemes] = useState(false);
  const [showUser, setShowUser] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const telegramUrl = (settings as any)?.telegramUrl || "https://t.me/abctvlive";

  const navItems = [
    { to: "/", icon: Home, label: "Home" },
    { to: "/channels", icon: Tv, label: "Channels" },
    { to: "/movies", icon: Film, label: "Movies" },
    { to: "/chat", icon: MessageCircle, label: "Community" },
  ];

  return (
    <>
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-b border-border/30">
        <div className="container flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-secondary transition-all">
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <span className="font-display font-bold text-lg text-foreground">
                Abc<span className="text-primary">TV</span> <span className="text-primary">LIVE</span>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-1">
            {/* Telegram */}
            <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-secondary transition-all" title="Telegram">
              <Send className="w-5 h-5 text-primary" />
            </a>
            {/* Theme */}
            <div className="relative">
              <button onClick={() => { setShowThemes(!showThemes); setShowUser(false); }} className="p-2 rounded-lg hover:bg-secondary transition-all">
                <Palette className="w-5 h-5 text-muted-foreground" />
              </button>
              {showThemes && (
                <div className="absolute right-0 top-12 bg-card border border-border rounded-xl p-2 min-w-[150px] z-50 shadow-lg">
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
                </button>
                {showUser && (
                  <div className="absolute right-0 top-12 bg-card border border-border rounded-xl p-2 min-w-[150px] z-50 shadow-lg">
                    <p className="px-3 py-1 text-xs text-muted-foreground">{profile.name}</p>
                    {isAdmin && (
                      <Link to="/admin" onClick={() => setShowUser(false)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-secondary text-foreground">
                        ⚙️ Admin
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

      {/* Sidebar */}
      <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-sm border-t border-border/30">
        <div className="flex items-center justify-around h-14">
          {navItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link key={item.to} to={item.to}
                className={`flex flex-col items-center gap-0.5 px-4 py-2 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                <item.icon className="w-5 h-5" />
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
