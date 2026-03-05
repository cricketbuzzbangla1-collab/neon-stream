import { useState, useEffect, useCallback, useRef } from "react";
import { useChannels } from "@/hooks/useFirestore";
import ChannelCard from "@/components/ChannelCard";
import EmptyState from "@/components/EmptyState";
import { Search as SearchIcon } from "lucide-react";

const Search = () => {
  const { data: channels } = useChannels();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // Debounce search input by 300ms
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(val), 300);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const filtered = debouncedQuery
    ? channels.filter((c) => c.name?.toLowerCase().includes(debouncedQuery.toLowerCase()))
    : channels;

  return (
    <div className="min-h-screen pt-16 pb-20 container py-6 space-y-6">
      <div className="relative">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search channels..."
          value={query}
          onChange={handleChange}
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState message={debouncedQuery ? "No channels match your search" : "No channels available"} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((ch) => <ChannelCard key={ch.id} channel={ch} />)}
        </div>
      )}
    </div>
  );
};

export default Search;
