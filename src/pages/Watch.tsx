import { useParams, Link, useNavigate } from "react-router-dom";
import { useChannels, useCategories, useLiveEvents } from "@/hooks/useFirestore";
import Player from "@/components/Player";
import ChannelCard from "@/components/ChannelCard";
import SkeletonCard from "@/components/SkeletonCard";
import PostsSection from "@/components/PostsSection";
import PollSection from "@/components/PollSection";
import { ArrowLeft, Share2, Heart, AlertTriangle } from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import ReportChannelModal from "@/components/ReportChannelModal";
import { toast } from "sonner";

const Watch = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: channels, loading } = useChannels();
  const { data: categories } = useCategories();
  const { data: liveEvents, loading: eventsLoading } = useLiveEvents();
  const [favorited, setFavorited] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const playerRef = useRef<HTMLDivElement>(null);

  const isEvent = id?.startsWith("event-");
  const eventId = isEvent ? id.replace("event-", "") : null;
  const liveEvent = isEvent ? liveEvents.find((e) => e.id === eventId) : null;

  // Playlist channel support
  const isPlaylist = id?.startsWith("playlist-");
  const [playlistChannel, setPlaylistChannel] = useState<any>(null);

  useEffect(() => {
    if (isPlaylist && id) {
      // Format: playlist-{playlistId}-{index}
      // We can't easily fetch from here without user context, so show basic player
      setPlaylistChannel(null);
    }
  }, [id, isPlaylist]);

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

  // Auto scroll to player on mount and id change
  useEffect(() => {
    setTimeout(() => {
      playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 200);
  }, [id]);

  const handleRelatedClick = (channelId: string) => {
    navigate(`/watch/${channelId}`, { replace: true });
  };

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

        <div ref={playerRef}>
          <Player channel={channel} autoPlay={true} />
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-all"
          >
            <AlertTriangle className="w-3.5 h-3.5" /> Report Channel
          </button>
        </div>

        <ReportChannelModal
          channelId={channel.id}
          channelName={channel.name}
          streamUrl={channel.streamUrl}
          open={showReport}
          onClose={() => setShowReport(false)}
        />

        <div className="glass-card p-4">
          <h1 className="text-xl font-display font-bold text-foreground">{channel.name}</h1>
          {sameCategory && <span className="text-xs text-primary mt-1 inline-block">{sameCategory.icon} {sameCategory.name}</span>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PostsSection />
          <PollSection />
        </div>

        {related.length > 0 && (
          <div>
            <h2 className="text-lg font-display font-bold text-foreground mb-4">Related Channels</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {related.map((ch) => (
                <div key={ch.id} onClick={() => handleRelatedClick(ch.id)} className="cursor-pointer">
                  <ChannelCard channel={ch} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Watch;
