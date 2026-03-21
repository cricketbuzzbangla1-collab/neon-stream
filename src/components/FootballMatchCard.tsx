import { FootballMatch } from "@/hooks/useFootballAPI";
import { LiveEvent } from "@/hooks/useFirestore";
import { Flame, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  match: FootballMatch;
  liveEvents?: LiveEvent[];
}

const FootballMatchCard = ({ match, liveEvents = [] }: Props) => {
  const navigate = useNavigate();
  const isLive = match.isLive;
  const hasScore = match.homeScore || match.awayScore;

  const matchingEvent = liveEvents.find(ev => {
    const evA = (typeof ev.teamA === "object" ? (ev.teamA as any)?.name : String(ev.teamA || "")).toLowerCase();
    const evB = (typeof ev.teamB === "object" ? (ev.teamB as any)?.name : String(ev.teamB || "")).toLowerCase();
    const home = match.homeTeam.toLowerCase();
    const away = match.awayTeam.toLowerCase();
    return (evA.includes(home) || home.includes(evA) || evB.includes(away) || away.includes(evB))
      && evA.length > 2 && evB.length > 2;
  });

  const handleClick = () => {
    if (matchingEvent) {
      navigate(`/watch/event-${matchingEvent.id}`);
    }
  };

  const leagueColors: Record<string, string> = {
    "Premier League": "from-purple-600/20 to-purple-900/10",
    "La Liga": "from-orange-600/20 to-orange-900/10",
    "Serie A": "from-blue-600/20 to-blue-900/10",
    "Bundesliga": "from-red-600/20 to-red-900/10",
    "Ligue 1": "from-green-600/20 to-green-900/10",
    "UEFA Champions League": "from-blue-500/20 to-indigo-900/10",
    "UEFA Europa League": "from-orange-500/20 to-amber-900/10",
  };

  const gradientClass = leagueColors[match.league] || "from-primary/10 to-card";

  return (
    <div
      onClick={handleClick}
      className={`relative w-full rounded-2xl overflow-hidden transition-all duration-300 ${
        matchingEvent ? "cursor-pointer active:scale-[0.98]" : ""
      } ${
        isLive
          ? "ring-1 ring-destructive/40 shadow-lg shadow-destructive/10"
          : "ring-1 ring-border/20 shadow-sm"
      }`}
    >
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradientClass}`} />
      <div className="absolute inset-0 bg-card/80 backdrop-blur-sm" />

      {/* Live pulse bar */}
      {isLive && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-destructive to-transparent animate-pulse" />
      )}

      {/* Watch badge */}
      {matchingEvent && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-primary text-primary-foreground px-2.5 py-1 text-[8px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1 shadow-lg shadow-primary/20">
            <Play className="w-2.5 h-2.5 fill-current" /> Watch
          </div>
        </div>
      )}

      {/* Live badge */}
      {isLive && !matchingEvent && (
        <div className="absolute top-2 right-2 z-10">
          <div className="bg-destructive text-destructive-foreground px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded-full flex items-center gap-1">
            <Flame className="w-2.5 h-2.5" /> Live
          </div>
        </div>
      )}

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
          {/* Home team */}
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

          {/* Score / VS */}
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
          </div>

          {/* Away team */}
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
