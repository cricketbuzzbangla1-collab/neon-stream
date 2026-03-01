import { useState } from "react";
import { useAds, addDocument, updateDocument, deleteDocument, Ad } from "@/hooks/useFirestore";
import { Plus, Trash2, Edit, Save, X, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";

const adTypes = [
  { value: "banner-top", label: "Banner Top" },
  { value: "banner-bottom", label: "Banner Bottom" },
  { value: "in-feed", label: "In-Feed" },
  { value: "watch-banner", label: "Watch Page Banner" },
  { value: "pre-roll", label: "Video Pre-Roll" },
  { value: "interstitial", label: "Interstitial" },
  { value: "popup", label: "Popup Modal" },
  { value: "sticky", label: "Sticky Floating" },
];

const emptyAd = {
  title: "", adType: "banner-top" as Ad["adType"], adCode: "", isActive: false,
  position: "", frequency: 1, deviceTarget: "all" as Ad["deviceTarget"],
  countryTarget: "", startDate: "", endDate: "", createdAt: 0
};

const AdManager = () => {
  const { data: ads } = useAds();
  const [form, setForm] = useState(emptyAd);
  const [editId, setEditId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleSave = async () => {
    if (!form.title) { toast.error("Title required"); return; }
    if (form.adCode.length > 5000) { toast.error("Ad code too long (max 5000 chars)"); return; }
    try {
      if (editId) {
        await updateDocument("ads", editId, form);
      } else {
        await addDocument("ads", form);
      }
      toast.success("Saved");
      setForm(emptyAd); setEditId(null); setShowForm(false);
    } catch { toast.error("Error"); }
  };

  const toggleActive = async (ad: Ad) => {
    await updateDocument("ads", ad.id, { isActive: !ad.isActive });
    toast.success(ad.isActive ? "Disabled" : "Enabled");
  };

  return (
    <div className="space-y-4">
      <button onClick={() => { setShowForm(true); setEditId(null); setForm(emptyAd); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all duration-300">
        <Plus className="w-4 h-4" /> Add Ad Slot
      </button>

      {showForm && (
        <div className="glass-card neon-border p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-foreground">{editId ? "Edit" : "Add"} Ad</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input placeholder="Ad Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm" />
            <select value={form.adType} onChange={(e) => setForm({ ...form, adType: e.target.value as any })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm">
              {adTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <textarea placeholder="Ad HTML/JS Code" value={form.adCode} onChange={(e) => setForm({ ...form, adCode: e.target.value })} rows={4} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm sm:col-span-2 font-mono" maxLength={5000} />
            <select value={form.deviceTarget} onChange={(e) => setForm({ ...form, deviceTarget: e.target.value as any })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm">
              <option value="all">All Devices</option>
              <option value="mobile">Mobile Only</option>
              <option value="desktop">Desktop Only</option>
            </select>
            <input type="number" placeholder="Frequency" min={1} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: Number(e.target.value) })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm" />
            <input placeholder="Country Target" value={form.countryTarget} onChange={(e) => setForm({ ...form, countryTarget: e.target.value })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm" />
            <input placeholder="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm" />
            <input type="date" placeholder="Start Date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
            <input type="date" placeholder="End Date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
              Active
            </label>
          </div>
          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all duration-300">
            <Save className="w-4 h-4" /> Save
          </button>
        </div>
      )}

      <div className="space-y-2">
        {ads.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">No ads configured</p>
        ) : ads.map((ad) => (
          <div key={ad.id} className="glass-card p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{ad.title}</p>
              <p className="text-xs text-muted-foreground">{ad.adType} • {ad.deviceTarget} • {ad.isActive ? "🟢 Active" : "⚫ Inactive"}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => toggleActive(ad)} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground">
                {ad.isActive ? <ToggleRight className="w-5 h-5 text-neon-green" /> : <ToggleLeft className="w-5 h-5" />}
              </button>
              <button onClick={() => { const { id, ...rest } = ad; setForm(rest); setEditId(id); setShowForm(true); }} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground"><Edit className="w-4 h-4" /></button>
              <button onClick={() => deleteDocument("ads", ad.id).then(() => toast.success("Deleted"))} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdManager;
