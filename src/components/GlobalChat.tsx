import { useState, useEffect, useRef, useCallback } from "react";
import { collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs, startAfter, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { Send, Heart, Trash2, MessageCircle, ChevronDown, Users } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const BAD_WORDS = ["fuck", "shit", "ass", "bitch", "dick", "damn"];
const filterBadWords = (text: string) => {
  let filtered = text;
  BAD_WORDS.forEach(w => {
    const regex = new RegExp(w, "gi");
    filtered = filtered.replace(regex, "***");
  });
  return filtered;
};

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  createdAt: number;
  likes: string[];
  isDeleted: boolean;
}

const GlobalChat = () => {
  const { user, profile, isAdmin, isBanned } = useAuth();
  const { settings } = useAppSettings();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(0);
  const [showChat, setShowChat] = useState(false);
  const [onlineCount] = useState(() => Math.floor(Math.random() * 50) + 10);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const slowMode = settings?.slowModeSeconds || 3;
  const chatEnabled = settings?.chatEnabled !== false;

  useEffect(() => {
    const q = query(
      collection(db, "globalChat"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as ChatMessage))
        .filter(m => !m.isDeleted)
        .reverse();
      setMessages(msgs);
      if (autoScroll) {
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    });
    return unsub;
  }, [autoScroll]);

  const handleScroll = useCallback(() => {
    if (!chatRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = chatRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 80);
  }, []);

  const handleSend = async () => {
    if (!user || !profile) return;
    if (isBanned) return toast.error("You are banned from chat");
    if (!chatEnabled) return toast.error("Chat is disabled");
    if (!input.trim()) return;

    const now = Date.now();
    if (now - lastSent < slowMode * 1000) {
      return toast.error(`Wait ${slowMode}s between messages`);
    }

    setSending(true);
    try {
      const filtered = settings?.badWordFilterEnabled !== false ? filterBadWords(input.trim()) : input.trim();
      await addDoc(collection(db, "globalChat"), {
        userId: user.uid,
        userName: profile.name,
        message: filtered,
        createdAt: Date.now(),
        likes: [],
        isDeleted: false,
      });
      setInput("");
      setLastSent(Date.now());
    } catch {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleLike = async (msg: ChatMessage) => {
    if (!user) return;
    const likes = msg.likes || [];
    const newLikes = likes.includes(user.uid)
      ? likes.filter(id => id !== user.uid)
      : [...likes, user.uid];
    await updateDoc(doc(db, "globalChat", msg.id), { likes: newLikes });
  };

  const handleDelete = async (msgId: string) => {
    await updateDoc(doc(db, "globalChat", msgId), { isDeleted: true });
    toast.success("Message deleted");
  };

  if (!showChat) {
    return (
      <button
        onClick={() => setShowChat(true)}
        className="fixed bottom-20 left-4 md:bottom-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full glass-card neon-border glow-primary animate-float"
      >
        <MessageCircle className="w-5 h-5 text-primary" />
        <span className="text-xs font-bold text-primary neon-text">LIVE CHAT</span>
        <span className="w-2 h-2 rounded-full bg-destructive live-pulse" />
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 md:left-auto md:right-4 md:bottom-4 md:w-96 z-50 flex flex-col h-[70vh] md:h-[500px] glass-card neon-border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card/80 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-destructive live-pulse" />
          <span className="text-sm font-bold text-foreground">LIVE CHAT</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="w-3 h-3" /> {onlineCount}
          </span>
        </div>
        <button onClick={() => setShowChat(false)} className="text-muted-foreground hover:text-foreground">
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div ref={chatRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 scrollbar-hide">
        {messages.map((msg) => {
          const isMe = user?.uid === msg.userId;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                isMe 
                  ? "bg-primary/20 border border-primary/30 rounded-br-sm" 
                  : "bg-secondary/80 border border-border/30 rounded-bl-sm"
              }`}>
                {!isMe && (
                  <p className="text-[10px] font-semibold text-primary mb-0.5">{msg.userName}</p>
                )}
                <p className="text-sm text-foreground break-words">{msg.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <button onClick={() => handleLike(msg)} className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-accent transition-colors">
                    <Heart className={`w-3 h-3 ${msg.likes?.includes(user?.uid || "") ? "fill-accent text-accent" : ""}`} />
                    {(msg.likes?.length || 0) > 0 && msg.likes.length}
                  </button>
                  {isAdmin && (
                    <button onClick={() => handleDelete(msg.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-border/50 bg-card/80 backdrop-blur-xl">
        {!user ? (
          <Link to="/login" className="block text-center text-sm text-primary py-2 hover:underline">
            Sign in to chat
          </Link>
        ) : isBanned ? (
          <p className="text-center text-xs text-destructive py-2">You are banned</p>
        ) : !chatEnabled ? (
          <p className="text-center text-xs text-muted-foreground py-2">Chat is disabled</p>
        ) : (
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder="Type a message..."
              maxLength={300}
              className="flex-1 px-3 py-2 rounded-xl bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalChat;
