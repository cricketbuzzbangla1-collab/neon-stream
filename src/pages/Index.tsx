import { useState, useEffect } from "react";
import { useLiveEvents } from "@/hooks/useFirestore";
import LiveEventCard, { getEventStatus } from "@/components/LiveEventCard";
import NoticeBar from "@/components/NoticeBar";
import EmptyState from "@/components/EmptyState";

const Index = () => {
  const { data: liveEvents, loading } = useLiveEvents();
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const activeEvents = liveEvents.filter(e => {
    if (!e.isActive) return false;
    return getEventStatus(e) !== "finished";
  });

  const liveNowEvents = activeEvents.filter(e => getEventStatus(e) === "live");
  const upcomingEvents = activeEvents
    .filter(e => getEventStatus(e) === "upcoming")
    .sort((a, b) => a.startTime - b.startTime);

  const hasEvents = liveNowEvents.length > 0 || upcomingEvents.length > 0;

  return (
    <div className="min-h-screen pb-20 pt-16">
      <NoticeBar />

      {loading ? (
        <div className="container py-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl skeleton-shimmer" />
          ))}
        </div>
      ) : !hasEvents ? (
        <EmptyState message="No live events right now. Check back soon!" />
      ) : (
        <div className="space-y-6 py-6">
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
        </div>
      )}
    </div>
  );
};

export default Index;
