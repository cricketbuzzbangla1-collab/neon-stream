import { useState, useEffect } from "react";
import { useLiveEvents } from "@/hooks/useFirestore";
import { useFootballMatches } from "@/hooks/useFootballAPI";
import LiveEventCard, { getEventStatus } from "@/components/LiveEventCard";
import FootballMatchCard from "@/components/FootballMatchCard";
import NoticeBar from "@/components/NoticeBar";
import EmptyState from "@/components/EmptyState";
import { Trophy, CalendarClock } from "lucide-react";

const Index = () => {
  const { data: liveEvents, loading: eventsLoading } = useLiveEvents();
  const { liveMatches, upcomingMatches, loading: footballLoading, enabled: footballEnabled } = useFootballMatches();
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const activeEvents = liveEvents.filter(e => {
    if (!e.isActive) return false;
    return getEventStatus(e) !== "finished";
  });

  // Live manual events — sorted by least remaining time (startTime ascending)
  const liveNowEvents = activeEvents
    .filter(e => getEventStatus(e) === "live")
    .sort((a, b) => {
      // Stream links first, then by startTime (least remaining)
      const aHas = a.streamUrl ? 1 : 0;
      const bHas = b.streamUrl ? 1 : 0;
      if (bHas !== aHas) return bHas - aHas;
      return a.startTime - b.startTime;
    });

  // Upcoming manual events — soonest first
  const upcomingEvents = activeEvents
    .filter(e => getEventStatus(e) === "upcoming")
    .sort((a, b) => a.startTime - b.startTime);

  // Combine all API matches: live first (by least remaining), then upcoming (soonest first)
  const allApiMatches = footballEnabled
    ? [...liveMatches, ...upcomingMatches].sort((a, b) => {
        // Live always first
        if (a.isLive && !b.isLive) return -1;
        if (!a.isLive && b.isLive) return 1;
        // Both same status: sort by startTimestamp ascending (least time remaining / soonest)
        return a.startTimestamp - b.startTimestamp;
      })
    : [];

  const hasManualEvents = liveNowEvents.length > 0 || upcomingEvents.length > 0;
  const hasFootball = allApiMatches.length > 0;
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
          {/* 🔴 Live Now — Manual Events (Big Matches with streams) */}
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

          {/* ⏳ Upcoming — Manual Events with countdown */}
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

          {/* ⚽ All Football Matches — Live first, then upcoming (all with countdown) */}
          {hasFootball && (
            <section className="container">
              <h2 className="text-lg font-display font-bold text-foreground mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                {allApiMatches.some(m => m.isLive) && (
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                )}
                Football Matches
              </h2>
              <div className="flex flex-col gap-2">
                {allApiMatches.slice(0, 50).map(m => (
                  <FootballMatchCard key={m.id} match={m} liveEvents={liveEvents} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default Index;
