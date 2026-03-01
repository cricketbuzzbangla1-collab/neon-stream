import { useState, useEffect } from "react";
import { LiveEvent, useCountries } from "@/hooks/useFirestore";
import { useNavigate } from "react-router-dom";

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
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <button
      onClick={() => navigate(`/watch/event-${event.id}`)}
      className={`relative glass-card p-4 min-w-[280px] sm:min-w-[320px] snap-start transition-all duration-300 hover:scale-[1.03] text-left ${
        event.isFeatured ? "neon-border ring-1 ring-primary/30" : ""
      }`}
    >
      {/* Status badge */}
      <div className="absolute top-3 right-3 z-10">
        {status === "live" && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            Live
          </span>
        )}
        {status === "upcoming" && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider">
            Upcoming
          </span>
        )}
        {status === "finished" && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
            Ended
          </span>
        )}
      </div>

      {/* Country badge */}
      {country && (
        <div className="absolute top-3 left-3 z-10">
          <span className="text-xs bg-secondary/80 backdrop-blur-sm px-2 py-0.5 rounded-full text-foreground">{country.flag} {country.name}</span>
        </div>
      )}

      {/* Teams */}
      <div className="flex items-center justify-between gap-3 pt-6 pb-2">
        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <div className="w-14 h-14 rounded-full bg-secondary/50 flex items-center justify-center overflow-hidden border border-border">
            {teamALogo ? (
              <img src={teamALogo} alt={teamAName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-muted-foreground">{teamAName.charAt(0)}</span>
            )}
          </div>
          <p className="text-xs font-semibold text-foreground text-center truncate w-full">{teamAName}</p>
        </div>

        <div className="flex flex-col items-center gap-1 shrink-0">
          <span className="text-lg font-display font-black text-primary">VS</span>
          {status === "upcoming" && countdown() && (
            <span className="text-[11px] font-mono font-bold text-primary tabular-nums">{countdown()}</span>
          )}
          {status === "live" && (
            <span className="text-[11px] font-bold text-destructive animate-pulse">● NOW</span>
          )}
        </div>

        <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
          <div className="w-14 h-14 rounded-full bg-secondary/50 flex items-center justify-center overflow-hidden border border-border">
            {teamBLogo ? (
              <img src={teamBLogo} alt={teamBName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-bold text-muted-foreground">{teamBName.charAt(0)}</span>
            )}
          </div>
          <p className="text-xs font-semibold text-foreground text-center truncate w-full">{teamBName}</p>
        </div>
      </div>

      {/* Time info */}
      <div className="text-center mt-1">
        <p className="text-[10px] text-muted-foreground">
          {new Date(event.startTime).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          {" • "}
          {new Date(event.startTime).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
        </p>
      </div>
    </button>
  );
};

export default LiveEventCard;
