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
        isLive
          ? "ring-1 ring-destructive/25 shadow-md shadow-destructive/5"
          : isFeatured
          ? "ring-1 ring-primary/25 shadow-md shadow-primary/5"
          : "ring-1 ring-border/30 shadow-sm"
      }`}
    >
      {/* Background */}
      <div className={`absolute inset-0 ${
        isLive ? "bg-gradient-to-r from-destructive/5 via-card to-destructive/5" : "bg-card"
      }`} />

      {/* Featured tag */}
      {isFeatured && (
        <div className="absolute top-0 right-0 z-10">
          <div className="bg-primary text-primary-foreground px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-bl-lg flex items-center gap-1">
            <Flame className="w-2.5 h-2.5" /> Hot
          </div>
        </div>
      )}

      <div className="relative z-[1] px-3 py-2.5">
        {/* Status + Country row */}
        <div className="flex items-center justify-between mb-2">
          {country && (
            <span className="text-[9px] text-muted-foreground font-medium flex items-center gap-1">
              <span>{country.flag}</span> {country.name}
            </span>
          )}
          {isLive ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-destructive text-destructive-foreground text-[8px] font-black uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive-foreground animate-pulse" />
              Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-bold uppercase tracking-wider">
              <Clock className="w-2.5 h-2.5" /> Soon
            </span>
          )}
        </div>

        {/* Teams row — compact */}
        <div className="flex items-center gap-2">
          {/* Team A */}
          <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden border-2 shrink-0 ${
            isLive ? "border-destructive/40" : "border-border/40"
          } bg-secondary/40`}>
            {teamALogo ? (
              <img src={teamALogo} alt={teamAName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-muted-foreground">{teamAName.charAt(0)}</span>
            )}
          </div>
          <span className="text-xs font-bold text-foreground truncate flex-1 min-w-0">{teamAName}</span>

          {/* VS */}
          <div className="flex flex-col items-center shrink-0">
            <span className={`text-[10px] font-black ${isLive ? "text-destructive" : "text-primary"}`}>VS</span>
            {status === "upcoming" && countdown() && (
              <span className="text-[8px] font-mono font-bold text-primary tabular-nums">{countdown()}</span>
            )}
            {isLive && <span className="text-[7px] font-bold text-destructive animate-pulse">ON AIR</span>}
          </div>

          {/* Team B */}
          <span className="text-xs font-bold text-foreground truncate flex-1 min-w-0 text-right">{teamBName}</span>
          <div className={`w-9 h-9 rounded-full flex items-center justify-center overflow-hidden border-2 shrink-0 ${
            isLive ? "border-destructive/40" : "border-border/40"
          } bg-secondary/40`}>
            {teamBLogo ? (
              <img src={teamBLogo} alt={teamBName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-muted-foreground">{teamBName.charAt(0)}</span>
            )}
          </div>
        </div>

        {/* Bottom: time + button */}
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/15">
          <span className="text-[9px] text-muted-foreground">
            {new Date(event.startTime).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            {" • "}
            {new Date(event.startTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/watch/event-${event.id}`); }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wide transition-all ${
              isLive
                ? "bg-destructive text-destructive-foreground hover:opacity-90"
                : "bg-primary text-primary-foreground hover:opacity-90"
            }`}
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            {isLive ? "Watch" : "Set"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveEventCard;
