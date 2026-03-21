import { FootballMatch } from "@/hooks/useFootballAPI";
import { Flame, Tv } from "lucide-react";

const FootballMatchCard = ({ match }: { match: FootballMatch }) => {
  const isLive = match.isLive;
  const hasScore = match.homeScore || match.awayScore;

  return (
    <div className={`relative w-full rounded-xl overflow-hidden transition-all duration-300 ${
      isLive
        ? "ring-1 ring-destructive/30 shadow-md shadow-destructive/5"
        : "ring-1 ring-border/30 shadow-sm"
    } bg-card`}>
      {/* Live badge */}
      {isLive && (
        <div className="absolute top-0 right-0 z-10">
          <div className="bg-destructive text-destructive-foreground px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest rounded-bl-lg flex items-center gap-1">
            <Flame className="w-2.5 h-2.5" /> Live
          </div>
        </div>
      )}

      <div className="px-3 py-2.5">
        {/* League + Country */}
        <div className="flex items-center gap-1.5 mb-2">
          {match.leagueLogo && (
            <img src={match.leagueLogo} alt="" className="w-3.5 h-3.5 object-contain" loading="lazy" />
          )}
          <span className="text-[9px] text-muted-foreground font-medium truncate">
            {match.country} • {match.league}
          </span>
          {match.round && (
            <span className="text-[8px] text-muted-foreground/60 ml-auto shrink-0">R{match.round}</span>
          )}
        </div>

        {/* Teams row */}
        <div className="flex items-center gap-2">
          {/* Home */}
          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-border/40 bg-secondary/40 shrink-0">
            {match.homeLogo ? (
              <img src={match.homeLogo} alt={match.homeTeam} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <span className="text-xs font-bold text-muted-foreground">{match.homeTeam.charAt(0)}</span>
            )}
          </div>
          <span className="text-[11px] font-bold text-foreground truncate flex-1 min-w-0">{match.homeTeam}</span>

          {/* Score / VS */}
          <div className="flex flex-col items-center shrink-0 min-w-[40px]">
            {hasScore ? (
              <span className={`text-sm font-black tabular-nums ${isLive ? "text-destructive" : "text-foreground"}`}>
                {match.homeScore} - {match.awayScore}
              </span>
            ) : (
              <span className="text-[10px] font-black text-primary">VS</span>
            )}
            {isLive && match.matchStatus && (
              <span className="text-[7px] font-bold text-destructive animate-pulse">{match.matchStatus}'</span>
            )}
          </div>

          {/* Away */}
          <span className="text-[11px] font-bold text-foreground truncate flex-1 min-w-0 text-right">{match.awayTeam}</span>
          <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border border-border/40 bg-secondary/40 shrink-0">
            {match.awayLogo ? (
              <img src={match.awayLogo} alt={match.awayTeam} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <span className="text-xs font-bold text-muted-foreground">{match.awayTeam.charAt(0)}</span>
            )}
          </div>
        </div>

        {/* Bottom info */}
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-border/15">
          <span className="text-[9px] text-muted-foreground">
            {match.matchDate} • {match.matchTime}
          </span>
          {match.stadium && (
            <span className="text-[8px] text-muted-foreground/60 truncate max-w-[120px]">
              🏟 {match.stadium}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default FootballMatchCard;
