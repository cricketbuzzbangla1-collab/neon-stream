import { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, orderBy, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateDocument } from "@/hooks/useFirestore";
import { Trash2, CheckCircle, Eye, XCircle, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface Report {
  id: string;
  channelId: string;
  channelName: string;
  streamUrl: string;
  reportedBy: string;
  reason: string;
  message: string | null;
  status: "pending" | "checked" | "fixed" | "ignored";
  createdAt: number;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  checked: "bg-primary/15 text-primary border-primary/30",
  fixed: "bg-neon-green/15 text-neon-green border-neon-green/30",
  ignored: "bg-muted text-muted-foreground border-border",
};

const PAGE_SIZE = 10;

const ReportManager = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const q = query(collection(db, "channelReports"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as Report)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter(r =>
      r.channelName.toLowerCase().includes(q) ||
      r.reason.toLowerCase().includes(q) ||
      r.status.includes(q)
    );
  }, [reports, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const updateStatus = async (id: string, status: Report["status"]) => {
    await updateDoc(doc(db, "channelReports", id), { status });
    toast.success(`Report marked as ${status}`);
  };

  const deleteReport = async (id: string) => {
    await deleteDoc(doc(db, "channelReports", id));
    toast.success("Report deleted");
  };

  const disableChannel = async (channelId: string) => {
    try {
      await updateDocument("channels", channelId, { isLive: false });
      toast.success("Channel disabled");
    } catch {
      toast.error("Failed to disable channel");
    }
  };

  if (loading) return <div className="glass-card p-6"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const inputCls = "px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display font-bold text-foreground">Channel Reports ({reports.length})</h3>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input placeholder="Search..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(1); }} className={`${inputCls} pl-9 w-full`} />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No reports found</p>
      ) : (
        <div className="space-y-2">
          {paginated.map(r => (
            <div key={r.id} className="glass-card p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{r.channelName}</p>
                  <p className="text-xs text-muted-foreground">{r.reason}</p>
                  {r.message && <p className="text-xs text-muted-foreground mt-1 italic">"{r.message}"</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(r.createdAt).toLocaleString()} • UID: {r.reportedBy.slice(0, 8)}...
                  </p>
                </div>
                <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-md border font-bold uppercase ${statusColors[r.status]}`}>
                  {r.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => updateStatus(r.id, "checked")} className="px-2 py-1 rounded text-[10px] bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">✓ Checked</button>
                <button onClick={() => updateStatus(r.id, "fixed")} className="px-2 py-1 rounded text-[10px] bg-neon-green/10 text-neon-green hover:bg-neon-green/20 transition-colors font-medium">✓ Fixed</button>
                <button onClick={() => updateStatus(r.id, "ignored")} className="px-2 py-1 rounded text-[10px] bg-muted text-muted-foreground hover:bg-secondary transition-colors font-medium">Ignore</button>
                <button onClick={() => disableChannel(r.channelId)} className="px-2 py-1 rounded text-[10px] bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 transition-colors font-medium">Disable Channel</button>
                <button onClick={() => deleteReport(r.id)} className="px-2 py-1 rounded text-[10px] bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors font-medium ml-auto">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg hover:bg-secondary disabled:opacity-40 text-foreground"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm text-muted-foreground">Page {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg hover:bg-secondary disabled:opacity-40 text-foreground"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
};

export default ReportManager;
