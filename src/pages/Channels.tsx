import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useChannels, useCategories } from "@/hooks/useFirestore";
import ChannelCard from "@/components/ChannelCard";
import EmptyState from "@/components/EmptyState";
import { Search as SearchIcon } from "lucide-react";

const PAGE_SIZE = 20;

const Channels = () => {
  const { data: channels, loading } = useChannels();
  const { data: categories } = useCategories();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedQuery(val);
      setVisibleCount(PAGE_SIZE);
    }, 300);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const filtered = useMemo(() => {
    let result = channels;
    if (selectedCat) result = result.filter(c => c.categoryId === selectedCat);
    if (debouncedQuery) result = result.filter(c => c.name?.toLowerCase().includes(debouncedQuery.toLowerCase()));
    return result;
  }, [channels, selectedCat, debouncedQuery]);

  const visible = filtered.slice(0, visibleCount);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && visibleCount < filtered.length) {
        setVisibleCount(prev => prev + PAGE_SIZE);
      }
    }, { rootMargin: "200px" });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [visibleCount, filtered.length]);

  // Reset visible count on category change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedCat]);

  return (
    <div className="min-h-screen pb-20 pt-16 container py-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search channels..."
          value={query}
          onChange={handleChange}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
        />
      </div>

      {/* Category filter */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedCat(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !selectedCat ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-primary/10"
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                selectedCat === cat.id ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-primary/10"
              }`}
            >
              <span>{cat.icon}</span> {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Channel grid */}
      {loading ? (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-video rounded-xl skeleton-shimmer" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState message={debouncedQuery ? "No channels match your search" : "No channels available"} />
      ) : (
        <>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {visible.map(ch => <ChannelCard key={ch.id} channel={ch} compact />)}
          </div>
          {visibleCount < filtered.length && (
            <div ref={sentinelRef} className="h-8 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Channels;
