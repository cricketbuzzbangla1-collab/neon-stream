import { Link, useLocation } from "react-router-dom";
import { ListMusic, Heart, Settings, X } from "lucide-react";
import { useEffect, useRef } from "react";

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

const sidebarItems = [
  { to: "/my-playlist", icon: ListMusic, label: "My Playlist" },
  { to: "/favorites", icon: Heart, label: "Favorites" },
];

const AppSidebar = ({ open, onClose }: AppSidebarProps) => {
  const location = useLocation();
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close on route change
  useEffect(() => {
    onClose();
  }, [location.pathname]);

  // Close on escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar panel */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 left-0 bottom-0 z-[70] w-[280px] max-w-[80vw] bg-card border-r border-border/30 shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-border/30">
          <span className="font-display font-bold text-foreground">
            Abc<span className="text-primary">TV</span>
          </span>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-secondary transition-all">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Menu items */}
        <div className="p-3 space-y-1">
          {sidebarItems.map((item) => {
            const active = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-foreground hover:bg-secondary border border-transparent"
                }`}
              >
                <item.icon className={`w-5 h-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default AppSidebar;
