import { useState, useEffect } from "react";
import { collection, onSnapshot, deleteDoc, updateDoc, doc, query, orderBy, limit, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAppSettings, updateAppSettings } from "@/hooks/useAppSettings";
import { FileText, BarChart3, Trash2, Pin, Power, Plus, X } from "lucide-react";
import { toast } from "sonner";

const PostPollManager = () => {
  const { settings } = useAppSettings();
  const [posts, setPosts] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [pollQ, setPollQ] = useState("");
  const [pollOpts, setPollOpts] = useState(["", ""]);

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(30)), snap => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const u2 = onSnapshot(query(collection(db, "polls"), orderBy("createdAt", "desc"), limit(20)), snap => {
      setPolls(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { u1(); u2(); };
  }, []);

  const deletePost = async (id: string) => { await deleteDoc(doc(db, "posts", id)); toast.success("Post deleted"); };
  const deletePoll = async (id: string) => { await deleteDoc(doc(db, "polls", id)); toast.success("Poll deleted"); };
  const closePoll = async (id: string) => { await updateDoc(doc(db, "polls", id), { isActive: false }); toast.success("Poll closed"); };
  const pinPoll = async (p: any) => { await updateDoc(doc(db, "polls", p.id), { isPinned: !p.isPinned }); toast.success("Updated"); };

  const createPoll = async () => {
    if (!pollQ.trim() || pollOpts.filter(o => o.trim()).length < 2) return toast.error("Need question + 2 options");
    await addDoc(collection(db, "polls"), {
      question: pollQ.trim(),
      options: pollOpts.filter(o => o.trim()).map(t => ({ text: t.trim(), votes: 0 })),
      voters: [],
      createdBy: "admin",
      createdAt: Date.now(),
      isActive: true,
      isPinned: false,
    });
    setPollQ(""); setPollOpts(["", ""]); setShowCreatePoll(false);
    toast.success("Poll created");
  };

  return (
    <div className="space-y-6">
      {/* Posts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" /> Posts ({posts.length})
          </h3>
          <button onClick={() => updateAppSettings({ postEnabled: !settings.postEnabled })} className={`text-xs px-3 py-1 rounded-full ${settings.postEnabled ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}>
            {settings.postEnabled ? "Enabled" : "Disabled"}
          </button>
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {posts.map(p => (
            <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50 text-sm">
              <div className="flex-1 min-w-0">
                <span className="text-xs text-primary font-semibold">{p.userName}: </span>
                <span className="text-xs text-foreground truncate">{p.text?.substring(0, 60)}</span>
              </div>
              <button onClick={() => deletePost(p.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      </div>

      {/* Polls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" /> Polls ({polls.length})
          </h3>
          <div className="flex gap-2">
            <button onClick={() => updateAppSettings({ pollEnabled: !settings.pollEnabled })} className={`text-xs px-3 py-1 rounded-full ${settings.pollEnabled ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}`}>
              {settings.pollEnabled ? "Enabled" : "Disabled"}
            </button>
            <button onClick={() => setShowCreatePoll(!showCreatePoll)} className="text-xs px-3 py-1 rounded-full bg-primary/20 text-primary flex items-center gap-1">
              <Plus className="w-3 h-3" /> Create
            </button>
          </div>
        </div>

        {showCreatePoll && (
          <div className="glass-card p-3 space-y-2">
            <input value={pollQ} onChange={e => setPollQ(e.target.value)} placeholder="Question" className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm" />
            {pollOpts.map((o, i) => (
              <input key={i} value={o} onChange={e => { const n = [...pollOpts]; n[i] = e.target.value; setPollOpts(n); }} placeholder={`Option ${i+1}`} className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm" />
            ))}
            <div className="flex gap-2">
              {pollOpts.length < 4 && <button onClick={() => setPollOpts([...pollOpts, ""])} className="text-xs text-primary">+ Option</button>}
              <button onClick={createPoll} className="ml-auto px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm">Create</button>
            </div>
          </div>
        )}

        <div className="space-y-1 max-h-48 overflow-y-auto">
          {polls.map(p => (
            <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/50 text-sm gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-xs text-foreground truncate">{p.question}</span>
                <span className={`text-[10px] ml-2 ${p.isActive ? "text-primary" : "text-muted-foreground"}`}>{p.isActive ? "Active" : "Closed"}</span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => pinPoll(p)} className={`p-1 ${p.isPinned ? "text-primary" : "text-muted-foreground"} hover:text-primary`}><Pin className="w-3 h-3" /></button>
                {p.isActive && <button onClick={() => closePoll(p.id)} className="p-1 text-muted-foreground hover:text-accent"><X className="w-3 h-3" /></button>}
                <button onClick={() => deletePoll(p.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PostPollManager;
