import { useState, useEffect } from "react";
import { useLiveEvents } from "@/hooks/useFirestore";
import { useFootballMatches } from "@/hooks/useFootballAPI";
import LiveEventCard, { getEventStatus } from "@/components/LiveEventCard";
import FootballMatchCard from "@/components/FootballMatchCard";
import NoticeBar from "@/components/NoticeBar";
import EmptyState from "@/components/EmptyState";
import { Trophy, CalendarClock, ChevronDown } from "lucide-react";

const INITIAL_UPCOMING_COUNT = 10;

const Index = () => {
  const { data: liveEvents, loading: eventsLoading } = useLiveEvents();
  const { liveMatches, upcomingMatches, loading: footballLoading, enabled: footballEnabled } = useFootballMatches();
  const [, setTick] = useState(0);
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const activeEvents = liveEvents.filter(e => {
    if (!e.isActive) return false;
    return getEventStatus(e) !== "finished";
  });

  const liveNowEvents = activeEvents
    .filter(e => getEventStatus(e) === "live")
    .sort((a, b) => {
      const aHas = a.streamUrl ? 1 : 0;
      const bHas = b.streamUrl ? 1 : 0;
      if (bHas !== aHas) return bHas - aHas;
      return a.startTime - b.startTime;
    });

  const upcomingEvents = activeEvents
    .filter(e => getEventStatus(e) === "upcoming")
    .sort((a, b) => a.startTime - b.startTime);

  const sortedLiveMatches = footballEnabled
    ? [...liveMatches].sort((a, b) => a.startTimestamp - b.startTimestamp)
    : [];
  const sortedUpcomingMatches = footballEnabled
    ? [...upcomingMatches].sort((a, b) => a.startTimestamp - b.startTimestamp)
    : [];

  const displayedUpcoming = showAllUpcoming
    ? sortedUpcomingMatches
    : sortedUpcomingMatches.slice(0, INITIAL_UPCOMING_COUNT);
  const hasMoreUpcoming = sortedUpcomingMatches.length > INITIAL_UPCOMING_COUNT;

  const hasManualEvents = liveNowEvents.length > 0 || upcomingEvents.length > 0;
  const hasFootball = footballEnabled && (sortedLiveMatches.length > 0 || sortedUpcomingMatches.length > 0);
  const loading = eventsLoading || footballLoading;
  const hasAnything = hasManualEvents || hasFootball;

  return (
    <div className="min-h-screen pb-20 pt-16">
      <NoticeBar />

      {loading ? (
        <div className="container py-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl skeleton-shimmer" />
          ))}
        </div>
      ) : !hasAnything ? (
        <EmptyState message="No live events right now. Check back soon!" />
      ) : (
        <div className="space-y-6 py-6">
          {/* 🔴 Live Now — Manual Events */}
          {liveNowEvents.length > 0 && (
            <section className="container">
              <h2 className="text-lg font-display font-bold text-foreground mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                Live Now
              </h2>
              <div className="flex flex-col gap-3">
                {liveNowEvents.map(ev => (
                  <LiveEventCard key={ev.id} event={ev} />
                ))}
              </div>
            </section>
          )}

          {/* ⏳ Upcoming — Manual Events */}
          {upcomingEvents.length > 0 && (
            <section className="container">
              <h2 className="text-lg font-display font-bold text-foreground mb-3 flex items-center gap-2">
                ⏳ Upcoming
              </h2>
              <div className="flex flex-col gap-3">
                {upcomingEvents.map(ev => (
                  <LiveEventCard key={ev.id} event={ev} />
                ))}
              </div>
            </section>
          )}

          {/* ⚽ Football API — Live Scores */}
          {sortedLiveMatches.length > 0 && (
            <section className="container">
              <h2 className="text-lg font-display font-bold text-foreground mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-destructive" />
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                Live Scores
              </h2>
              <div className="flex flex-col gap-2">
                {sortedLiveMatches.slice(0, 20).map(m => (
                  <FootballMatchCard key={m.id} match={m} liveEvents={liveEvents} />
                ))}
              </div>
            </section>
          )}

          {/* ⚽ Football API — Upcoming Matches */}
          {sortedUpcomingMatches.length > 0 && (
            <section className="container">
              <h2 className="text-lg font-display font-bold text-foreground mb-3 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-primary" />
                Upcoming Matches
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  ({sortedUpcomingMatches.length})
                </span>
              </h2>
              <div className="flex flex-col gap-2">
                {displayedUpcoming.map(m => (
                  <FootballMatchCard key={m.id} match={m} liveEvents={liveEvents} />
                ))}
              </div>
              {hasMoreUpcoming && !showAllUpcoming && (
                <button
                  onClick={() => setShowAllUpcoming(true)}
                  className="w-full mt-3 py-2.5 rounded-xl bg-secondary/80 hover:bg-secondary border border-border/50 text-sm font-medium text-foreground flex items-center justify-center gap-2 transition-all duration-300"
                >
                  <ChevronDown className="w-4 h-4" />
                  See More ({sortedUpcomingMatches.length - INITIAL_UPCOMING_COUNT} more)
                </button>
              )}
              {showAllUpcoming && sortedUpcomingMatches.length > INITIAL_UPCOMING_COUNT && (
                <button
                  onClick={() => setShowAllUpcoming(false)}
                  className="w-full mt-3 py-2.5 rounded-xl bg-secondary/80 hover:bg-secondary border border-border/50 text-sm font-medium text-muted-foreground flex items-center justify-center gap-2 transition-all duration-300"
                >
                  Show Less
                </button>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default Index;
