import { useState } from "react";
import { useChannels, useCategories, useCountries, addDocument, updateDocument, deleteDocument, Channel } from "@/hooks/useFirestore";
import { Plus, Trash2, Edit, Save, X, Search } from "lucide-react";
import { toast } from "sonner";
import { detectPlayerType } from "@/lib/detectPlayerType";

const empty: Omit<Channel, "id"> = {
  name: "", logo: "", streamUrl: "", playerType: "hls",
  categoryId: "", countryId: "", isFeatured: false, isLive: false, order: 0, createdAt: 0
};

const ChannelManager = () => {
  const { data: channels } = useChannels();
  const { data: categories } = useCategories();
  const { data: countries } = useCountries();
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [protocolFilter, setProtocolFilter] = useState<"all" | "http" | "https">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = channels.filter(ch => {
    const matchSearch = ch.name?.toLowerCase().includes(search.toLowerCase()) ||
      ch.streamUrl?.toLowerCase().includes(search.toLowerCase());
    const matchProtocol = protocolFilter === "all" ||
      (protocolFilter === "http" && ch.streamUrl?.startsWith("http://")) ||
      (protocolFilter === "https" && ch.streamUrl?.startsWith("https://"));
    return matchSearch && matchProtocol;
  });

  const httpCount = channels.filter(c => c.streamUrl?.startsWith("http://")).length;
  const httpsCount = channels.filter(c => c.streamUrl?.startsWith("https://")).length;

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    try {
      await Promise.all([...selectedIds].map(id => deleteDocument("channels", id)));
      setSelectedIds(new Set());
      toast.success(`${count} channels deleted`);
    } catch { toast.error("Error deleting channels"); }
  };

  const handleSave = async () => {
    if (!form.name || !form.streamUrl) { toast.error("Name and Stream URL required"); return; }
    try {
      if (editId) {
        await updateDocument("channels", editId, form);
        toast.success("Channel updated");
      } else {
        await addDocument("channels", form);
        toast.success("Channel added");
      }
      setForm(empty); setEditId(null); setShowForm(false);
    } catch { toast.error("Error saving"); }
  };

  const handleEdit = (ch: Channel) => {
    const { id, ...rest } = ch;
    setForm(rest);
    setEditId(id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    await deleteDocument("channels", id);
    toast.success("Channel deleted");
  };

  return (
    <div className="space-y-4">
      {/* Protocol stats */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setProtocolFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${protocolFilter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:opacity-80"}`}>
          All ({channels.length})
        </button>
        <button onClick={() => setProtocolFilter("https")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${protocolFilter === "https" ? "bg-emerald-600 text-white" : "bg-emerald-500/10 text-emerald-500 hover:opacity-80"}`}>
          🔒 HTTPS ({httpsCount})
        </button>
        <button onClick={() => setProtocolFilter("http")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${protocolFilter === "http" ? "bg-amber-600 text-white" : "bg-amber-500/10 text-amber-500 hover:opacity-80"}`}>
          ⚠️ HTTP ({httpCount})
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => { setShowForm(true); setForm(empty); setEditId(null); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all duration-300">
          <Plus className="w-4 h-4" /> Add Channel
        </button>
        {selectedIds.size > 0 && (
          <button onClick={handleBulkDelete} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground font-medium hover:opacity-90 transition-all duration-300">
            <Trash2 className="w-4 h-4" /> Delete Selected ({selectedIds.size})
          </button>
        )}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search channels..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* Select all toggle */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="rounded" />
          <span className="text-muted-foreground">Select all ({filtered.length})</span>
        </div>
      )}

      {showForm && (
        <div className="glass-card neon-border p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-foreground">{editId ? "Edit" : "Add"} Channel</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input placeholder="Channel Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm" />
            <input placeholder="Logo URL" value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm" />
            <input placeholder="Stream URL" value={form.streamUrl} onChange={(e) => {
              const url = e.target.value;
              setForm({ ...form, streamUrl: url, playerType: detectPlayerType(url) });
            }} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm sm:col-span-2" />
            <select value={form.playerType} onChange={(e) => setForm({ ...form, playerType: e.target.value as any })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm">
              <option value="hls">HLS.js</option>
              <option value="dash">DASH (Shaka)</option>
              <option value="native">Native</option>
              <option value="iframe">Iframe</option>
              <option value="hls-retry">HLS Aggressive</option>
              <option value="external">External Mobile Player (HTTP M3U8)</option>
            </select>
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm">
              <option value="">Select Category</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={form.countryId} onChange={(e) => setForm({ ...form, countryId: e.target.value })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm">
              <option value="">Select Country</option>
              {countries.map((c) => <option key={c.id} value={c.id}>{c.flag} {c.name}</option>)}
            </select>
            <div className="flex items-center gap-4 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} className="rounded" />
                Featured
              </label>
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={form.isLive} onChange={(e) => setForm({ ...form, isLive: e.target.checked })} className="rounded" />
                Live
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
          <p className="text-sm text-muted-foreground py-8 text-center">
            {search ? "No channels match your search" : "No channels added yet"}
          </p>
        ) : filtered.map((ch) => {
          const isHttp = ch.streamUrl?.startsWith("http://");
          return (
            <div key={ch.id} className={`glass-card p-4 flex items-center justify-between ${isHttp ? "border border-amber-500/20" : ""}`}>
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={selectedIds.has(ch.id)} onChange={() => toggleSelect(ch.id)} className="rounded shrink-0" />
                {ch.logo && <img src={ch.logo} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{ch.name}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${isHttp ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                      {isHttp ? "HTTP" : "HTTPS"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate max-w-[250px]">{ch.streamUrl}</p>
                  <p className="text-xs text-muted-foreground">{ch.playerType} • {ch.isLive ? "🔴 Live" : "Offline"}</p>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleEdit(ch)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Edit className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(ch.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChannelManager;
