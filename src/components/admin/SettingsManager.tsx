import { useState, useEffect } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Save } from "lucide-react";
import { toast } from "sonner";

const SettingsManager = () => {
  const [form, setForm] = useState({
    siteName: "LiveTV",
    logo: "",
    telegramUrl: "",
    notice: "",
    defaultTheme: "dark-neon",
    adsEnabled: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "appSettings", "main"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setForm({
          siteName: data.siteName || "LiveTV",
          logo: data.logo || "",
          telegramUrl: data.telegramUrl || "",
          notice: data.notice || "",
          defaultTheme: data.defaultTheme || "dark-neon",
          adsEnabled: data.adsEnabled || false,
        });
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSave = async () => {
    try {
      await setDoc(doc(db, "appSettings", "main"), { ...form, updatedAt: Date.now() }, { merge: true });
      toast.success("Settings saved");
    } catch (err: any) {
      toast.error("Error saving: " + (err?.message || "Unknown"));
    }
  };

  if (loading) return <div className="glass-card p-6"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  return (
    <div className="glass-card neon-border p-6 space-y-4 max-w-lg">
      <h3 className="font-display font-bold text-foreground">Site Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Site Name</label>
          <input value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Logo URL</label>
          <input value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Telegram URL</label>
          <input value={form.telegramUrl} onChange={(e) => setForm({ ...form, telegramUrl: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Notice Bar Text</label>
          <input value={form.notice} onChange={(e) => setForm({ ...form, notice: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Default Theme</label>
          <select value={form.defaultTheme} onChange={(e) => setForm({ ...form, defaultTheme: e.target.value })} className="w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm">
            <option value="dark-neon">Dark Neon</option>
            <option value="dark-blue">Dark Blue</option>
            <option value="amoled">AMOLED</option>
            <option value="light">Light</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={form.adsEnabled} onChange={(e) => setForm({ ...form, adsEnabled: e.target.checked })} className="rounded" />
          Enable Ads Globally
        </label>
      </div>
      <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all duration-300">
        <Save className="w-4 h-4" /> Save Settings
      </button>
    </div>
  );
};

export default SettingsManager;
