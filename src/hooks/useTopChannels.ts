import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface TopChannel {
  id: string;
  channelId: string;
  name: string;
  logo: string;
  streamUrl: string;
  categoryId: string;
  createdAt: number;
}

export function useTopChannels() {
  const [topChannels, setTopChannels] = useState<TopChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    const col = collection(db, "topChannels");
    const unsub = onSnapshot(col, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as TopChannel));
      setTopChannels(items);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, []);

  const isTopChannel = useCallback((channelId: string) => {
    return topChannels.some((t) => t.channelId === channelId);
  }, [topChannels]);

  const toggleTopChannel = useCallback(async (channel: { id: string; name: string; logo: string; streamUrl: string; categoryId: string }) => {
    if (!isAdmin) return;
    const ref = doc(db, "topChannels", channel.id);
    const alreadyTop = isTopChannel(channel.id);

    try {
      if (alreadyTop) {
        await deleteDoc(ref);
        toast.success("Removed from Top Channels");
      } else {
        await setDoc(ref, {
          channelId: channel.id,
          name: channel.name,
          logo: channel.logo || "",
          streamUrl: channel.streamUrl || "",
          categoryId: channel.categoryId || "",
          createdAt: Date.now(),
        });
        toast.success("Added to Top Channels");
      }
    } catch (err) {
      console.error("Top channel toggle error:", err);
      toast.error("Failed to update Top Channels");
    }
  }, [isAdmin, isTopChannel]);

  return { topChannels, loading, isTopChannel, toggleTopChannel };
}
