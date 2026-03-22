import { useAppSettings, SectionConfig } from "./useAppSettings";
import { useMemo } from "react";

/**
 * Optimized hook for managing section visibility and performance settings.
 * Provides memoized section config to prevent unnecessary re-renders.
 */
export function useSectionConfig() {
  const { settings, loading } = useAppSettings();

  const config = useMemo<SectionConfig>(() => ({
    liveEventsEnabled: settings.sectionConfig?.liveEventsEnabled ?? true,
    upcomingEventsEnabled: settings.sectionConfig?.upcomingEventsEnabled ?? true,
    footballLiveEnabled: settings.sectionConfig?.footballLiveEnabled ?? true,
    footballUpcomingEnabled: settings.sectionConfig?.footballUpcomingEnabled ?? true,
    footballRecentResultsEnabled: settings.sectionConfig?.footballRecentResultsEnabled ?? true,
    matchCardInitialLoad: settings.sectionConfig?.matchCardInitialLoad ?? 10,
  }), [settings.sectionConfig]);

  return { config, loading };
}

/**
 * Get memoized visibility flags for all sections
 */
export function useSectionVisibility() {
  const { config } = useSectionConfig();

  return useMemo(() => ({
    showLiveEvents: config.liveEventsEnabled,
    showUpcomingEvents: config.upcomingEventsEnabled,
    showFootballLive: config.footballLiveEnabled,
    showFootballUpcoming: config.footballUpcomingEnabled,
    showFootballResults: config.footballRecentResultsEnabled,
    matchesPerPage: config.matchCardInitialLoad,
  }), [config]);
}
