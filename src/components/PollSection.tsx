import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useAppSettings } from "@/hooks/useAppSettings";
import { BarChart3, Plus, Check } from "lucide-react";
import { toast } from "sonner";

interface PollOption {
  text: string;
  votes: number;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  voters: string[];
  createdBy: string;
  createdAt: number;
  isActive: boolean;
  isPinned?: boolean;
}

const PollSection = () => {
  const { user, profile, isAdmin } = useAuth();
  const { settings } = useAppSettings();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);

  useEffect(() => {
    const q = query(collection(db, "polls"), orderBy("createdAt", "desc"), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Poll));
      // Pinned first, then by date
      data.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.createdAt - a.createdAt);
      setPolls(data.filter(p => p.isActive));
    });
    return unsub;
  }, []);

  const handleCreate = async () => {
    if (!question.trim() || options.filter(o => o.trim()).length < 2) {
      return toast.error("Need a question and at least 2 options");
    }
    await addDoc(collection(db, "polls"), {
      question: question.trim(),
      options: options.filter(o => o.trim()).map(text => ({ text: text.trim(), votes: 0 })),
      voters: [],
      createdBy: user?.uid || "",
      createdAt: Date.now(),
      isActive: true,
      isPinned: false,
    });
    setQuestion("");
    setOptions(["", ""]);
    setShowCreate(false);
    toast.success("Poll created!");
  };

  const handleVote = async (poll: Poll, optIndex: number) => {
    if (!user) return toast.error("Sign in to vote");
    if (poll.voters?.includes(user.uid)) return toast.error("Already voted");
    const newOptions = [...poll.options];
    newOptions[optIndex] = { ...newOptions[optIndex], votes: newOptions[optIndex].votes + 1 };
    await updateDoc(doc(db, "polls", poll.id), {
      options: newOptions,
      voters: [...(poll.voters || []), user.uid],
    });
  };

  if (settings?.pollEnabled === false) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" /> Polls
        </h3>
        {user && (
          <button onClick={() => setShowCreate(!showCreate)} className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex items-center gap-1">
            <Plus className="w-3 h-3" /> New Poll
          </button>
        )}
      </div>

      {showCreate && (
        <div className="glass-card p-3 space-y-3">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Your question..."
            maxLength={200}
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
          {options.map((opt, i) => (
            <input
              key={i}
              value={opt}
              onChange={(e) => { const n = [...options]; n[i] = e.target.value; setOptions(n); }}
              placeholder={`Option ${i + 1}`}
              className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          ))}
          <div className="flex gap-2">
            {options.length < 4 && (
              <button onClick={() => setOptions([...options, ""])} className="text-xs text-primary hover:underline">+ Add option</button>
            )}
            <button onClick={handleCreate} className="ml-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
              Create Poll
            </button>
          </div>
        </div>
      )}

      {polls.map((poll) => {
        const totalVotes = poll.options.reduce((s, o) => s + o.votes, 0);
        const hasVoted = poll.voters?.includes(user?.uid || "");
        return (
          <div key={poll.id} className="glass-card p-3 space-y-2">
            {poll.isPinned && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">📌 Pinned</span>}
            <p className="text-sm font-semibold text-foreground">{poll.question}</p>
            <div className="space-y-1.5">
              {poll.options.map((opt, i) => {
                const pct = totalVotes > 0 ? Math.round((opt.votes / totalVotes) * 100) : 0;
                return (
                  <button
                    key={i}
                    onClick={() => handleVote(poll, i)}
                    disabled={hasVoted}
                    className="w-full relative rounded-lg overflow-hidden border border-border/50 text-left px-3 py-2 text-sm text-foreground hover:border-primary/50 transition-colors disabled:cursor-default"
                  >
                    <div
                      className="absolute inset-y-0 left-0 bg-primary/15 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                    <span className="relative flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        {hasVoted && <Check className="w-3 h-3 text-primary" />}
                        {opt.text}
                      </span>
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground">{totalVotes} votes</p>
          </div>
        );
      })}

      {polls.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">No active polls</p>
      )}
    </div>
  );
};

export default PollSection;
