import { useState, useEffect } from "react";
import { LiveEvent, useCountries } from "@/hooks/useFirestore";
import { useNavigate } from "react-router-dom";
import { Play, MapPin, Clock, Flame } from "lucide-react";

const LiveEventCard = ({ event }: { event: LiveEvent }) => {
  const navigate = useNavigate();
  const { data: countries } = useCountries();
  const country = countries.find(c => c.id === event.countryId);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const teamAName = typeof event.teamA === "object" ? (event.teamA as any)?.name || "" : String(event.teamA || "");
  const teamBName = typeof event.teamB === "object" ? (event.teamB as any)?.name || "" : String(event.teamB || "");
  const teamALogo = typeof event.teamA === "object" ? (event.teamA as any)?.logo : event.teamALogo;
  const teamBLogo = typeof event.teamB === "object" ? (event.teamB as any)?.logo : event.teamBLogo;

  const status = now < event.startTime ? "upcoming" : now <= event.endTime ? "live" : "finished";

  const countdown = () => {
    if (status !== "upcoming") return null;
    const diff = event.startTime - now;
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (d > 0) return `${d}d ${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div
      onClick={() => navigate(`/watch/event-${event.id}`)}
      className={`relative w-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.02] group ${
        event.isFeatured ? "min-h-[220px]" : "min-h-[180px]"
      }`}
      style={{
        background: event.isFeatured
          ? "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--primary) / 0.08) 50%, hsl(var(--card)) 100%)"
          : undefined,
      }}
    >
      {/* Glass card background */}
      <div className={`absolute inset-0 glass-card border-border/40 ${
        event.isFeatured ? "border-primary/30 shadow-lg shadow-primary/10 group-hover:shadow-primary/20" : "group-hover:border-border/60"
      } transition-all duration-500`} />

      {/* Featured ribbon */}
      {event.isFeatured && (
        <div className="absolute top-0 left-0 z-10">
          <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground px-4 py-1 text-[10px] font-bold uppercase tracking-widest rounded-br-xl flex items-center gap-1.5 shadow-lg">
            <Flame className="w-3 h-3" />
            Featured Match
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-[1] p-4 sm:p-5 flex flex-col h-full">
        {/* Top: Status + League */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {country && (
              <span className="text-[11px] bg-secondary/80 backdrop-blur-sm px-2.5 py-1 rounded-lg text-foreground flex items-center gap-1.5 font-medium">
                <span className="text-sm">{country.flag}</span>
                {country.name}
              </span>
            )}
          </div>

          {/* Status badge */}
          {status === "live" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/15 backdrop-blur-sm text-destructive text-[11px] font-bold uppercase tracking-wider border border-destructive/20">
              <span className="w-2 h-2 rounded-full bg-destructive animate-pulse shadow-lg shadow-destructive/50" />
              Live Now
            </span>
          )}
          {status === "upcoming" && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 backdrop-blur-sm text-primary text-[11px] font-bold uppercase tracking-wider border border-primary/20">
              <Clock className="w-3 h-3" />
              Upcoming
            </span>
          )}
          {status === "finished" && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-muted/80 backdrop-blur-sm text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
              Ended
            </span>
          )}
        </div>

        {/* Center: Teams VS */}
        <div className="flex items-center justify-between gap-2 flex-1 py-2">
          {/* Team A */}
          <div className="flex flex-col items-center gap-2.5 flex-1 min-w-0">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center overflow-hidden border-2 transition-all duration-500 ${
              status === "live" ? "border-destructive/50 shadow-lg shadow-destructive/20" : "border-border/50 group-hover:border-primary/30"
            } bg-secondary/40 backdrop-blur-sm`}>
              {teamALogo ? (
                <img src={teamALogo} alt={teamAName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl sm:text-3xl font-bold text-muted-foreground">{teamAName.charAt(0)}</span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-bold text-foreground text-center truncate w-full max-w-[100px]">{teamAName}</p>
          </div>

          {/* VS + Countdown */}
          <div className="flex flex-col items-center gap-2 shrink-0 px-2">
            <div className="relative">
              <span className="text-2xl sm:text-3xl font-display font-black text-primary neon-text">VS</span>
              {status === "live" && (
                <div className="absolute -inset-3 rounded-full bg-primary/10 blur-xl animate-pulse" />
              )}
            </div>
            {status === "upcoming" && countdown() && (
              <div className="bg-card/80 backdrop-blur-xl border border-border/40 rounded-xl px-3 py-1.5 shadow-lg">
                <span className="text-sm sm:text-base font-mono font-black text-primary tabular-nums tracking-tight">
                  {countdown()}
                </span>
              </div>
            )}
            {status === "live" && (
              <span className="text-[11px] font-black text-destructive animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                ON AIR
              </span>
            )}
          </div>

          {/* Team B */}
          <div className="flex flex-col items-center gap-2.5 flex-1 min-w-0">
            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center overflow-hidden border-2 transition-all duration-500 ${
              status === "live" ? "border-destructive/50 shadow-lg shadow-destructive/20" : "border-border/50 group-hover:border-primary/30"
            } bg-secondary/40 backdrop-blur-sm`}>
              {teamBLogo ? (
                <img src={teamBLogo} alt={teamBName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl sm:text-3xl font-bold text-muted-foreground">{teamBName.charAt(0)}</span>
              )}
            </div>
            <p className="text-xs sm:text-sm font-bold text-foreground text-center truncate w-full max-w-[100px]">{teamBName}</p>
          </div>
        </div>

        {/* Bottom: Time + Watch button */}
        <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center gap-3 text-muted-foreground min-w-0">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[11px] sm:text-xs font-medium whitespace-nowrap">
                {new Date(event.startTime).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                {" • "}
                {new Date(event.startTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            {country && (
              <div className="items-center gap-1 hidden sm:flex">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="text-[11px] font-medium">{country.name}</span>
              </div>
            )}
          </div>

          {status !== "finished" ? (
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/watch/event-${event.id}`); }}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide transition-all duration-300 shadow-lg ${
                status === "live"
                  ? "bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground shadow-destructive/30 hover:shadow-destructive/50"
                  : "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-primary/30 hover:shadow-primary/50"
              } hover:scale-105`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {status === "live" ? "Watch Live" : "Watch"}
            </button>
          ) : (
            <span className="shrink-0 text-[11px] text-muted-foreground font-medium">Match Ended</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveEventCard;
