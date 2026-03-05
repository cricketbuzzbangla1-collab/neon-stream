import { useState, useEffect, useCallback, useRef } from "react";
import { collection, doc, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface FavoriteChannel {
  channelId: string;
  name: string;
  logo: string;
  streamUrl: string;
  category: string;
  createdAt: number;
}

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.uid) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    const col = collection(db, "users", user.uid, "favorites");
    const unsub = onSnapshot(col, (snap) => {
      const items = snap.docs.map((d) => ({ channelId: d.id, ...d.data() } as FavoriteChannel));
      setFavorites(items);
      setLoading(false);
    }, () => setLoading(false));

    return unsub;
  }, [user?.uid]);

  const isFavorited = useCallback((channelId: string) => {
    return favorites.some((f) => f.channelId === channelId);
  }, [favorites]);

  const toggleFavorite = useCallback(async (channel: { id: string; name: string; logo: string; streamUrl: string; categoryId: string }) => {
    if (!user?.uid) {
      toast.error("Please login to add favorites");
      return;
    }

    // Debounce: prevent rapid clicks
    if (debounceRef.current.has(channel.id)) return;
    debounceRef.current.add(channel.id);
    setTimeout(() => debounceRef.current.delete(channel.id), 1000);

    const ref = doc(db, "users", user.uid, "favorites", channel.id);
    const alreadyFav = isFavorited(channel.id);

    try {
      if (alreadyFav) {
        await deleteDoc(ref);
        toast.success("Removed from favorites");
      } else {
        await setDoc(ref, {
          channelId: channel.id,
          name: channel.name,
          logo: channel.logo || "",
          streamUrl: channel.streamUrl || "",
          category: channel.categoryId || "",
          createdAt: Date.now(),
        });
        toast.success("Added to favorites");
      }
    } catch (err: any) {
      console.error("Favorite toggle error:", err);
      toast.error("Failed to update favorites");
    }
  }, [user?.uid, isFavorited]);

  return { favorites, loading, isFavorited, toggleFavorite };
}
