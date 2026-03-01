import { useState, useMemo } from "react";
import { useLiveEvents, useCountries, addDocument, updateDocument, deleteDocument, LiveEvent } from "@/hooks/useFirestore";
import { Plus, Trash2, Edit, Save, X, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

const empty: Omit<LiveEvent, "id"> = {
  title: "", teamA: "", teamALogo: "", teamB: "", teamBLogo: "",
  streamUrl: "", playerType: "hls", startTime: 0, endTime: 0,
  countryId: "", isFeatured: false, isActive: true, createdAt: 0
};

const PAGE_SIZE = 10;

const LiveEventManager = () => {
  const { data: events } = useLiveEvents();
  const { data: countries } = useCountries();
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

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
    setForm(rest);
    setEditId(id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await deleteDocument("liveEvents", id);
    toast.success("Event deleted");
  };

  const getStatus = (ev: LiveEvent) => {
    const now = Date.now();
    if (now < ev.startTime) return "upcoming";
    if (now >= ev.startTime && now <= ev.endTime) return "live";
    return "finished";
  };

  const toLocalDatetime = (ts: number) => {
    if (!ts) return "";
    return new Date(ts).toISOString().slice(0, 16);
  };

  const inputCls = "px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <button onClick={() => { setShowForm(true); setForm(empty); setEditId(null); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all duration-300">
          <Plus className="w-4 h-4" /> Add Live Event
        </button>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search team, country, date..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className={`${inputCls} pl-9 w-full`}
          />
        </div>
      </div>

      {showForm && (
        <div className="glass-card neon-border p-6 space-y-4 animate-fade-in">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-foreground">{editId ? "Edit" : "Add"} Live Event</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            </select>
            <select value={form.countryId} onChange={(e) => setForm({ ...form, countryId: e.target.value })} className={inputCls}>
              <option value="">Select Country</option>
              {countries.map((c) => <option key={c.id} value={c.id}>{c.flag} {c.name}</option>)}
            </select>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Start Time</label>
              <input
                type="datetime-local"
                value={toLocalDatetime(form.startTime)}
                onChange={(e) => setForm({ ...form, startTime: new Date(e.target.value).getTime() })}
                className={`${inputCls} w-full`}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">End Time</label>
              <input
                type="datetime-local"
                value={toLocalDatetime(form.endTime)}
                onChange={(e) => setForm({ ...form, endTime: new Date(e.target.value).getTime() })}
                className={`${inputCls} w-full`}
              />
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
          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all duration-300">
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
          return (
            <div key={ev.id} className={`glass-card p-4 flex items-center justify-between ${ev.isFeatured ? "neon-border" : ""}`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-1 shrink-0">
                  {teamAImg && <img src={teamAImg} alt="" className="w-8 h-8 rounded-full object-cover" />}
                  <span className="text-xs text-muted-foreground font-bold">vs</span>
                  {teamBImg && <img src={teamBImg} alt="" className="w-8 h-8 rounded-full object-cover" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{teamAName} vs {teamBName}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {status === "live" && <span className="text-[hsl(var(--primary))] font-bold animate-pulse">🔴 LIVE</span>}
                    {status === "upcoming" && <span className="text-accent-foreground">⏳ Upcoming</span>}
                    {status === "finished" && <span className="text-muted-foreground">Ended</span>}
                    {country && <span>{country.flag}</span>}
                    <span>{new Date(ev.startTime).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleEdit(ev)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(ev.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
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
