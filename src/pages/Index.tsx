import { useState, useEffect, useRef, useMemo } from "react";
import { useLiveEvents, updateDocument } from "@/hooks/useFirestore";
import { useFootballMatches } from "@/hooks/useFootballAPI";
import { useAutoStreamMatcher } from "@/hooks/useAutoStreamMatcher";
import { useAppSettings } from "@/hooks/useAppSettings";
import LiveEventCard, { getEventStatus } from "@/components/LiveEventCard";
import FootballMatchCard from "@/components/FootballMatchCard";
import NoticeBar from "@/components/NoticeBar";
import EmptyState from "@/components/EmptyState";
import { Trophy, CalendarClock, ChevronDown, Clock } from "lucide-react";

const Index = () => {
  const { data: liveEvents, loading: eventsLoading } = useLiveEvents();
  const { matches: allMatches, liveMatches, upcomingMatches, recentResults, loading: footballLoading, enabled: footballEnabled } = useFootballMatches();
  const { settings } = useAppSettings();
  const [tick, setTick] = useState(Date.now());
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  // Get section configuration with fallback defaults
  const sectionConfig = useMemo(() => ({
    liveEventsEnabled: settings.sectionConfig?.liveEventsEnabled ?? true,
    upcomingEventsEnabled: settings.sectionConfig?.upcomingEventsEnabled ?? true,
    footballLiveEnabled: settings.sectionConfig?.footballLiveEnabled ?? true,
    footballUpcomingEnabled: settings.sectionConfig?.footballUpcomingEnabled ?? true,
    footballRecentResultsEnabled: settings.sectionConfig?.footballRecentResultsEnabled ?? true,
    matchCardInitialLoad: settings.sectionConfig?.matchCardInitialLoad ?? 10,
  }), [settings.sectionConfig]);

  // Auto-stream matcher — links JSON streams to API matches
  useAutoStreamMatcher(allMatches, liveEvents);

  const cleanedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const t = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-deactivate finished liveEvents
  useEffect(() => {
    liveEvents.forEach(ev => {
      if (!ev.isActive) return;
      if (cleanedRef.current.has(ev.id)) return;
      const status = getEventStatus(ev);
      if (status === "finished") {
        cleanedRef.current.add(ev.id);
        updateDocument("liveEvents", ev.id, { isActive: false }).catch(() => {});
      }
    });
  }, [liveEvents]);

  // Filter active events based on section config
  const activeEvents = useMemo(() => liveEvents.filter(e => {
    if (!e.isActive) return false;
    return getEventStatus(e) !== "finished";
  }), [liveEvents]);

  // Live events (manual) - only if enabled
  const liveNowEvents = useMemo(() => {
    if (!sectionConfig.liveEventsEnabled) return [];
    return activeEvents
      .filter(e => getEventStatus(e) === "live")
      .sort((a, b) => {
        const aHas = a.streamUrl ? 1 : 0;
        const bHas = b.streamUrl ? 1 : 0;
        if (bHas !== aHas) return bHas - aHas;
        return a.startTime - b.startTime;
      });
  }, [activeEvents, sectionConfig.liveEventsEnabled]);

  // Upcoming events (manual) - only if enabled
  const upcomingEvents = useMemo(() => {
    if (!sectionConfig.upcomingEventsEnabled) return [];
    return activeEvents
      .filter(e => getEventStatus(e) === "upcoming")
      .sort((a, b) => a.startTime - b.startTime);
  }, [activeEvents, sectionConfig.upcomingEventsEnabled]);

  // Football matches - only fetch if any section is enabled
  const shouldLoadFootball = footballEnabled && (sectionConfig.footballLiveEnabled || sectionConfig.footballUpcomingEnabled || sectionConfig.footballRecentResultsEnabled);
  
  const sortedLiveMatches = useMemo(() => {
    if (!shouldLoadFootball || !sectionConfig.footballLiveEnabled) return [];
    return [...liveMatches].sort((a, b) => a.startTimestamp - b.startTimestamp);
  }, [liveMatches, shouldLoadFootball, sectionConfig.footballLiveEnabled]);

  const sortedUpcomingMatches = useMemo(() => {
    if (!shouldLoadFootball || !sectionConfig.footballUpcomingEnabled) return [];
    return [...upcomingMatches].sort((a, b) => a.startTimestamp - b.startTimestamp);
  }, [upcomingMatches, shouldLoadFootball, sectionConfig.footballUpcomingEnabled]);

  const sortedRecentResults = useMemo(() => {
    if (!shouldLoadFootball || !sectionConfig.footballRecentResultsEnabled) return [];
    return [...recentResults].sort((a, b) => (b.finishedAt || 0) - (a.finishedAt || 0));
  }, [recentResults, shouldLoadFootball, sectionConfig.footballRecentResultsEnabled]);

  // Lazy load with configurable initial count
  const displayedUpcoming = useMemo(() => {
    return showAllUpcoming
      ? sortedUpcomingMatches
      : sortedUpcomingMatches.slice(0, sectionConfig.matchCardInitialLoad);
  }, [showAllUpcoming, sortedUpcomingMatches, sectionConfig.matchCardInitialLoad]);

  const hasMoreUpcoming = sortedUpcomingMatches.length > sectionConfig.matchCardInitialLoad;

  const hasManualEvents = liveNowEvents.length > 0 || upcomingEvents.length > 0;
  const hasFootball = shouldLoadFootball && (sortedLiveMatches.length > 0 || sortedUpcomingMatches.length > 0 || sortedRecentResults.length > 0);
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
                  <LiveEventCard key={ev.id} event={ev} now={tick} />
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
                  <LiveEventCard key={ev.id} event={ev} now={tick} />
                ))}
              </div>
            </section>
          )}

          {/* ⚽ Football API — Live Scores */}
          {sectionConfig.footballLiveEnabled && sortedLiveMatches.length > 0 && (
            <section className="container">
              <h2 className="text-lg font-display font-bold text-foreground mb-3 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-destructive" />
                <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                Live Scores
              </h2>
              <div className="flex flex-col gap-2">
                {sortedLiveMatches.slice(0, 20).map(m => (
                  <FootballMatchCard key={m.id} match={m} liveEvents={liveEvents} now={tick} />
                ))}
              </div>
            </section>
          )}

          {/* ⚽ Football API — Upcoming Matches */}
          {sectionConfig.footballUpcomingEnabled && sortedUpcomingMatches.length > 0 && (
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
                  <FootballMatchCard key={m.id} match={m} liveEvents={liveEvents} now={tick} />
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

          {/* ⚽ Football API — Recent Results */}
          {sectionConfig.footballRecentResultsEnabled && sortedRecentResults.length > 0 && (
            <section className="container">
              <h2 className="text-lg font-display font-bold text-foreground mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Recent Results
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  ({sortedRecentResults.length})
                </span>
              </h2>
              <div className="flex flex-col gap-2">
                {sortedRecentResults.slice(0, 10).map(m => (
                  <FootballMatchCard key={m.id} match={m} liveEvents={liveEvents} now={tick} />
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
