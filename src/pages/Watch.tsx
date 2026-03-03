import { useParams, Link } from "react-router-dom";
import { useChannels, useCategories, useLiveEvents } from "@/hooks/useFirestore";
import Player from "@/components/Player";
import ChannelCard from "@/components/ChannelCard";
import SkeletonCard from "@/components/SkeletonCard";
import PostsSection from "@/components/PostsSection";
import PollSection from "@/components/PollSection";
import { ArrowLeft, Share2, Heart } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const Watch = () => {
  const { id } = useParams<{ id: string }>();
  const { data: channels, loading } = useChannels();
  const { data: categories } = useCategories();
  const { data: liveEvents, loading: eventsLoading } = useLiveEvents();
  const [favorited, setFavorited] = useState(false);

  const isEvent = id?.startsWith("event-");
  const eventId = isEvent ? id.replace("event-", "") : null;
  const liveEvent = isEvent ? liveEvents.find((e) => e.id === eventId) : null;

  const channel = useMemo(() => {
    if (isEvent && liveEvent) {
      const teamAName = typeof liveEvent.teamA === "object" ? (liveEvent.teamA as any)?.name || "" : String(liveEvent.teamA || "");
      const teamBName = typeof liveEvent.teamB === "object" ? (liveEvent.teamB as any)?.name || "" : String(liveEvent.teamB || "");
      return {
        id: liveEvent.id, name: `${teamAName} vs ${teamBName}`, logo: "", streamUrl: liveEvent.streamUrl,
        playerType: liveEvent.playerType, categoryId: "", countryId: liveEvent.countryId,
        isFeatured: liveEvent.isFeatured, isLive: true, order: 0, createdAt: liveEvent.createdAt,
      };
    }
    return channels.find((c) => c.id === id) || null;
  }, [isEvent, liveEvent, channels, id]);

  const related = channels.filter((c) => c.id !== id && c.categoryId === channel?.categoryId);
  const sameCategory = categories.find((c) => c.id === channel?.categoryId);

  const handleShare = async () => {
    try { await navigator.share({ title: channel?.name, url: window.location.href }); }
    catch { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }
  };

  const toggleFav = () => {
    setFavorited(!favorited);
    toast.success(favorited ? "Removed from favorites" : "Added to favorites");
  };

  if (loading || (isEvent && eventsLoading)) {
    return (
      <div className="min-h-screen pt-16 pb-20 container">
        <div className="aspect-video skeleton-shimmer rounded-xl mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <p className="text-muted-foreground">Channel not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-20">
      <div className="container space-y-6 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" /><span className="text-sm">Back</span>
          </Link>
          <div className="flex gap-2">
            <button onClick={toggleFav} className={`p-2 rounded-lg transition-all ${favorited ? "text-accent glow-accent" : "text-muted-foreground hover:text-foreground"}`}>
              <Heart className={`w-5 h-5 ${favorited ? "fill-current" : ""}`} />
            </button>
            <button onClick={handleShare} className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <Player channel={channel} />

        <div className="glass-card p-4">
          <h1 className="text-xl font-display font-bold text-foreground">{channel.name}</h1>
          {sameCategory && <span className="text-xs text-primary mt-1 inline-block">{sameCategory.icon} {sameCategory.name}</span>}
        </div>

        {/* Social Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PostsSection />
          <PollSection />
        </div>

        {related.length > 0 && (
          <div>
            <h2 className="text-lg font-display font-bold text-foreground mb-4">Related Channels</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {related.map((ch) => <ChannelCard key={ch.id} channel={ch} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Watch;
