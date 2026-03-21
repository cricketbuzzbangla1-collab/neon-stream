import { useState, useEffect } from "react";
import { FootballMatch, getMinutesUntilStart } from "@/hooks/useFootballAPI";
import { LiveEvent, addDocument } from "@/hooks/useFirestore";
import { Flame, Play, Clock, Plus, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  match: FootballMatch;
  liveEvents?: LiveEvent[];
}

const FootballMatchCard = ({ match, liveEvents = [] }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isLive = match.isLive;
  const hasScore = match.homeScore || match.awayScore;
  const [now, setNow] = useState(Date.now());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-calculate live minute from startTimestamp
  const getLiveMinute = (): string => {
    if (!isLive) return "";
    const elapsed = Math.floor((now - match.startTimestamp) / 60000);
    if (elapsed <= 0) return "1";
    if (elapsed <= 45) return String(elapsed);
    if (elapsed <= 60) return "45+"; // HT buffer
    if (elapsed <= 105) return String(elapsed - 15); // 2nd half: subtract 15min HT
    return "90+";
  };
  const liveMinute = getLiveMinute();

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

      <div className="relative z-[1] px-4 py-3">
        {/* League header */}
        <div className="flex items-center gap-2 mb-3">
          {match.leagueLogo && (
            <img src={match.leagueLogo} alt="" className="w-4 h-4 object-contain rounded-sm" loading="lazy" />
          )}
          <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider truncate">
            {match.league}
          </span>
          {isLive && match.matchStatus && (
            <span className="ml-auto text-[10px] font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full animate-pulse">
              {match.matchStatus}'
            </span>
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center">
          <div className="flex-1 flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-secondary/60 border border-border/30 shrink-0">
              {match.homeLogo ? (
                <img src={match.homeLogo} alt={match.homeTeam} className="w-8 h-8 object-contain" loading="lazy" />
              ) : (
                <span className="text-sm font-bold text-muted-foreground">{match.homeTeam.charAt(0)}</span>
              )}
            </div>
            <span className="text-xs font-bold text-foreground truncate">{match.homeTeam}</span>
          </div>

          {/* Score / VS / Countdown */}
          <div className="flex flex-col items-center shrink-0 mx-3 min-w-[48px]">
            {hasScore ? (
              <div className={`px-3 py-1 rounded-lg ${isLive ? "bg-destructive/15" : "bg-secondary/60"}`}>
                <span className={`text-base font-black tabular-nums tracking-wider ${isLive ? "text-destructive" : "text-foreground"}`}>
                  {match.homeScore} — {match.awayScore}
                </span>
              </div>
            ) : (
              <div className="px-3 py-1.5 rounded-lg bg-secondary/60">
                <span className="text-[10px] font-black text-muted-foreground">{match.matchTime}</span>
              </div>
            )}
            {/* Countdown */}
            {countdown && (
              <div className={`mt-1 flex items-center gap-1 ${getCountdownBg()} px-2 py-0.5 rounded-full`}>
                <Clock className={`w-2.5 h-2.5 ${getCountdownColor()}`} />
                <span className={`text-[9px] font-mono font-bold tabular-nums ${getCountdownColor()}`}>{countdown}</span>
              </div>
            )}
          </div>

          <div className="flex-1 flex items-center gap-2.5 min-w-0 justify-end">
            <span className="text-xs font-bold text-foreground truncate text-right">{match.awayTeam}</span>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden bg-secondary/60 border border-border/30 shrink-0">
              {match.awayLogo ? (
                <img src={match.awayLogo} alt={match.awayTeam} className="w-8 h-8 object-contain" loading="lazy" />
              ) : (
                <span className="text-sm font-bold text-muted-foreground">{match.awayTeam.charAt(0)}</span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-border/10">
          <span className="text-[9px] text-muted-foreground/70">
            {match.matchDate}
          </span>
          {match.stadium && (
            <span className="text-[8px] text-muted-foreground/50 truncate max-w-[140px]">
              🏟 {match.stadium}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default FootballMatchCard;
