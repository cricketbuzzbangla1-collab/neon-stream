import { useState, useEffect, useRef, useCallback } from "react";
import { collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/firebase/config";
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
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, "globalChat/messages"), orderBy("createdAt","desc"), limit(50));
    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
      setMessages(msgs);
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    });
    return unsub;
  }, []);

  const handleSend = async () => {
    if (!user || !profile) return toast.error("Login first");
    if (!input.trim()) return;

    setSending(true);
    try {
      await addDoc(collection(db, "globalChat/messages"), {
        userId: user.uid,
        userName: profile.name,
        message: filterBadWords(input.trim()),
        createdAt: Date.now(),
        likes: [],
        isDeleted: false
      });
      setInput("");
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
    await updateDoc(doc(db, "globalChat/messages", msg.id), { likes: newLikes });
  };

  return (
    <div className="fixed bottom-0 right-4 w-96 h-[500px] glass-card flex flex-col">
      <div className="flex-1 overflow-y-auto p-2">
        {messages.map(msg => (
          <div key={msg.id} className={`p-2 rounded-lg mb-1 ${msg.userId===user?.uid?"bg-primary/20":"bg-secondary/80"}`}>
            {msg.userId!==user?.uid && <p className="text-xs text-primary">{msg.userName}</p>}
            <p>{msg.message}</p>
            <button onClick={()=>handleLike(msg)}>{msg.likes?.length || 0} ❤️</button>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="p-2 flex gap-2">
        <input value={input} onChange={e=>setInput(e.target.value)} className="flex-1 p-2 border rounded" placeholder="Type message..." />
        <button onClick={handleSend} disabled={sending||!input.trim()} className="bg-primary text-white px-3 rounded">Send</button>
      </div>
    </div>
  );
};

export default GlobalChat;
