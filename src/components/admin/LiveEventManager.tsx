import { useState, useMemo } from "react";
import { useLiveEvents, useCountries, addDocument, updateDocument, deleteDocument, LiveEvent } from "@/hooks/useFirestore";
import { Plus, Trash2, Edit, Save, X, Search, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { toast } from "sonner";

const empty: Omit<LiveEvent, "id"> = {
  title: "", teamA: "", teamALogo: "", teamB: "", teamBLogo: "",
  streamUrl: "", playerType: "hls", startTime: 0, endTime: 0,
  countryId: "", isFeatured: false, isActive: true, manualStatus: "", createdAt: 0
};

const PAGE_SIZE = 10;

// Quick duration presets in hours
const DURATION_PRESETS = [
  { label: "1h", hours: 1 },
  { label: "1.5h", hours: 1.5 },
  { label: "2h", hours: 2 },
  { label: "3h", hours: 3 },
];

const LiveEventManager = () => {
  const { data: events } = useLiveEvents();
  const { data: countries } = useCountries();
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const getStatus = (ev: LiveEvent) => {
    const ms = ev.manualStatus;
    if (ms === "live" || ms === "upcoming" || ms === "finished") return ms;
    const now = Date.now();
    if (now < ev.startTime) return "upcoming";
    if (now >= ev.startTime && now <= ev.endTime) return "live";
    return "finished";
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(e =>
      e.teamA.toLowerCase().includes(q) ||
      e.teamB.toLowerCase().includes(q) ||
      e.title.toLowerCase().includes(q) ||
      countries.find(c => c.id === e.countryId)?.name.toLowerCase().includes(q) ||
      new Date(e.startTime).toLocaleDateString().includes(q)
    );
  }, [events, searchQuery, countries]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSave = async () => {
    if (!form.teamA || !form.teamB) { toast.error("Team names required"); return; }
    if (!form.streamUrl) { toast.error("Stream URL required"); return; }
    if (!form.startTime || !form.endTime) { toast.error("Start and End time required"); return; }
    if (form.endTime <= form.startTime) { toast.error("End time must be after start time"); return; }

    try {
      const data = { ...form, title: `${form.teamA} vs ${form.teamB}` };
      if (editId) {
        await updateDocument("liveEvents", editId, data);
        toast.success("Event updated");
      } else {
        await addDocument("liveEvents", data);
        toast.success("Event added");
      }
      setForm(empty); setEditId(null); setShowForm(false);
    } catch { toast.error("Error saving"); }
  };

  const handleEdit = (ev: LiveEvent) => {
    const { id, ...rest } = ev;
    setForm({ ...rest, manualStatus: rest.manualStatus || "" });
    setEditId(id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await deleteDocument("liveEvents", id);
    toast.success("Event deleted");
  };

  const handleQuickStatus = async (id: string, status: "live" | "upcoming" | "finished" | "") => {
    await updateDocument("liveEvents", id, { manualStatus: status });
    toast.success(status ? `Status set to ${status}` : "Status set to auto");
  };

  const toLocalDatetime = (ts: number) => {
    if (!ts) return "";
    const d = new Date(ts);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };

  const fromLocalDatetime = (val: string) => {
    if (!val) return 0;
    return new Date(val).getTime();
  };

  const setStartNow = () => {
    const now = Date.now();
    setForm(f => ({ ...f, startTime: now, endTime: f.endTime || now + 7200000 }));
  };

  const applyDuration = (hours: number) => {
    if (!form.startTime) { toast.error("Set start time first"); return; }
    setForm(f => ({ ...f, endTime: f.startTime + hours * 3600000 }));
  };

  const inputCls = "px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <button onClick={() => { setShowForm(true); setForm(empty); setEditId(null); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all duration-300">
          <Plus className="w-4 h-4" /> Add Event
        </button>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input placeholder="Search..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }} className={`${inputCls} pl-9 w-full`} />
        </div>
      </div>

      {showForm && (
        <div className="glass-card neon-border p-5 space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-foreground text-sm">{editId ? "Edit" : "Add"} Live Event</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input placeholder="Team A Name" value={form.teamA} onChange={(e) => setForm({ ...form, teamA: e.target.value })} className={inputCls} />
            <input placeholder="Team A Logo URL" value={form.teamALogo} onChange={(e) => setForm({ ...form, teamALogo: e.target.value })} className={inputCls} />
            <input placeholder="Team B Name" value={form.teamB} onChange={(e) => setForm({ ...form, teamB: e.target.value })} className={inputCls} />
            <input placeholder="Team B Logo URL" value={form.teamBLogo} onChange={(e) => setForm({ ...form, teamBLogo: e.target.value })} className={inputCls} />
            <input placeholder="Stream URL" value={form.streamUrl} onChange={(e) => setForm({ ...form, streamUrl: e.target.value })} className={`${inputCls} sm:col-span-2`} />
            <select value={form.playerType} onChange={(e) => setForm({ ...form, playerType: e.target.value as any })} className={inputCls}>
              <option value="hls">HLS.js</option>
              <option value="dash">DASH (Shaka)</option>
              <option value="native">Native</option>
              <option value="iframe">Iframe</option>
              <option value="hls-retry">HLS Aggressive</option>
              <option value="external">External Mobile Player</option>
            </select>
            <select value={form.countryId} onChange={(e) => setForm({ ...form, countryId: e.target.value })} className={inputCls}>
              <option value="">Select Country</option>
              {countries.map((c) => <option key={c.id} value={c.id}>{c.flag} {c.name}</option>)}
            </select>

            {/* Start Time */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground">Start Time</label>
                <button onClick={setStartNow} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">Now</button>
              </div>
              <input
                type="datetime-local"
                value={toLocalDatetime(form.startTime)}
                onChange={(e) => setForm({ ...form, startTime: fromLocalDatetime(e.target.value) })}
                className={`${inputCls} w-full`}
              />
            </div>

            {/* End Time */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground">End Time</label>
                <div className="flex gap-1">
                  {DURATION_PRESETS.map(p => (
                    <button key={p.label} onClick={() => applyDuration(p.hours)} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors font-medium">
                      +{p.label}
                    </button>
                  ))}
                </div>
              </div>
              <input
                type="datetime-local"
                value={toLocalDatetime(form.endTime)}
                onChange={(e) => setForm({ ...form, endTime: fromLocalDatetime(e.target.value) })}
                className={`${inputCls} w-full`}
              />
            </div>

            {/* Manual Status Override */}
            <div className="sm:col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Status Override (leave Auto for time-based)</label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { val: "" as const, label: "Auto", cls: "bg-secondary text-foreground" },
                  { val: "live" as const, label: "🔴 LIVE", cls: "bg-destructive/15 text-destructive border-destructive/30" },
                  { val: "upcoming" as const, label: "⏳ Upcoming", cls: "bg-primary/10 text-primary border-primary/30" },
                  { val: "finished" as const, label: "✅ Finished", cls: "bg-muted text-muted-foreground" },
                ].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => setForm({ ...form, manualStatus: opt.val })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      form.manualStatus === opt.val ? `${opt.cls} ring-2 ring-primary/40` : "bg-secondary/50 text-muted-foreground border-border/50 hover:border-border"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-6 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="rounded" />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                Active
              </label>
            </div>
          </div>
          <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all duration-300 text-sm">
            <Save className="w-4 h-4" /> {editId ? "Update" : "Save"}
          </button>
        </div>
      )}

      {/* List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No live events found</p>
        ) : paginated.map((ev) => {
          const status = getStatus(ev);
          const country = countries.find(c => c.id === ev.countryId);
          const teamAName = typeof ev.teamA === "object" ? (ev.teamA as any)?.name || "" : String(ev.teamA || "");
          const teamBName = typeof ev.teamB === "object" ? (ev.teamB as any)?.name || "" : String(ev.teamB || "");
          const teamAImg = typeof ev.teamA === "object" ? (ev.teamA as any)?.logo : ev.teamALogo;
          const teamBImg = typeof ev.teamB === "object" ? (ev.teamB as any)?.logo : ev.teamBLogo;
                    const ms = ev.manualStatus;
                    const isManual = ms === "live" || ms === "upcoming" || ms === "finished";
          return (
            <div key={ev.id} className={`glass-card p-3 flex items-center justify-between gap-2 ${ev.isFeatured ? "neon-border" : ""}`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-1 shrink-0">
                  {teamAImg && <img src={teamAImg} alt="" className="w-7 h-7 rounded-full object-cover" />}
                  <span className="text-[10px] text-muted-foreground font-bold">vs</span>
                  {teamBImg && <img src={teamBImg} alt="" className="w-7 h-7 rounded-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{teamAName} vs {teamBName}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground flex-wrap">
                    {status === "live" && <span className="text-destructive font-bold animate-pulse">🔴 LIVE</span>}
                    {status === "upcoming" && <span className="text-primary font-medium">⏳ Upcoming</span>}
                    {status === "finished" && <span>Ended</span>}
                    {isManual && <span className="bg-accent/20 text-accent-foreground px-1 rounded text-[9px]">manual</span>}
                    {country && <span>{country.flag}</span>}
                    <span>{new Date(ev.startTime).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {/* Quick status buttons */}
                <button onClick={() => handleQuickStatus(ev.id, status === "live" ? "" : "live")} title="Toggle LIVE" className={`p-1.5 rounded text-[10px] font-bold transition-colors ${status === "live" ? "bg-destructive/15 text-destructive" : "hover:bg-secondary text-muted-foreground"}`}>
                  🔴
                </button>
                <button onClick={() => handleEdit(ev)} className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Edit className="w-3.5 h-3.5" /></button>
                <button onClick={() => handleDelete(ev.id)} className="p-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg hover:bg-secondary disabled:opacity-40 text-foreground transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm text-muted-foreground">Page {page} / {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg hover:bg-secondary disabled:opacity-40 text-foreground transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
      )}
    </div>
  );
};

export default LiveEventManager;
