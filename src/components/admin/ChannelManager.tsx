import { useState } from "react";
import { useChannels, useCategories, useCountries, addDocument, updateDocument, deleteDocument, Channel } from "@/hooks/useFirestore";
import { Plus, Trash2, Edit, Save, X } from "lucide-react";
import { toast } from "sonner";

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
      <button onClick={() => { setShowForm(true); setForm(empty); setEditId(null); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all duration-300">
        <Plus className="w-4 h-4" /> Add Channel
      </button>

      {showForm && (
        <div className="glass-card neon-border p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-foreground">{editId ? "Edit" : "Add"} Channel</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input placeholder="Channel Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm" />
            <input placeholder="Logo URL" value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm" />
            <input placeholder="Stream URL" value={form.streamUrl} onChange={(e) => setForm({ ...form, streamUrl: e.target.value })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm sm:col-span-2" />
            <select value={form.playerType} onChange={(e) => setForm({ ...form, playerType: e.target.value as any })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm">
              <option value="hls">HLS.js</option>
              <option value="dash">DASH (Shaka)</option>
              <option value="native">Native</option>
              <option value="iframe">Iframe</option>
              <option value="hls-retry">HLS Aggressive</option>
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
        {channels.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No channels added yet</p>
        ) : channels.map((ch) => (
          <div key={ch.id} className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {ch.logo && <img src={ch.logo} alt="" className="w-10 h-10 rounded-lg object-cover" />}
              <div>
                <p className="text-sm font-semibold text-foreground">{ch.name}</p>
                <p className="text-xs text-muted-foreground">{ch.playerType} • {ch.isLive ? "🔴 Live" : "Offline"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(ch)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Edit className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(ch.id)} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChannelManager;
