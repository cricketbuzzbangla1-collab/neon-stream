import { Link } from "react-router-dom";
import { Channel } from "@/hooks/useFirestore";
import { Play } from "lucide-react";
import { useState, useCallback, memo } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import FavoriteButton from "@/components/FavoriteButton";

const ChannelCard = memo(({ channel, compact }: { channel: Channel; compact?: boolean }) => {
  const [imgLoaded, setImgLoaded] = useState(false);
  const { isFavorited, toggleFavorite } = useFavorites();

  const handlePrefetch = useCallback(() => {
    import("../pages/Watch");
  }, []);

  return (
    <div className="relative">
      <div className="absolute top-1.5 right-1.5 z-10">
        <FavoriteButton
          isFavorited={isFavorited(channel.id)}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(channel); }}
          size={compact ? "sm" : "sm"}
        />
      </div>
      <Link
        to={`/watch/${channel.id}`}
        onMouseEnter={handlePrefetch}
        onTouchStart={handlePrefetch}
        className={`group relative bg-card overflow-hidden rounded-xl transition-transform duration-200 hover:scale-[1.03] border border-border/20 block ${
          compact ? "" : ""
        }`}
      >
        <div className="relative aspect-video bg-secondary overflow-hidden">
          {!imgLoaded && channel.logo && (
            <div className="absolute inset-0 skeleton-shimmer" />
          )}
          {channel.logo ? (
            <img
              src={channel.logo}
              alt={channel.name}
              className={`w-full h-full object-cover transition-opacity duration-200 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              loading="lazy"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <span className={`font-display font-bold text-muted-foreground/50 ${compact ? "text-xl" : "text-3xl"}`}>
                {channel.name?.charAt(0)}
              </span>
            </div>
          )}

          {/* Play overlay */}
          <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center">
              <Play className="w-4 h-4 text-primary-foreground fill-current ml-0.5" />
            </div>
          </div>

          {channel.isLive && (
            <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-destructive text-destructive-foreground flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-destructive-foreground animate-pulse" />
              LIVE
            </span>
          )}
        </div>

        <div className={`${compact ? "p-2" : "p-3"}`}>
          <h3 className={`font-semibold text-foreground truncate ${compact ? "text-xs" : "text-sm"}`}>{channel.name}</h3>
        </div>
      </Link>
    </div>
  );
});

ChannelCard.displayName = "ChannelCard";

export default ChannelCard;
