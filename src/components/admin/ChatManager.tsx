import { useState, useEffect } from "react";
import { collection, onSnapshot, updateDoc, doc, getDocs, writeBatch, query, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAppSettings, updateAppSettings } from "@/hooks/useAppSettings";
import UserBadges from "@/components/UserBadges";
import { MessageCircle, Trash2, Clock, Filter, Power, Globe } from "lucide-react";
import { toast } from "sonner";

interface ChatMsg {
  id: string;
  userName: string;
  message: string;
  channelId: string;
  badges: string[];
  createdAt: number;
  isDeleted: boolean;
}

const ChatManager = () => {
  const { settings } = useAppSettings();
  const [messages, setMessages] = useState<ChatMsg[]>([]);

  useEffect(() => {
    const q = query(collection(db, "globalChat", "messages"), orderBy("createdAt", "desc"), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMsg)).filter(m => !m.isDeleted));
    });
    return unsub;
  }, []);

  const toggleChat = async () => {
    await updateAppSettings({ chatEnabled: !settings.chatEnabled });
    toast.success(settings.chatEnabled ? "Chat disabled" : "Chat enabled");
  };

  const toggleFilter = async () => {
    await updateAppSettings({ badWordFilterEnabled: !settings.badWordFilterEnabled });
    toast.success("Filter toggled");
  };

  const setSlowMode = async (seconds: number) => {
    await updateAppSettings({ slowModeSeconds: seconds });
    toast.success(`Slow mode: ${seconds}s`);
  };

  const deleteMsg = async (id: string) => {
    await updateDoc(doc(db, "globalChat", "messages", id), { isDeleted: true });
    toast.success("Deleted");
  };

  const clearAll = async () => {
    if (!confirm("Clear all chat history?")) return;
    const snap = await getDocs(collection(db, "globalChat", "messages"));
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.update(d.ref, { isDeleted: true }));
    await batch.commit();
    toast.success("Chat cleared");
  };

  return (
    <div className="space-y-4">
      <h3 className="font-display font-bold text-foreground flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-primary" /> Chat Control
      </h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button onClick={toggleChat} className={`glass-card p-3 rounded-xl flex flex-col items-center gap-1 transition-colors ${settings.chatEnabled ? "border-primary/50" : "border-destructive/50"}`}>
          <Power className={`w-5 h-5 ${settings.chatEnabled ? "text-primary" : "text-destructive"}`} />
          <span className="text-xs text-foreground">{settings.chatEnabled ? "Chat ON" : "Chat OFF"}</span>
        </button>
        <button onClick={toggleFilter} className="glass-card p-3 rounded-xl flex flex-col items-center gap-1">
          <Filter className={`w-5 h-5 ${settings.badWordFilterEnabled ? "text-primary" : "text-muted-foreground"}`} />
          <span className="text-xs text-foreground">Word Filter</span>
        </button>
        <button onClick={clearAll} className="glass-card p-3 rounded-xl flex flex-col items-center gap-1 hover:border-destructive/50">
          <Trash2 className="w-5 h-5 text-destructive" />
          <span className="text-xs text-foreground">Clear All</span>
        </button>
        <div className="glass-card p-3 rounded-xl flex flex-col items-center gap-1">
          <Clock className="w-5 h-5 text-primary" />
          <select
            value={settings.slowModeSeconds}
            onChange={(e) => setSlowMode(Number(e.target.value))}
            className="text-xs bg-transparent text-foreground border-none focus:outline-none"
          >
            {[1, 2, 3, 5, 10, 30].map(s => (
              <option key={s} value={s}>{s}s slow</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1 max-h-72 overflow-y-auto">
        {messages.slice(0, 30).map(m => (
          <div key={m.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-secondary/50 text-sm gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-xs text-primary font-semibold">{m.userName}</span>
                <UserBadges badges={(m.badges || []) as any} />
                {m.channelId && m.channelId !== "global" && (
                  <span className="text-[9px] px-1 rounded bg-secondary text-muted-foreground">
                    <Globe className="w-2.5 h-2.5 inline" /> #{m.channelId.slice(0, 6)}
                  </span>
                )}
              </div>
              <span className="text-xs text-foreground truncate block">{m.message}</span>
            </div>
            <button onClick={() => deleteMsg(m.id)} className="p-1 text-muted-foreground hover:text-destructive shrink-0">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChatManager;
