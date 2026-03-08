import { useState, useEffect } from "react";
import { LiveEvent, useCountries } from "@/hooks/useFirestore";
import { useNavigate } from "react-router-dom";
import { Play, Clock, Flame, Zap } from "lucide-react";

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
      className={`relative w-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 hover:scale-[1.02] group ${
        isLive
          ? "bg-gradient-to-br from-destructive/5 via-card to-destructive/10 ring-1 ring-destructive/30 shadow-xl shadow-destructive/10"
          : isFeatured
          ? "bg-gradient-to-br from-primary/5 via-card to-primary/10 ring-1 ring-primary/30 shadow-lg shadow-primary/10"
          : "bg-card ring-1 ring-border/40 shadow-md hover:shadow-lg"
      }`}
    >
      {/* Animated glow effect for live */}
      {isLive && (
        <div className="absolute inset-0 rounded-2xl animate-pulse opacity-30 bg-gradient-to-r from-destructive/20 via-transparent to-destructive/20 pointer-events-none" />
      )}

      {/* Featured ribbon */}
      {isFeatured && (
        <div className="absolute top-0 right-0 z-10">
          <div className="bg-gradient-to-l from-primary via-primary to-accent text-primary-foreground px-4 py-1 text-[9px] font-black uppercase tracking-[0.2em] rounded-bl-2xl flex items-center gap-1.5 shadow-lg">
            <Flame className="w-3 h-3 animate-bounce" /> HOT
          </div>
        </div>
      )}

      <div className="relative z-[1] px-4 py-4 sm:px-5 sm:py-5">
        {/* Top row: country + status badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {country && (
              <span className="text-[11px] bg-secondary/80 backdrop-blur-sm px-2.5 py-1 rounded-full text-muted-foreground font-semibold flex items-center gap-1.5 border border-border/30">
                <span className="text-sm">{country.flag}</span>
                {country.name}
              </span>
            )}
          </div>

          {isLive ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-destructive/40">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive-foreground opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive-foreground" />
              </span>
              LIVE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/25">
              <Clock className="w-3 h-3" />
              Upcoming
            </span>
          )}
        </div>

        {/* Teams row */}
        <div className="flex items-center justify-between gap-2">
          {/* Team A */}
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center overflow-hidden border-[3px] shrink-0 transition-all duration-500 ${
              isLive
                ? "border-destructive/60 shadow-lg shadow-destructive/25 ring-4 ring-destructive/10"
                : "border-border/50 shadow-md"
            } bg-secondary/40 backdrop-blur-sm`}>
              {teamALogo ? (
                <img src={teamALogo} alt={teamAName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-black text-muted-foreground">{teamAName.charAt(0)}</span>
              )}
            </div>
            <span className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[80px] sm:max-w-[100px] text-center">{teamAName}</span>
          </div>

          {/* VS + Countdown */}
          <div className="flex flex-col items-center gap-1.5 shrink-0 px-3">
            <div className={`relative w-12 h-12 flex items-center justify-center rounded-full ${
              isLive
                ? "bg-gradient-to-br from-destructive/20 to-destructive/5 border-2 border-destructive/30"
                : "bg-gradient-to-br from-primary/15 to-primary/5 border-2 border-primary/20"
            }`}>
              {isLive ? (
                <Zap className="w-5 h-5 text-destructive fill-destructive animate-pulse" />
              ) : (
                <span className="text-sm font-black text-primary">VS</span>
              )}
            </div>
            {status === "upcoming" && countdown() && (
              <div className="bg-primary/10 backdrop-blur-sm border border-primary/20 px-3 py-1 rounded-full">
                <span className="text-[11px] font-mono font-bold text-primary tabular-nums">
                  {countdown()}
                </span>
              </div>
            )}
            {isLive && (
              <span className="text-[10px] font-black text-destructive tracking-wider animate-pulse">ON AIR</span>
            )}
          </div>

          {/* Team B */}
          <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
            <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center overflow-hidden border-[3px] shrink-0 transition-all duration-500 ${
              isLive
                ? "border-destructive/60 shadow-lg shadow-destructive/25 ring-4 ring-destructive/10"
                : "border-border/50 shadow-md"
            } bg-secondary/40 backdrop-blur-sm`}>
              {teamBLogo ? (
                <img src={teamBLogo} alt={teamBName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-black text-muted-foreground">{teamBName.charAt(0)}</span>
              )}
            </div>
            <span className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[80px] sm:max-w-[100px] text-center">{teamBName}</span>
          </div>
        </div>

        {/* Bottom: time + watch */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/20">
          <span className="text-[11px] text-muted-foreground font-medium">
            {new Date(event.startTime).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            {" • "}
            {new Date(event.startTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/watch/event-${event.id}`); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${
              isLive
                ? "bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground shadow-lg shadow-destructive/30 hover:shadow-xl hover:shadow-destructive/40 hover:scale-105"
                : "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105"
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isLive ? "Watch Live" : "Watch"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveEventCard;
