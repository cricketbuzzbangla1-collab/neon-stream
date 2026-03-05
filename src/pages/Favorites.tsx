import { useFavorites } from "@/hooks/useFavorites";
import { useChannels } from "@/hooks/useFirestore";
import { useAuth } from "@/contexts/AuthContext";
import ChannelCard from "@/components/ChannelCard";
import SkeletonCard from "@/components/SkeletonCard";
import EmptyState from "@/components/EmptyState";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";

const Favorites = () => {
  const { user } = useAuth();
  const { favorites, loading: favLoading } = useFavorites();
  const { data: channels, loading: chLoading } = useChannels();
  const loading = favLoading || chLoading;

  if (!user) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex flex-col items-center justify-center gap-4">
        <Heart className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Please login to see your favorites</p>
        <Link to="/login" className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium">
          Login
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-16 pb-20 container py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  // Match favorites to full channel data
  const favChannels = favorites
    .map((f) => channels.find((c) => c.id === f.channelId))
    .filter(Boolean);

  return (
    <div className="min-h-screen pt-16 pb-20 container py-6 space-y-6">
      <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
        <Heart className="w-5 h-5 text-destructive fill-current" />
        My Favorites
      </h1>

      {favChannels.length === 0 ? (
        <EmptyState message="No favorite channels yet. Tap the ❤️ on any channel to add it here." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {favChannels.map((ch) => (
            <ChannelCard key={ch!.id} channel={ch!} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorites;
