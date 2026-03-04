import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, onSnapshot, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { Link, useNavigate } from "react-router-dom";
import { ListMusic, Upload, Link2, Trash2, Play, Plus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

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
  createdAt: any;
}

function parseM3U(content: string): PlaylistChannel[] {
  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
  const channels: PlaylistChannel[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("#EXTINF")) {
      const info = lines[i];
      const url = lines[i + 1] && !lines[i + 1].startsWith("#") ? lines[i + 1] : "";
      if (!url) continue;
      const nameMatch = info.match(/,(.+)$/);
      const logoMatch = info.match(/tvg-logo="([^"]*)"/);
      const groupMatch = info.match(/group-title="([^"]*)"/);
      channels.push({
        name: nameMatch?.[1]?.trim() || "Unknown",
        logo: logoMatch?.[1] || "",
        group: groupMatch?.[1] || "General",
        streamUrl: url.trim(),
      });
    }
  }
  return channels;
}

const MyPlaylist = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [playlistName, setPlaylistName] = useState("");
  const [m3uUrl, setM3uUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const unsub = onSnapshot(collection(db, "users", user.uid, "playlists"), (snap) => {
      setPlaylists(snap.docs.map(d => ({ id: d.id, ...d.data() } as Playlist)));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await importM3U(text);
  };

  const handleUrlImport = async () => {
    if (!m3uUrl.trim()) return toast.error("Enter a URL");
    setImporting(true);
    try {
      const res = await fetch(m3uUrl.trim());
      const text = await res.text();
      await importM3U(text);
      setM3uUrl("");
    } catch {
      toast.error("Failed to fetch M3U URL");
    } finally {
      setImporting(false);
    }
  };

  const importM3U = async (content: string) => {
    const channels = parseM3U(content);
    if (channels.length === 0) return toast.error("No channels found in M3U");
    const name = playlistName.trim() || `Playlist ${playlists.length + 1}`;
    setImporting(true);
    try {
      await addDoc(collection(db, "users", user.uid, "playlists"), {
        name,
        channels,
        createdAt: serverTimestamp(),
      });
      toast.success(`Imported ${channels.length} channels!`);
      setPlaylistName("");
      setShowAdd(false);
    } catch {
      toast.error("Failed to save playlist");
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "users", user.uid, "playlists", id));
    toast.success("Playlist deleted");
  };

  if (authLoading) {
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
          <h1 className="text-xl font-display font-bold text-foreground">My Playlist</h1>
          <p className="text-sm text-muted-foreground">Sign in to create and manage your playlists</p>
          <Link to="/login" className="inline-block px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-20">
      <div className="container py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
            <ListMusic className="w-6 h-6 text-primary" /> My Playlists
          </h1>
          <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {/* Add Playlist Form */}
        {showAdd && (
          <div className="glass-card neon-border p-5 space-y-4">
            <input
              value={playlistName}
              onChange={(e) => setPlaylistName(e.target.value)}
              placeholder="Playlist name (optional)"
              className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <div className="flex gap-2">
              <input
                value={m3uUrl}
                onChange={(e) => setM3uUrl(e.target.value)}
                placeholder="M3U URL..."
                className="flex-1 px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <button onClick={handleUrlImport} disabled={importing} className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5">
                <Link2 className="w-4 h-4" /> Import
              </button>
            </div>
            <div className="text-center text-xs text-muted-foreground">— or —</div>
            <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border border-dashed border-border hover:border-primary/50 cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upload .m3u / .m3u8 file</span>
              <input type="file" accept=".m3u,.m3u8" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        )}

        {/* Playlists */}
        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="glass-card h-20 skeleton-shimmer rounded-xl" />)}
          </div>
        ) : playlists.length === 0 ? (
          <div className="text-center py-12">
            <ListMusic className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No playlists yet. Add one above!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {playlists.map((pl) => (
              <div key={pl.id} className="glass-card neon-border overflow-hidden">
                <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === pl.id ? null : pl.id)}>
                  <div>
                    <h3 className="font-display font-bold text-foreground">{pl.name}</h3>
                    <p className="text-xs text-muted-foreground">{pl.channels?.length || 0} channels</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(pl.id); }} className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {expandedId === pl.id && (
                  <div className="border-t border-border/30 max-h-80 overflow-y-auto">
                    {pl.channels?.map((ch, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/50 transition-colors border-b border-border/10 last:border-0">
                        {ch.logo ? (
                          <img src={ch.logo} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-muted-foreground">{ch.name.charAt(0)}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{ch.name}</p>
                          <p className="text-[10px] text-muted-foreground">{ch.group}</p>
                        </div>
                        <Link to={`/watch/playlist-${pl.id}-${i}`} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                          <Play className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyPlaylist;
