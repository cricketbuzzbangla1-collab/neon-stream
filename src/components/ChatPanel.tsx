import { useState, useEffect, useRef, useCallback } from "react";
import {
  collection, query, orderBy, limit, onSnapshot,
  writeBatch, doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { getAutoBadges } from "@/lib/badges";
import { filterBadWords } from "@/lib/chatFilter";
import UserBadges from "@/components/UserBadges";
import { Send, Heart, Trash2, MessageCircle, Globe } from "lucide-react";
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
  channelId?: string;
  channelName?: string;
}

const ChatPanel = ({ channelId, channelName }: ChatPanelProps) => {
  const { user, profile, isAdmin, isModerator } = useAuth();
  const { settings } = useAppSettings();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [lastSent, setLastSent] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Unified feed: flat collection "globalChat"
  const getGlobalChatDocRef = (messageId: string) => doc(db, "globalChat", messageId);
  const getChannelChatDocRef = (targetChannelId: string, messageId: string) =>
    doc(db, "channels", targetChannelId, "messages", messageId);

  useEffect(() => {
    const q = query(
      collection(db, "globalChat"),
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
  }, []);

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
    const messageId = doc(collection(db, "globalChat")).id;
    const msgData: ChatMessage = {
      id: messageId,
      userId: user.uid,
      userName: profile.name,
      message: filteredMsg,
      channelId: channelId || "global",
      createdAt: Date.now(),
      likes: [],
      badges,
      isDeleted: false,
    };

    // Optimistic UI: show message immediately
    setMessages(prev => [...prev, msgData]);
    setInput("");
    setLastSent(Date.now());

    try {
      const batch = writeBatch(db);
      batch.set(getGlobalChatDocRef(messageId), msgData);

      if (channelId && channelId !== "global") {
        batch.set(getChannelChatDocRef(channelId, messageId), msgData);
      }

      await batch.commit();
    } catch {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  }, [user, profile, input, settings, lastSent, channelId]);

  const handleLike = async (msg: ChatMessage) => {
    if (!user) return;

    const newLikes = msg.likes?.includes(user.uid)
      ? msg.likes.filter((id) => id !== user.uid)
      : [...(msg.likes || []), user.uid];

    const batch = writeBatch(db);
    batch.set(getGlobalChatDocRef(msg.id), { likes: newLikes }, { merge: true });

    if (msg.channelId && msg.channelId !== "global") {
      batch.set(getChannelChatDocRef(msg.channelId, msg.id), { likes: newLikes }, { merge: true });
    }

    await batch.commit();
  };

  const handleDelete = async (msg: ChatMessage) => {
    if (!isAdmin && !isModerator && msg.userId !== user?.uid) return;

    const batch = writeBatch(db);
    batch.set(getGlobalChatDocRef(msg.id), { isDeleted: true }, { merge: true });

    if (msg.channelId && msg.channelId !== "global") {
      batch.set(getChannelChatDocRef(msg.channelId, msg.id), { isDeleted: true }, { merge: true });
    }

    await batch.commit();
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
      {/* Global Chat Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30 shrink-0">
        <Globe className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium text-foreground">Global Chat</span>
      </div>

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
              {msg.channelId && msg.channelId !== "global" && (
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
              {(isAdmin || isModerator || msg.userId === user?.uid) && (
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
