import { useState, useEffect, useRef } from "react";
import { collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Send, Heart, Trash2 } from "lucide-react";
import { toast } from "sonner";

const BAD_WORDS = ["fuck","shit","ass","bitch","dick","damn"];
const filterBadWords = (text: string) => {
  let filtered = text;
  BAD_WORDS.forEach(w => filtered = filtered.replace(new RegExp(w,"gi"), "***"));
  return filtered;
};

const GlobalChat = () => {
  const { user, profile, isAdmin } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, "globalChat"), orderBy("createdAt","desc"), limit(50));
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return unsub;
  }, []);

  const handleSend = async () => {
    if (!user || !profile) return toast.error("Login first");
    if (!input.trim()) return;

    setSending(true);
    try {
      await addDoc(collection(db, "globalChat"), {
        userId: user.uid,
        userName: profile.name,
        message: filterBadWords(input.trim()),
        createdAt: Date.now(),
        likes: [],
        isDeleted: false
      });
      setInput("");
    } catch {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleLike = async (msg: any) => {
    if (!user) return;
    const newLikes = msg.likes?.includes(user.uid)
      ? msg.likes.filter((id: string) => id !== user.uid)
      : [...(msg.likes || []), user.uid];
    await updateDoc(doc(db, "globalChat", msg.id), { likes: newLikes });
  };

  const handleDelete = async (msg: any) => {
    await updateDoc(doc(db, "globalChat", msg.id), { isDeleted: true });
  };

  // This component is now hidden from homepage but kept for potential re-use
  return null;
};

export default GlobalChat;
