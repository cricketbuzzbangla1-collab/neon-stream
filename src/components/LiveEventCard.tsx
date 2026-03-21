import { LiveEvent, useCountries } from "@/hooks/useFirestore";
import { useNavigate } from "react-router-dom";
import { Play, Clock, Zap } from "lucide-react";

export const getEventStatus = (event: LiveEvent): "live" | "upcoming" | "finished" => {
  const ms = event.manualStatus;
  if (ms === "live" || ms === "upcoming" || ms === "finished") return ms;
  const now = Date.now();
  if (now < event.startTime) return "upcoming";
  if (now <= event.endTime) return "live";
  return "finished";
};

const LiveEventCard = ({ event, now: externalNow }: { event: LiveEvent; now?: number }) => {
  const navigate = useNavigate();
  const { data: countries } = useCountries();
  const country = countries.find(c => c.id === event.countryId);
  const now = externalNow ?? Date.now();

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

  const getCountdown = () => {
    if (status !== "upcoming") return null;
    const diff = event.startTime - now;
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (d > 0) return { text: `${d}d ${h}h ${m}m`, short: `${d}d ${h}h` };
    if (h > 0) return { text: `${h}h ${m}m ${s}s`, short: `${h}h ${m}m` };
    return { text: `${m}m ${s}s`, short: `${m}:${s.toString().padStart(2, "0")}` };
  };

  const countdown = getCountdown();
  const isLive = status === "live";
  const isFeatured = event.isFeatured;

  return (
    <div
      onClick={() => navigate(`/watch/event-${event.id}`)}
      className={`relative w-full rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 active:scale-[0.98] group ${
        isLive
          ? "ring-1 ring-destructive/40 shadow-lg shadow-destructive/10"
          : isFeatured
          ? "ring-1 ring-primary/30 shadow-lg shadow-primary/10"
          : "ring-1 ring-border/20 shadow-sm"
      }`}
    >
      {/* Background */}
      <div className={`absolute inset-0 ${
        isLive
          ? "bg-gradient-to-br from-destructive/10 via-card to-destructive/5"
          : isFeatured
          ? "bg-gradient-to-br from-primary/10 via-card to-primary/5"
          : "bg-card"
      }`} />

      {isLive && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-destructive to-transparent animate-pulse" />
      )}

      {isFeatured && (
        <div className="absolute top-2 left-2 z-10">
          <div className="bg-primary text-primary-foreground px-2 py-0.5 text-[7px] font-bold uppercase tracking-widest rounded-full flex items-center gap-1 shadow-md">
            <Zap className="w-2.5 h-2.5 fill-current" /> Featured
          </div>
        </div>
      )}

      {/* Status badge */}
      <div className="absolute top-2 right-2 z-10">
        {isLive ? (
          <div className="bg-destructive text-destructive-foreground px-2.5 py-1 text-[8px] font-black uppercase tracking-wider rounded-full flex items-center gap-1 shadow-lg shadow-destructive/30">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive-foreground animate-pulse" />
            ON AIR
          </div>
        ) : countdown ? (
          <div className="bg-primary/15 text-primary px-2.5 py-1 text-[8px] font-bold rounded-full flex items-center gap-1 border border-primary/20">
            <Clock className="w-2.5 h-2.5" />
            {countdown.short}
          </div>
        ) : (
          <div className="bg-secondary text-muted-foreground px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> Soon
          </div>
        )}
      </div>

      <div className="relative z-[1] px-4 py-3.5">
        {country && (
          <div className="flex items-center gap-1.5 mb-3">
            <span className="text-sm">{country.flag}</span>
            <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{country.name}</span>
          </div>
        )}

        {/* Teams row */}
        <div className="flex items-center">
          <div className="flex-1 flex items-center gap-2.5 min-w-0">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden border-2 shrink-0 bg-secondary/50 ${
              isLive ? "border-destructive/30" : "border-border/30"
            }`}>
              {teamALogo ? (
                <img src={teamALogo} alt={teamAName} className="w-9 h-9 object-contain" loading="lazy" />
              ) : (
                <span className="text-base font-bold text-muted-foreground">{teamAName.charAt(0)}</span>
              )}
            </div>
            <span className="text-xs font-bold text-foreground truncate leading-tight">{teamAName}</span>
          </div>

          {/* VS / Countdown */}
          <div className="flex flex-col items-center shrink-0 mx-3 min-w-[50px]">
            <div className={`px-3 py-1.5 rounded-xl ${isLive ? "bg-destructive/15" : "bg-secondary/60"}`}>
              <span className={`text-sm font-black ${isLive ? "text-destructive" : "text-primary"}`}>VS</span>
            </div>
            {/* Countdown timer below VS */}
            {countdown && (
              <div className="mt-1.5 flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full">
                <Clock className="w-2.5 h-2.5 text-primary" />
                <span className="text-[9px] font-mono font-bold text-primary tabular-nums">
                  {countdown.text}
                </span>
              </div>
            )}
          </div>

          <div className="flex-1 flex items-center gap-2.5 min-w-0 justify-end">
            <span className="text-xs font-bold text-foreground truncate text-right leading-tight">{teamBName}</span>
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center overflow-hidden border-2 shrink-0 bg-secondary/50 ${
              isLive ? "border-destructive/30" : "border-border/30"
            }`}>
              {teamBLogo ? (
                <img src={teamBLogo} alt={teamBName} className="w-9 h-9 object-contain" loading="lazy" />
              ) : (
                <span className="text-base font-bold text-muted-foreground">{teamBName.charAt(0)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/10">
          <span className="text-[9px] text-muted-foreground/70">
            {new Date(event.startTime).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            {" • "}
            {new Date(event.startTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/watch/event-${event.id}`); }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wide transition-all shadow-md ${
              isLive
                ? "bg-destructive text-destructive-foreground shadow-destructive/20 hover:shadow-destructive/40"
                : "bg-primary text-primary-foreground shadow-primary/20 hover:shadow-primary/40"
            }`}
          >
            <Play className="w-2.5 h-2.5 fill-current" />
            {isLive ? "Watch" : "Remind"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveEventCard;
