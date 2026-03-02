import { useState } from "react";
import { useChannels, useCategories, useCountries, useLiveEvents } from "@/hooks/useFirestore";
import ChannelCard from "@/components/ChannelCard";
import SkeletonCard from "@/components/SkeletonCard";
import EmptyState from "@/components/EmptyState";
import NoticeBar from "@/components/NoticeBar";
import LiveEventCard from "@/components/LiveEventCard";
import { ChevronRight } from "lucide-react";

const Index = () => {
  const { data: channels, loading: loadingChannels } = useChannels();
  const { data: categories, loading: loadingCats } = useCategories();
  const { data: liveEvents, loading: loadingEvents } = useLiveEvents();
  const loading = loadingChannels || loadingCats;
  const [selectedCat, setSelectedCat] = useState<string | null>(null);

  const featured = channels.filter((c) => c.isFeatured);
  const live = channels.filter((c) => c.isLive);
  const recent = [...channels].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 12);

  const activeEvents = liveEvents.filter(e => e.isActive);
  const now = Date.now();
  const liveNowEvents = activeEvents.filter(e => now >= e.startTime && now <= e.endTime);
  const upcomingEvents = activeEvents.filter(e => now < e.startTime);
  const sortedEvents = [...liveNowEvents, ...upcomingEvents].slice(0, 20);

  const filteredChannels = selectedCat
    ? channels.filter((c) => c.categoryId === selectedCat)
    : channels;

  return (
    <div className="min-h-screen pb-20 pt-16">
      <NoticeBar />

      {loading ? (
        <div className="container py-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        </div>
      ) : channels.length === 0 && sortedEvents.length === 0 ? (
        <EmptyState message="No content available yet. Admin must add channels." />
      ) : (
        <div className="space-y-8 py-6">
          {/* Live Events Slider */}
          {sortedEvents.length > 0 && (
            <section className="container">
              <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
                ⚡ Live Events
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </h2>
              <div className="flex flex-col gap-4">
                {sortedEvents.map((ev) => (
                  <LiveEventCard key={ev.id} event={ev} />
                ))}
              </div>
            </section>
          )}

          {/* Featured Slider */}
          {featured.length > 0 && (
            <section className="container">
              <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
                🔥 Featured
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
                {featured.map((ch) => (
                  <div key={ch.id} className="min-w-[280px] sm:min-w-[340px] snap-start">
                    <ChannelCard channel={ch} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Categories Filter */}
          {categories.length > 0 && (
            <section className="container">
              <h2 className="text-lg font-display font-bold text-foreground mb-4">📂 Categories</h2>
              <div className="flex gap-3 overflow-x-auto pb-4 snap-x">
                <button
                  onClick={() => setSelectedCat(null)}
                  className={`flex-shrink-0 glass-card px-4 py-2 text-sm font-medium transition-all duration-300 snap-start flex items-center gap-2 ${
                    selectedCat === null
                      ? "bg-primary text-primary-foreground neon-border"
                      : "text-foreground hover:bg-primary/10"
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCat(cat.id)}
                    className={`flex-shrink-0 glass-card px-4 py-2 text-sm font-medium transition-all duration-300 snap-start flex items-center gap-2 ${
                      selectedCat === cat.id
                        ? "bg-primary text-primary-foreground neon-border"
                        : "text-foreground hover:bg-primary/10"
                    }`}
                  >
                    <span>{cat.icon}</span>
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Filtered results */}
              {selectedCat && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-4">
                  {filteredChannels.length > 0 ? (
                    filteredChannels.map((ch) => <ChannelCard key={ch.id} channel={ch} />)
                  ) : (
                    <p className="col-span-full text-sm text-muted-foreground text-center py-8">No channels in this category</p>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Live Now */}
          {!selectedCat && live.length > 0 && (
            <Section title="🔴 Live Now">
              {live.map((ch) => <ChannelCard key={ch.id} channel={ch} />)}
            </Section>
          )}

          {/* Recently Added */}
          {!selectedCat && recent.length > 0 && (
            <Section title="🆕 Recently Added">
              {recent.map((ch) => <ChannelCard key={ch.id} channel={ch} />)}
            </Section>
          )}

          {/* All Channels */}
          {!selectedCat && channels.length > 0 && (
            <Section title="📺 All Channels">
              {channels.map((ch) => <ChannelCard key={ch.id} channel={ch} />)}
            </Section>
          )}
        </div>
      )}
    </div>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="container">
    <h2 className="text-lg font-display font-bold text-foreground mb-4 flex items-center gap-2">
      {title}
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </h2>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {children}
    </div>
  </section>
);

export default Index;
