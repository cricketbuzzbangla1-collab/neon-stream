import { useState, useEffect, useRef, useCallback } from "react";
import {
  collection, query, orderBy, limit, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc, where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { getAutoBadges } from "@/lib/badges";
import { filterBadWords } from "@/lib/chatFilter";
import UserBadges from "@/components/UserBadges";
import { Send, Heart, Trash2, MessageCircle, Globe, Hash } from "lucide-react";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  channelId: string;
  createdAt: number;
  likes: string[];
  badges: string[];
  isDeleted: boolean;
}

interface ChatPanelProps {
  channelId?: string; // if provided, show channel chat; otherwise global
  channelName?: string;
}

const ChatPanel = ({ channelId, channelName }: ChatPanelProps) => {
  const { user, profile, isAdmin } = useAuth();
  const { settings } = useAppSettings();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(0);
  const [viewMode, setViewMode] = useState<"global" | "channel">(channelId ? "channel" : "global");
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Collection path
  const chatCollection = viewMode === "channel" && channelId
    ? `channels/${channelId}/messages`
    : "globalChat";

  useEffect(() => {
    const q = query(
      collection(db, chatCollection),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as ChatMessage))
        .filter((m) => !m.isDeleted)
        .reverse();
      setMessages(msgs);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return unsub;
  }, [chatCollection]);

  const handleSend = useCallback(async () => {
    if (!user || !profile) return toast.error("Login to chat");
    if (profile.isBanned) return toast.error("You are banned");
    if (!input.trim()) return;
    if (!settings.chatEnabled) return toast.error("Chat is disabled");

    // Slow mode
    const now = Date.now();
    const cooldown = (settings.slowModeSeconds || 3) * 1000;
    if (now - lastSent < cooldown) {
      return toast.error(`Wait ${Math.ceil((cooldown - (now - lastSent)) / 1000)}s`);
    }

    setSending(true);
    const badges = getAutoBadges(profile);
    const filteredMsg = filterBadWords(input.trim(), settings.badWordFilterEnabled);
    const msgData = {
      userId: user.uid,
      userName: profile.name,
      message: filteredMsg,
      channelId: channelId || "global",
      createdAt: Date.now(),
      likes: [],
      badges,
      isDeleted: false,
    };

    try {
      // Write to channel chat
      if (channelId && viewMode === "channel") {
        await addDoc(collection(db, `channels/${channelId}/messages`), msgData);
        // Mirror to global chat
        await addDoc(collection(db, "globalChat"), msgData);
      } else {
        // Direct to global
        await addDoc(collection(db, "globalChat"), msgData);
      }
      setInput("");
      setLastSent(Date.now());
    } catch {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  }, [user, profile, input, settings, lastSent, channelId, viewMode]);

  const handleLike = async (msg: ChatMessage) => {
    if (!user) return;
    const newLikes = msg.likes?.includes(user.uid)
      ? msg.likes.filter((id) => id !== user.uid)
      : [...(msg.likes || []), user.uid];
    await updateDoc(doc(db, chatCollection, msg.id), { likes: newLikes });
  };

  const handleDelete = async (msg: ChatMessage) => {
    await updateDoc(doc(db, chatCollection, msg.id), { isDeleted: true });
    toast.success("Message deleted");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tab switcher if channel context */}
      {channelId && (
        <div className="flex border-b border-border/30 shrink-0">
          <button
            onClick={() => setViewMode("channel")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              viewMode === "channel"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            {channelName || "Channel"}
          </button>
          <button
            onClick={() => setViewMode("global")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
              viewMode === "global"
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Global
          </button>
        </div>
      )}

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">No messages yet. Say hi!</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={msg.id}
            className="animate-fade-in glass-card px-3 py-2 rounded-xl space-y-1"
            style={{ animationDelay: `${Math.min(i * 20, 200)}ms` }}
          >
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-primary">{msg.userName}</span>
              <UserBadges badges={(msg.badges || []) as any} />
              {msg.channelId && msg.channelId !== "global" && viewMode === "global" && (
                <span className="text-[9px] px-1 py-0 rounded bg-secondary text-muted-foreground">
                  #{msg.channelId.slice(0, 8)}
                </span>
              )}
              <span className="text-[9px] text-muted-foreground ml-auto">
                {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <p className="text-sm text-foreground break-words">{msg.message}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleLike(msg)}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-accent transition-colors"
              >
                <Heart
                  className={`w-3 h-3 ${
                    msg.likes?.includes(user?.uid || "") ? "fill-accent text-accent" : ""
                  }`}
                />
                {msg.likes?.length || 0}
              </button>
              {(isAdmin || msg.userId === user?.uid) && (
                <button
                  onClick={() => handleDelete(msg)}
                  className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {settings.chatEnabled ? (
        <div className="shrink-0 border-t border-border/30 p-2">
          {user ? (
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message..."
                maxLength={300}
                className="flex-1 px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-2">
              <a href="/login" className="text-primary hover:underline">Login</a> to chat
            </p>
          )}
        </div>
      ) : (
        <div className="shrink-0 border-t border-border/30 p-3">
          <p className="text-xs text-muted-foreground text-center">Chat is disabled</p>
        </div>
      )}
    </div>
  );
};

export default ChatPanel;
