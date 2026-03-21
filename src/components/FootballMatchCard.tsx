import { useState } from "react";
import { FootballMatch, getMinutesUntilStart } from "@/hooks/useFootballAPI";
import { LiveEvent, addDocument } from "@/hooks/useFirestore";
import { Flame, Play, Clock, Plus, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  match: FootballMatch;
  liveEvents?: LiveEvent[];
  now?: number;
}

const FootballMatchCard = ({ match, liveEvents = [], now: externalNow }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLive = match.isLive;
  const hasScore = match.homeScore || match.awayScore;
  const now = externalNow ?? Date.now();
  const [importing, setImporting] = useState(false);

  // Use real match minute from API (matchStatus contains minute like "45+", "67", "HT")
  const liveMinute = isLive && match.matchStatus ? match.matchStatus : "";

  const matchingEvent = liveEvents.find(ev => {
    const evA = (typeof ev.teamA === "object" ? (ev.teamA as any)?.name : String(ev.teamA || "")).toLowerCase();
    const evB = (typeof ev.teamB === "object" ? (ev.teamB as any)?.name : String(ev.teamB || "")).toLowerCase();
    const home = match.homeTeam.toLowerCase();
    const away = match.awayTeam.toLowerCase();
    return (evA.includes(home) || home.includes(evA) || evB.includes(away) || away.includes(evB))
      && evA.length > 2 && evB.length > 2;
  });

  // Countdown logic using startTimestamp
  const getCountdown = () => {
    if (isLive) return null;
    const diff = match.startTimestamp - now;
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const countdown = getCountdown();
  const minutesUntil = getMinutesUntilStart(match.startTimestamp);
  const isStartingSoon = !isLive && minutesUntil > 0 && minutesUntil <= 30;
  const isKickoffImminent = !isLive && minutesUntil > 0 && minutesUntil <= 10;

  // Dynamic countdown color
  const getCountdownColor = () => {
    if (minutesUntil <= 10) return "text-destructive";
    if (minutesUntil <= 30) return "text-yellow-500";
    return "text-primary";
  };

  const getCountdownBg = () => {
    if (minutesUntil <= 10) return "bg-destructive/15";
    if (minutesUntil <= 30) return "bg-yellow-500/15";
    return "bg-primary/10";
  };

  const handleClick = () => {
    if (matchingEvent) {
      navigate(`/watch/event-${matchingEvent.id}`);
    }
  };

  const handleImport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (importing) return;
    setImporting(true);
    try {
      const startTime = match.startTimestamp;
      const endTime = startTime + 2 * 3600000;

      await addDocument("liveEvents", {
        title: `${match.homeTeam} vs ${match.awayTeam}`,
        teamA: match.homeTeam,
        teamALogo: match.homeLogo,
        teamB: match.awayTeam,
        teamBLogo: match.awayLogo,
        streamUrl: "",
        playerType: "hls",
        startTime,
        endTime,
        countryId: "",
        isFeatured: true,
        isActive: true,
        manualStatus: "",
        league: match.league,
        leagueLogo: match.leagueLogo,
      });
      toast.success(`${match.homeTeam} vs ${match.awayTeam} added to Live Events!`);
    } catch {
      toast.error("Failed to import");
    } finally {
      setImporting(false);
    }
  };

  const isAdmin = user?.role === "admin";

  const leagueColors: Record<string, string> = {
    "Premier League": "from-purple-600/20 to-purple-900/10",
    "La Liga": "from-orange-600/20 to-orange-900/10",
    "Serie A": "from-blue-600/20 to-blue-900/10",
    "Bundesliga": "from-red-600/20 to-red-900/10",
    "Ligue 1": "from-green-600/20 to-green-900/10",
    "UEFA Champions League": "from-blue-500/20 to-indigo-900/10",
    "UEFA Europa League": "from-orange-500/20 to-amber-900/10",
    "UEFA Europa Conference League": "from-emerald-500/20 to-emerald-900/10",
    "UEFA Nations League": "from-sky-500/20 to-sky-900/10",
    "Saudi Pro League": "from-green-500/20 to-green-900/10",
    "Major League Soccer": "from-blue-400/20 to-blue-900/10",
  };

  const gradientClass = leagueColors[match.league] || "from-primary/10 to-card";

  return (
    <div
      onClick={handleClick}
      className={`relative w-full rounded-2xl overflow-hidden transition-all duration-300 ${
        matchingEvent ? "cursor-pointer active:scale-[0.98]" : ""
      } ${
        isKickoffImminent
          ? "ring-2 ring-destructive/60 shadow-lg shadow-destructive/20 animate-pulse"
          : isLive
          ? "ring-1 ring-destructive/40 shadow-lg shadow-destructive/10"
          : isStartingSoon
          ? "ring-1 ring-yellow-500/40 shadow-md shadow-yellow-500/10"
          : "ring-1 ring-border/20 shadow-sm"
      }`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass}`} />
      <div className="absolute inset-0 bg-card/80 backdrop-blur-sm" />

      {isLive && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-destructive to-transparent animate-pulse" />
      )}
      {isKickoffImminent && !isLive && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500 to-transparent animate-pulse" />
      )}

      {/* Top-right badges */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
        {isAdmin && !matchingEvent && (
          <button
            onClick={handleImport}
            disabled={importing}
            className="bg-primary text-primary-foreground px-2 py-1 text-[8px] font-bold rounded-full flex items-center gap-0.5 shadow-md hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Plus className="w-2.5 h-2.5" /> {importing ? "..." : "Add"}
          </button>
        )}
        {matchingEvent && (
          <div className="bg-primary text-primary-foreground px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1 shadow-lg shadow-primary/20">
            <Play className="w-2.5 h-2.5 fill-current" /> Watch
          </div>
        )}
        {isKickoffImminent && !isLive && (
          <div className="bg-destructive text-destructive-foreground px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1 animate-pulse">
            <AlertTriangle className="w-2.5 h-2.5" /> Kickoff!
          </div>
        )}
        {isStartingSoon && !isKickoffImminent && !isLive && (
          <div className="bg-yellow-500 text-black px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
            🔥 Soon
          </div>
        )}
        {isLive && !matchingEvent && (
          <div className="bg-destructive text-destructive-foreground px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
            <Flame className="w-2.5 h-2.5" /> Live
          </div>
        )}
      </div>

      <div className="relative z-[1] px-3 py-2">
        {/* League header */}
        <div className="flex items-center gap-1.5 mb-2">
          {match.leagueLogo && (
            <img src={match.leagueLogo} alt="" className="w-3.5 h-3.5 object-contain rounded-sm" loading="lazy" />
          )}
          <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider truncate">
            {match.league}
          </span>
        </div>

        {/* Teams */}
        <div className="flex items-center">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden bg-secondary/60 border border-border/30 shrink-0">
              {match.homeLogo ? (
                <img src={match.homeLogo} alt={match.homeTeam} className="w-6 h-6 object-contain" loading="lazy" />
              ) : (
                <span className="text-[10px] font-bold text-muted-foreground">{match.homeTeam.charAt(0)}</span>
              )}
            </div>
            <span className="text-[10px] font-bold text-foreground truncate leading-tight">{match.homeTeam}</span>
          </div>

          {/* Center: Score + Live Minute / Match Time */}
          <div className="flex flex-col items-center shrink-0 mx-2 min-w-[50px]">
            {isLive ? (
              <>
                <div className="flex items-center gap-1 bg-destructive/20 border border-destructive/40 px-1.5 py-0.5 rounded-full mb-0.5">
                  <span className="w-1 h-1 rounded-full bg-destructive animate-pulse" />
                  <span className="text-[8px] font-mono font-black tabular-nums text-destructive">
                    {liveMinute ? `${liveMinute}'` : "LIVE"}
                  </span>
                </div>
                {hasScore && (
                  <div className="bg-destructive/15 border border-destructive/30 px-2.5 py-1 rounded-lg">
                    <span className="text-base font-black tabular-nums tracking-widest text-destructive">
                      {match.homeScore} - {match.awayScore}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="bg-secondary/80 border border-border/40 px-2.5 py-1 rounded-lg">
                  <span className="text-xs font-black tabular-nums text-foreground tracking-wide">
                    {match.matchTime}
                  </span>
                </div>
                {countdown && (
                  <div className={`mt-1 flex items-center gap-0.5 ${getCountdownBg()} border ${minutesUntil <= 10 ? "border-destructive/30" : minutesUntil <= 30 ? "border-yellow-500/30" : "border-primary/20"} px-1.5 py-0.5 rounded-full`}>
                    <Clock className={`w-2 h-2 ${getCountdownColor()}`} />
                    <span className={`text-[8px] font-mono font-bold tabular-nums ${getCountdownColor()}`}>{countdown}</span>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex-1 flex items-center gap-2 min-w-0 justify-end">
            <span className="text-[10px] font-bold text-foreground truncate text-right leading-tight">{match.awayTeam}</span>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden bg-secondary/60 border border-border/30 shrink-0">
              {match.awayLogo ? (
                <img src={match.awayLogo} alt={match.awayTeam} className="w-6 h-6 object-contain" loading="lazy" />
              ) : (
                <span className="text-[10px] font-bold text-muted-foreground">{match.awayTeam.charAt(0)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-border/10">
          <span className="text-[8px] text-muted-foreground/70">
            {match.matchDate}
          </span>
          {match.stadium && (
            <span className="text-[7px] text-muted-foreground/50 truncate max-w-[120px]">
              🏟 {match.stadium}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default FootballMatchCard;
