import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ListMusic, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import PlaylistPlayer from "@/components/PlaylistPlayer";

interface PlaylistChannel {
  name: string;
  logo: string;
  group: string;
  streamUrl: string;
}

interface Playlist {
  id: string;
  name: string;
  channels: PlaylistChannel[];
}

const PlaylistWatch = () => {
  const { playlistId, channelIndex } = useParams<{ playlistId: string; channelIndex: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(Number(channelIndex) || 0);
  }, [channelIndex]);

  useEffect(() => {
    if (!user || !playlistId) { setLoading(false); return; }
    const fetchPlaylist = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid, "playlists", playlistId));
        if (snap.exists()) {
          setPlaylist({ id: snap.id, ...snap.data() } as Playlist);
        } else {
          toast.error("Playlist not found");
        }
      } catch {
        toast.error("Failed to load playlist");
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylist();
  }, [user, playlistId]);

  const channel = playlist?.channels?.[currentIndex] || null;
  const totalChannels = playlist?.channels?.length || 0;

  const goToChannel = useCallback((index: number) => {
    if (index >= 0 && index < totalChannels) {
      setCurrentIndex(index);
      navigate(`/playlist/${playlistId}/${index}`, { replace: true });
    }
  }, [totalChannels, playlistId, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center px-4">
        <div className="glass-card neon-border p-8 w-full max-w-sm text-center space-y-4">
          <ListMusic className="w-12 h-12 text-primary mx-auto" />
          <p className="text-muted-foreground">Sign in to play your playlists</p>
          <Link to="/login" className="inline-block px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold">Sign In</Link>
        </div>
      </div>
    );
  }

  if (!playlist || !channel) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Channel not found</p>
          <Link to="/my-playlist" className="text-primary text-sm hover:underline">← Back to Playlists</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-20">
      <div className="container space-y-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to="/my-playlist" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">My Playlists</span>
          </Link>
          <span className="text-xs text-muted-foreground">
            {currentIndex + 1} / {totalChannels} channels
          </span>
        </div>

        {/* Player */}
        <PlaylistPlayer channel={channel} autoPlay onError={() => toast.error(`Failed to play: ${channel.name}`)} />

        {/* Channel info card */}
        <div className="glass-card neon-border p-4 flex items-center gap-3">
          {channel.logo ? (
            <img src={channel.logo} alt={channel.name} className="w-10 h-10 rounded-lg object-cover" loading="lazy" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
              <span className="text-sm font-bold text-muted-foreground">{channel.name.charAt(0)}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-display font-bold text-foreground truncate">{channel.name}</h1>
            <p className="text-xs text-muted-foreground">{channel.group} · {playlist.name}</p>
          </div>
        </div>

        {/* Prev / Next controls */}
        <div className="flex gap-2">
          <button
            onClick={() => goToChannel(currentIndex - 1)}
            disabled={currentIndex <= 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary text-foreground text-sm font-medium disabled:opacity-30 hover:bg-secondary/80 transition-all"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <button
            onClick={() => goToChannel(currentIndex + 1)}
            disabled={currentIndex >= totalChannels - 1}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary text-foreground text-sm font-medium disabled:opacity-30 hover:bg-secondary/80 transition-all"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Channel list */}
        <div className="space-y-1">
          <h2 className="text-sm font-display font-bold text-foreground mb-2">Channels in {playlist.name}</h2>
          <div className="glass-card neon-border overflow-hidden max-h-80 overflow-y-auto">
            {playlist.channels.map((ch, i) => (
              <button
                key={i}
                onClick={() => goToChannel(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors border-b border-border/10 last:border-0 ${
                  i === currentIndex ? "bg-primary/10" : "hover:bg-secondary/50"
                }`}
              >
                {ch.logo ? (
                  <img src={ch.logo} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-bold text-muted-foreground">{ch.name.charAt(0)}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${i === currentIndex ? "text-primary" : "text-foreground"}`}>{ch.name}</p>
                  <p className="text-[10px] text-muted-foreground">{ch.group}</p>
                </div>
                {i === currentIndex && (
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaylistWatch;
