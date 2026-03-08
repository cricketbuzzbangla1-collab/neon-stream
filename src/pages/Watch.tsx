import { useParams, Link, useNavigate } from "react-router-dom";
import { useChannels, useCategories, useLiveEvents } from "@/hooks/useFirestore";
import Player from "@/components/Player";
import ChannelCard from "@/components/ChannelCard";
import ExternalPlayerDialog from "@/components/ExternalPlayerDialog";
import { ArrowLeft, Share2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import { detectPlayerType } from "@/lib/detectPlayerType";
import FavoriteButton from "@/components/FavoriteButton";
import ReportChannelModal from "@/components/ReportChannelModal";
import { toast } from "sonner";
import { useSwipeChannel } from "@/hooks/useSwipeChannel";

const Watch = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: channels, loading } = useChannels();
  const { data: categories } = useCategories();
  const { data: liveEvents, loading: eventsLoading } = useLiveEvents();
  const [showReport, setShowReport] = useState(false);
  const [showExternalDialog, setShowExternalDialog] = useState(false);
  const { isFavorited, toggleFavorite } = useFavorites();
  const [swipeIndicator, setSwipeIndicator] = useState<"left" | "right" | null>(null);

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

  // Channel list for swipe navigation (same category or all)
  const channelList = useMemo(() => {
    if (isEvent) return [];
    if (channel?.categoryId) {
      const sameCat = channels.filter(c => c.categoryId === channel.categoryId);
      return sameCat.length > 1 ? sameCat : channels;
    }
    return channels;
  }, [channels, channel?.categoryId, isEvent]);

  const currentIndex = useMemo(() => channelList.findIndex(c => c.id === id), [channelList, id]);

  const goToChannel = useCallback((direction: "next" | "prev") => {
    if (channelList.length < 2 || currentIndex === -1) return;
    const newIndex = direction === "next"
      ? (currentIndex + 1) % channelList.length
      : (currentIndex - 1 + channelList.length) % channelList.length;
    const nextChannel = channelList[newIndex];
    if (nextChannel) {
      setSwipeIndicator(direction === "next" ? "left" : "right");
      setTimeout(() => setSwipeIndicator(null), 400);
      navigate(`/watch/${nextChannel.id}`, { replace: true });
    }
  }, [channelList, currentIndex, navigate]);

  const swipeHandlers = useSwipeChannel({
    onSwipeLeft: () => goToChannel("next"),
    onSwipeRight: () => goToChannel("prev"),
  });

  const related = useMemo(() =>
    channels.filter((c) => c.id !== id && c.categoryId === channel?.categoryId).slice(0, 6),
    [channels, id, channel?.categoryId]
  );
  const sameCategory = categories.find((c) => c.id === channel?.categoryId);

  const detectedType = channel?.streamUrl ? detectPlayerType(channel.streamUrl) : "hls";
  const isHttpStream = detectedType === "external";

  useEffect(() => {
    if (isHttpStream && channel) setShowExternalDialog(true);
    else setShowExternalDialog(false);
  }, [isHttpStream, channel?.id]);

  const handleShare = async () => {
    try { await navigator.share({ title: channel?.name, url: window.location.href }); }
    catch { navigator.clipboard.writeText(window.location.href); toast.success("Link copied!"); }
  };

  if (loading || (isEvent && eventsLoading)) {
    return (
      <div className="min-h-screen pt-16 pb-20 container">
        <div className="aspect-video skeleton-shimmer rounded-xl mb-4" />
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
      <div className="container space-y-4 py-3">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" /><span className="text-sm">Back</span>
          </Link>
          <div className="flex gap-1.5">
            <FavoriteButton
              isFavorited={isFavorited(channel.id)}
              onClick={(e) => { e.preventDefault(); toggleFavorite(channel); }}
              size="md"
            />
            <button onClick={handleShare} className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Player with swipe */}
        <div className="relative">
          {isHttpStream ? (
            <div className="aspect-video bg-secondary rounded-xl flex flex-col items-center justify-center gap-3">
              <h3 className="text-base font-display font-bold text-foreground">{channel.name}</h3>
              <p className="text-xs text-muted-foreground">Requires external player</p>
              <button
                onClick={() => setShowExternalDialog(true)}
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-all"
              >
                ▶ Open Player
              </button>
            </div>
          ) : (
            <Player
              channel={channel}
              autoPlay={true}
              onFatalError={() => setShowExternalDialog(true)}
              onSwipeNext={() => goToChannel("next")}
              onSwipePrev={() => goToChannel("prev")}
              channelInfo={!isEvent && channelList.length > 1 ? { current: currentIndex + 1, total: channelList.length } : undefined}
            />
          )}

          {/* Channel nav buttons below player */}
          {!isEvent && channelList.length > 1 && (
            <div className="flex items-center justify-center gap-4 mt-2">
              <button onClick={() => goToChannel("prev")} className="p-1.5 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[10px] text-muted-foreground font-medium">
                ← Swipe to switch → {currentIndex + 1}/{channelList.length}
              </span>
              <button onClick={() => goToChannel("next")} className="p-1.5 rounded-full bg-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <ExternalPlayerDialog
          open={showExternalDialog}
          onClose={() => setShowExternalDialog(false)}
          streamUrl={channel.streamUrl}
          channelName={channel.name}
        />

        {/* Channel info */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">{channel.name}</h1>
            {sameCategory && <span className="text-xs text-primary">{sameCategory.icon} {sameCategory.name}</span>}
          </div>
          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive/10 text-destructive text-xs font-medium hover:bg-destructive/20 transition-all"
          >
            <AlertTriangle className="w-3 h-3" /> Report
          </button>
        </div>

        <ReportChannelModal
          channelId={channel.id}
          channelName={channel.name}
          streamUrl={channel.streamUrl}
          open={showReport}
          onClose={() => setShowReport(false)}
        />

        {/* Related */}
        {related.length > 0 && (
          <div>
            <h2 className="text-sm font-display font-bold text-foreground mb-3">Related</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {related.map((ch) => (
                <div key={ch.id} onClick={() => navigate(`/watch/${ch.id}`, { replace: true })} className="cursor-pointer">
                  <ChannelCard channel={ch} compact />
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
