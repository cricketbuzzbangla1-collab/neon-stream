import { useState, useMemo } from "react";
import { useLiveEvents, useCountries, addDocument, updateDocument, deleteDocument, LiveEvent } from "@/hooks/useFirestore";
import { useFootballMatches, FootballMatch, ALLOWED_LEAGUES } from "@/hooks/useFootballAPI";
import { Plus, Trash2, Edit, Save, X, Search, ChevronLeft, ChevronRight, Zap, Link as LinkIcon, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { doc, updateDoc as fbUpdateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const empty: Omit<LiveEvent, "id"> = {
  title: "", teamA: "", teamALogo: "", teamB: "", teamBLogo: "",
  streamUrl: "", playerType: "hls", startTime: 0, endTime: 0,
  countryId: "", isFeatured: false, isActive: true, manualStatus: "", createdAt: 0
};

const PAGE_SIZE = 10;

const DURATION_PRESETS = [
  { label: "1h", hours: 1 },
  { label: "1.5h", hours: 1.5 },
  { label: "2h", hours: 2 },
  { label: "3h", hours: 3 },
];

const LiveEventManager = () => {
  const { data: events } = useLiveEvents();
  const { data: countries } = useCountries();
  const { matches: apiMatches, loading: apiLoading, enabled: apiEnabled, disabledLeagues } = useFootballMatches();
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [streamInputs, setStreamInputs] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"manual" | "api" | "leagues">("api");
  const [hiddenMatches, setHiddenMatches] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(localStorage.getItem("hidden_matches") || "[]")); } catch { return new Set(); }
  });

  const toggleLeague = async (leagueId: string) => {
    const newDisabled = disabledLeagues.includes(leagueId)
      ? disabledLeagues.filter(id => id !== leagueId)
      : [...disabledLeagues, leagueId];
    try {
      await fbUpdateDoc(doc(db, "appSettings", "main"), { disabledLeagues: newDisabled });
      toast.success(newDisabled.includes(leagueId) ? "League hidden" : "League enabled");
    } catch {
      toast.error("Failed to update");
    }
  };

  const toggleMatchVisibility = (matchId: string) => {
    setHiddenMatches(prev => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      localStorage.setItem("hidden_matches", JSON.stringify([...next]));
      return next;
    });
  };

  const getStatus = (ev: LiveEvent) => {
    const ms = ev.manualStatus;
    if (ms === "live" || ms === "upcoming" || ms === "finished") return ms;
    const now = Date.now();
    if (now < ev.startTime) return "upcoming";
    if (now >= ev.startTime && now <= ev.endTime) return "live";
    return "finished";
  };

  // Check if API match already imported
  const isAlreadyImported = (match: FootballMatch) => {
    return events.some(ev => {
      const evA = String(ev.teamA || "").toLowerCase();
      const evB = String(ev.teamB || "").toLowerCase();
      const home = match.homeTeam.toLowerCase();
      const away = match.awayTeam.toLowerCase();
      return (evA.includes(home) || home.includes(evA)) &&
             (evB.includes(away) || away.includes(evB)) &&
             evA.length > 2 && evB.length > 2;
    });
  };

  // Find matching existing event for an API match
  const findMatchingEvent = (match: FootballMatch) => {
    return events.find(ev => {
      const evA = String(ev.teamA || "").toLowerCase();
      const evB = String(ev.teamB || "").toLowerCase();
      const home = match.homeTeam.toLowerCase();
      const away = match.awayTeam.toLowerCase();
      return (evA.includes(home) || home.includes(evA)) &&
             (evB.includes(away) || away.includes(evB)) &&
             evA.length > 2 && evB.length > 2;
    });
  };

  // Import API match to Live Events
  const handleImportMatch = async (match: FootballMatch) => {
    setImportingId(match.id);
    try {
      const [year, month, day] = match.matchDate.split("-").map(Number);
      const [hour, minute] = match.matchTime.split(":").map(Number);
      const startTime = new Date(year, month - 1, day, hour, minute).getTime();
      const endTime = startTime + 2 * 3600000;
      const streamUrl = streamInputs[match.id] || "";

      await addDocument("liveEvents", {
        title: `${match.homeTeam} vs ${match.awayTeam}`,
        teamA: match.homeTeam,
        teamALogo: match.homeLogo,
        teamB: match.awayTeam,
        teamBLogo: match.awayLogo,
        streamUrl,
        playerType: "hls",
        startTime,
        endTime,
        countryId: "",
        isFeatured: true,
        isActive: true,
        manualStatus: match.isLive ? "live" : "",
        league: match.league,
        leagueLogo: match.leagueLogo,
      });
      toast.success(`✅ ${match.homeTeam} vs ${match.awayTeam} added!`);
      setStreamInputs(prev => { const n = { ...prev }; delete n[match.id]; return n; });
    } catch {
      toast.error("Import failed");
    } finally {
      setImportingId(null);
    }
  };

  // Update stream URL on existing imported event
  const handleUpdateStream = async (match: FootballMatch) => {
    const existing = findMatchingEvent(match);
    if (!existing) return;
    const url = streamInputs[match.id];
    if (!url) { toast.error("Enter stream URL first"); return; }
    try {
      await updateDocument("liveEvents", existing.id, { streamUrl: url });
      toast.success("Stream URL updated!");
      setStreamInputs(prev => { const n = { ...prev }; delete n[match.id]; return n; });
    } catch {
      toast.error("Update failed");
    }
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(e =>
      String(e.teamA || "").toLowerCase().includes(q) ||
      String(e.teamB || "").toLowerCase().includes(q) ||
      e.title.toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Filter API matches
  const activeApiMatches = apiMatches.filter(m =>
    m.matchStatus !== "Finished" && m.matchStatus !== "After Pens." && m.matchStatus !== "After ET"
  );

  const handleSave = async () => {
    if (!form.teamA || !form.teamB) { toast.error("Team names required"); return; }
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
    setActiveTab("manual");
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
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("api")}
          className={`px-4 py-2 rounded-t-lg text-sm font-bold transition-colors whitespace-nowrap ${
            activeTab === "api"
              ? "bg-primary/15 text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          ⚽ API Matches ({activeApiMatches.filter(m => !hiddenMatches.has(m.id)).length})
        </button>
        <button
          onClick={() => setActiveTab("leagues")}
          className={`px-4 py-2 rounded-t-lg text-sm font-bold transition-colors whitespace-nowrap ${
            activeTab === "leagues"
              ? "bg-primary/15 text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          🏆 Leagues ({Object.keys(ALLOWED_LEAGUES).length - disabledLeagues.length}/{Object.keys(ALLOWED_LEAGUES).length})
        </button>
        <button
          onClick={() => setActiveTab("manual")}
          className={`px-4 py-2 rounded-t-lg text-sm font-bold transition-colors whitespace-nowrap ${
            activeTab === "manual"
              ? "bg-primary/15 text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          📋 Live Events ({events.length})
        </button>
      </div>

      {/* ===== LEAGUES TAB ===== */}
      {activeTab === "leagues" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">
            <Zap className="w-4 h-4 text-primary shrink-0" />
            <span>লীগ ON/OFF করুন। বন্ধ করা লীগের ম্যাচ Homepage-এ দেখাবে না।</span>
          </div>
          <div className="space-y-2">
            {Object.entries(ALLOWED_LEAGUES).map(([id, info]) => {
              const isEnabled = !disabledLeagues.includes(id);
              return (
                <div key={id} className={`glass-card p-3 flex items-center justify-between gap-3 ${isEnabled ? "ring-1 ring-primary/20" : "opacity-60"}`}>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground">{info.name}</p>
                    <p className="text-[10px] text-muted-foreground">{info.country} • ID: {id}</p>
                  </div>
                  <button
                    onClick={() => toggleLeague(id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                      isEnabled
                        ? "bg-primary/15 text-primary hover:bg-primary/25"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {isEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {isEnabled ? "ON" : "OFF"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===== API MATCHES TAB ===== */}
      {activeTab === "api" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">
            <Zap className="w-4 h-4 text-primary shrink-0" />
            <span>API থেকে আসা ম্যাচগুলো। Stream URL দিয়ে <strong>Import</strong> করলে Homepage-এ Watch বাটন দেখাবে।</span>
          </div>

          {apiLoading ? (
            <div className="py-8 text-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : !apiEnabled ? (
            <p className="text-sm text-muted-foreground text-center py-8">Football API disabled. Enable in Settings.</p>
          ) : activeApiMatches.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No upcoming/live matches from API right now.</p>
          ) : (
            <div className="space-y-2">
              {activeApiMatches.map(match => {
                const imported = isAlreadyImported(match);
                const existingEvent = imported ? findMatchingEvent(match) : null;
                const hasStream = existingEvent?.streamUrl ? true : false;

                return (
                  <div key={match.id} className={`glass-card p-3 space-y-2 ${imported ? "ring-1 ring-primary/30" : ""}`}>
                    {/* Match header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {match.leagueLogo && <img src={match.leagueLogo} alt="" className="w-4 h-4 object-contain rounded-sm shrink-0" />}
                        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider truncate">{match.league}</span>
                        {match.isLive && <span className="text-[9px] text-destructive font-bold animate-pulse">🔴 LIVE {match.matchStatus}'</span>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {imported && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">
                            {hasStream ? "✅ Ready" : "⚠️ No Stream"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Teams */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        {match.homeLogo && <img src={match.homeLogo} alt="" className="w-6 h-6 object-contain shrink-0" />}
                        <span className="text-xs font-bold text-foreground truncate">{match.homeTeam}</span>
                      </div>
                      <div className="shrink-0 text-center">
                        {match.homeScore || match.awayScore ? (
                          <span className={`text-sm font-black ${match.isLive ? "text-destructive" : "text-foreground"}`}>
                            {match.homeScore} - {match.awayScore}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono">{match.matchTime}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                        <span className="text-xs font-bold text-foreground truncate text-right">{match.awayTeam}</span>
                        {match.awayLogo && <img src={match.awayLogo} alt="" className="w-6 h-6 object-contain shrink-0" />}
                      </div>
                    </div>

                    {/* Stream URL input + Action */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                        <input
                          placeholder={hasStream ? existingEvent?.streamUrl : "Stream URL (paste here)"}
                          value={streamInputs[match.id] || ""}
                          onChange={(e) => setStreamInputs(prev => ({ ...prev, [match.id]: e.target.value }))}
                          className="w-full pl-7 pr-2 py-1.5 rounded-lg bg-secondary border border-border text-foreground text-[11px] placeholder:text-muted-foreground/50"
                        />
                      </div>
                      {imported ? (
                        <button
                          onClick={() => handleUpdateStream(match)}
                          disabled={!streamInputs[match.id]}
                          className="px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-[10px] font-bold hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
                        >
                          Update
                        </button>
                      ) : (
                        <button
                          onClick={() => handleImportMatch(match)}
                          disabled={importingId === match.id}
                          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[10px] font-bold hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0 flex items-center gap-1"
                        >
                          <Plus className="w-3 h-3" /> {importingId === match.id ? "..." : "Import"}
                        </button>
                      )}
                    </div>

                    <div className="text-[9px] text-muted-foreground/60">
                      {match.matchDate} • {match.stadium || "TBD"}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== MANUAL EVENTS TAB ===== */}
      {activeTab === "manual" && (
        <>
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

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs text-muted-foreground">Start Time</label>
                    <button onClick={setStartNow} className="text-[10px] px-2 py-0.5 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">Now</button>
                  </div>
                  <input type="datetime-local" value={toLocalDatetime(form.startTime)} onChange={(e) => setForm({ ...form, startTime: fromLocalDatetime(e.target.value) })} className={`${inputCls} w-full`} />
                </div>

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
                  <input type="datetime-local" value={toLocalDatetime(form.endTime)} onChange={(e) => setForm({ ...form, endTime: fromLocalDatetime(e.target.value) })} className={`${inputCls} w-full`} />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Status Override</label>
                  <div className="flex gap-2 flex-wrap">
                    {[
                      { val: "" as const, label: "Auto", cls: "bg-secondary text-foreground" },
                      { val: "live" as const, label: "🔴 LIVE", cls: "bg-destructive/15 text-destructive border-destructive/30" },
                      { val: "upcoming" as const, label: "⏳ Upcoming", cls: "bg-primary/10 text-primary border-primary/30" },
                      { val: "finished" as const, label: "✅ Finished", cls: "bg-muted text-muted-foreground" },
                    ].map(opt => (
                      <button key={opt.val} onClick={() => setForm({ ...form, manualStatus: opt.val })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          form.manualStatus === opt.val ? `${opt.cls} ring-2 ring-primary/40` : "bg-secondary/50 text-muted-foreground border-border/50 hover:border-border"
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-6 sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="rounded" /> Featured
                  </label>
                  <label className="flex items-center gap-2 text-sm text-foreground">
                    <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" /> Active
                  </label>
                </div>
              </div>
              <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all duration-300 text-sm">
                <Save className="w-4 h-4" /> {editId ? "Update" : "Save"}
              </button>
            </div>
          )}

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">No live events found</p>
            ) : paginated.map((ev) => {
              const status = getStatus(ev);
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
                        {ev.streamUrl ? (
                          <span className="text-primary text-[9px]">🔗 Stream set</span>
                        ) : (
                          <span className="text-destructive/60 text-[9px]">⚠ No stream</span>
                        )}
                        <span>{new Date(ev.startTime).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleQuickStatus(ev.id, status === "live" ? "" : "live")} title="Toggle LIVE"
                      className={`p-1.5 rounded text-[10px] font-bold transition-colors ${status === "live" ? "bg-destructive/15 text-destructive" : "hover:bg-secondary text-muted-foreground"}`}>
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
        </>
      )}
    </div>
  );
};

export default LiveEventManager;
