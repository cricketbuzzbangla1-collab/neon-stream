import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Heart, Trash2, Send, Image } from "lucide-react";
import { toast } from "sonner";

interface Post {
  id: string;
  userId: string;
  userName: string;
  text: string;
  imageUrl?: string;
  likes: string[];
  createdAt: number;
}

const PostsSection = () => {
  const { user, profile, isAdmin, isBanned } = useAuth();
  const { settings } = useAppSettings();
  const [posts, setPosts] = useState<Post[]>([]);
  const [text, setText] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(20));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const handlePost = async () => {
    if (!user || !profile || isBanned) return;
    if (!text.trim()) return toast.error("Write something");
    setSending(true);
    try {
      await addDoc(collection(db, "posts"), {
        userId: user.uid,
        userName: profile.name,
        text: text.trim(),
        imageUrl: imageUrl.trim() || "",
        likes: [],
        createdAt: Date.now(),
      });
      setText("");
      setImageUrl("");
      toast.success("Posted!");
    } catch { toast.error("Failed"); }
    finally { setSending(false); }
  };

  const handleLike = async (post: Post) => {
    if (!user) return;
    const likes = post.likes || [];
    const newLikes = likes.includes(user.uid) ? likes.filter(id => id !== user.uid) : [...likes, user.uid];
    await updateDoc(doc(db, "posts", post.id), { likes: newLikes });
  };

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(db, "posts", id));
    toast.success("Post deleted");
  };

  if (settings?.postEnabled === false) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
        📝 Community Posts
      </h3>

      {user && !isBanned && (
        <div className="glass-card p-3 space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Share something..."
            rows={2}
            maxLength={500}
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          <div className="flex gap-2">
            <input
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Image URL (optional)"
              className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button onClick={handlePost} disabled={sending} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1">
              <Send className="w-3.5 h-3.5" /> Post
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-4 skeleton-shimmer h-20 rounded-xl" />
          ))
        ) : posts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No posts yet</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="glass-card p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-primary">{post.userName}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(post.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-foreground">{post.text}</p>
              {post.imageUrl && (
                <img src={post.imageUrl} alt="" className="rounded-lg max-h-48 w-full object-cover" />
              )}
              <div className="flex items-center gap-3">
                <button onClick={() => handleLike(post)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-accent transition-colors">
                  <Heart className={`w-3.5 h-3.5 ${post.likes?.includes(user?.uid || "") ? "fill-accent text-accent" : ""}`} />
                  {(post.likes?.length || 0)}
                </button>
                {isAdmin && (
                  <button onClick={() => handleDelete(post.id)} className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PostsSection;
