import { useTopChannels } from "@/hooks/useTopChannels";
import { useChannels } from "@/hooks/useFirestore";
import ChannelCard from "@/components/ChannelCard";
import { Crown } from "lucide-react";
import { useMemo } from "react";

const TopChannels = () => {
  const { topChannels, loading } = useTopChannels();
  const { data: channels, loading: chLoading } = useChannels();

  // Match top channel entries with full channel data
  const topChannelList = useMemo(() => {
    if (!topChannels.length || !channels.length) return [];
    return topChannels
      .map((tc) => channels.find((c) => c.id === tc.channelId))
      .filter(Boolean) as typeof channels;
  }, [topChannels, channels]);

  if (loading || chLoading) {
    return (
      <div className="min-h-screen pt-16 pb-20 container py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-video skeleton-shimmer rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-20">
      <div className="container py-4 space-y-4">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-display font-bold text-foreground">Top Channels</h1>
        </div>

        {topChannelList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Crown className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No top channels yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {topChannelList.map((ch) => (
              <ChannelCard key={ch.id} channel={ch} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopChannels;
