import { useState, useEffect } from "react";
import { LiveEvent, useCountries } from "@/hooks/useFirestore";
import { useNavigate } from "react-router-dom";
import { Play, Clock, Flame } from "lucide-react";

export const getEventStatus = (event: LiveEvent): "live" | "upcoming" | "finished" => {
  const ms = event.manualStatus;
  if (ms === "live" || ms === "upcoming" || ms === "finished") return ms;
  const now = Date.now();
  if (now < event.startTime) return "upcoming";
  if (now <= event.endTime) return "live";
  return "finished";
};

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

  const status = (() => {
    const ms = event.manualStatus;
    if (ms === "live" || ms === "upcoming" || ms === "finished") return ms;
    if (now < event.startTime) return "upcoming";
    if (now <= event.endTime) return "live";
    return "finished";
  })();

  const countdown = () => {
    if (status !== "upcoming") return null;
    const diff = event.startTime - now;
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const isLive = status === "live";
  const isFeatured = event.isFeatured;

  return (
    <div
      onClick={() => navigate(`/watch/event-${event.id}`)}
      className={`relative w-full rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.015] group ${
        isFeatured ? "ring-1 ring-primary/40 shadow-lg shadow-primary/10" : ""
      }`}
    >
      <div className="glass-card border-border/30 absolute inset-0 transition-all duration-300 group-hover:border-border/50" />

      {/* Featured ribbon */}
      {isFeatured && (
        <div className="absolute top-0 left-0 z-10">
          <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground px-3 py-0.5 text-[9px] font-bold uppercase tracking-widest rounded-br-lg flex items-center gap-1">
            <Flame className="w-2.5 h-2.5" /> Featured
          </div>
        </div>
      )}

      <div className="relative z-[1] px-3 py-3 sm:px-4">
        {/* Top row: country + status badge */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            {country && (
              <span className="text-[10px] bg-secondary/60 px-2 py-0.5 rounded text-muted-foreground font-medium flex items-center gap-1">
                <span className="text-xs">{country.flag}</span>
                {country.name}
              </span>
            )}
          </div>

          {/* Status badge - top right */}
          {isLive ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-destructive/15 text-destructive text-[10px] font-bold uppercase tracking-wider border border-destructive/25">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse shadow-sm shadow-destructive/50" />
              LIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20">
              <Clock className="w-2.5 h-2.5" />
              Upcoming
            </span>
          )}
        </div>

        {/* Teams row */}
        <div className="flex items-center justify-between gap-1">
          {/* Team A */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center overflow-hidden border-2 shrink-0 transition-all ${
              isLive ? "border-destructive/40 shadow-md shadow-destructive/15" : "border-border/40"
            } bg-secondary/30`}>
              {teamALogo ? (
                <img src={teamALogo} alt={teamAName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-base font-bold text-muted-foreground">{teamAName.charAt(0)}</span>
              )}
            </div>
            <span className="text-xs sm:text-sm font-bold text-foreground truncate">{teamAName}</span>
          </div>

          {/* VS + Countdown */}
          <div className="flex flex-col items-center gap-0.5 shrink-0 px-2">
            <span className={`text-base sm:text-lg font-display font-black ${isLive ? "text-destructive" : "text-primary"}`}>VS</span>
            {status === "upcoming" && countdown() && (
              <span className="text-[10px] sm:text-xs font-mono font-bold text-primary tabular-nums bg-primary/5 px-1.5 py-0.5 rounded">
                {countdown()}
              </span>
            )}
            {isLive && (
              <span className="text-[9px] font-bold text-destructive animate-pulse">ON AIR</span>
            )}
          </div>

          {/* Team B */}
          <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
            <span className="text-xs sm:text-sm font-bold text-foreground truncate text-right">{teamBName}</span>
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center overflow-hidden border-2 shrink-0 transition-all ${
              isLive ? "border-destructive/40 shadow-md shadow-destructive/15" : "border-border/40"
            } bg-secondary/30`}>
              {teamBLogo ? (
                <img src={teamBLogo} alt={teamBName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-base font-bold text-muted-foreground">{teamBName.charAt(0)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom: time + watch */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/20">
          <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">
            {new Date(event.startTime).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            {" • "}
            {new Date(event.startTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/watch/event-${event.id}`); }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wide transition-all duration-300 ${
              isLive
                ? "bg-destructive text-destructive-foreground shadow-sm shadow-destructive/30 hover:shadow-destructive/50"
                : "bg-primary text-primary-foreground shadow-sm shadow-primary/30 hover:shadow-primary/50"
            } hover:scale-105`}
          >
            <Play className="w-3 h-3 fill-current" />
            {isLive ? "Watch Live" : "Watch"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveEventCard;
