import { Link } from "react-router-dom";
import { Channel, useCategories } from "@/hooks/useFirestore";
import { Play } from "lucide-react";
import { useState, useCallback } from "react";
import { useFavorites } from "@/hooks/useFavorites";
import FavoriteButton from "@/components/FavoriteButton";

const ChannelCard = ({ channel }: { channel: Channel }) => {
  const { data: categories } = useCategories();
  const category = categories.find((c) => c.id === channel.categoryId);
  const [imgLoaded, setImgLoaded] = useState(false);
  const { isFavorited, toggleFavorite } = useFavorites();

  // Preload Watch page on hover/touch for instant navigation
  const handlePrefetch = useCallback(() => {
    import("../pages/Watch");
  }, []);

  return (
    <div className="relative">
      {/* Favorite button overlay */}
      <div className="absolute top-2 right-2 z-10">
        <FavoriteButton
          isFavorited={isFavorited(channel.id)}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(channel); }}
        />
      </div>
      <Link
        to={`/watch/${channel.id}`}
        onMouseEnter={handlePrefetch}
        onTouchStart={handlePrefetch}
        className="group relative glass-card overflow-hidden rounded-2xl transition-all duration-300 hover:scale-105 hover:shadow-[0_0_25px_hsl(var(--glow-primary)/0.25)] border border-border/30 hover:border-primary/50 block"
      >
      {/* Image */}
      <div className="relative aspect-video bg-secondary overflow-hidden">
        {!imgLoaded && channel.logo && (
          <div className="absolute inset-0 skeleton-shimmer" />
        )}
        {channel.logo ? (
          <img
            src={channel.logo}
            alt={channel.name}
            className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-card">
            <span className="text-3xl font-display font-bold text-muted-foreground/50">
              {channel.name?.charAt(0)}
            </span>
          </div>
        )}

        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/30 scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-5 h-5 text-primary-foreground fill-current ml-0.5" />
          </div>
        </div>

        {/* LIVE badge */}
        {channel.isLive && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-live-badge text-foreground live-pulse shadow-md shadow-destructive/30 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-foreground animate-pulse" />
            LIVE
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1">
        <h3 className="text-sm font-semibold text-foreground truncate">{channel.name}</h3>
        {category && (
          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-medium">
            {category.icon} {category.name}
          </span>
        )}
      </div>
      </Link>
    </div>
  );
};

export default ChannelCard;
