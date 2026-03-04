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
    noticeEnabled: true,
    noticeType: "info" as "info" | "warning" | "success",
    noticeLink: "",
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
          noticeEnabled: data.noticeEnabled !== false,
          noticeType: data.noticeType || "info",
          noticeLink: data.noticeLink || "",
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

  const inputCls = "w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm";

  return (
    <div className="glass-card neon-border p-6 space-y-6 max-w-lg">
      <h3 className="font-display font-bold text-foreground">Site Settings</h3>

      {/* General */}
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Site Name</label>
          <input value={form.siteName} onChange={(e) => setForm({ ...form, siteName: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Logo URL</label>
          <input value={form.logo} onChange={(e) => setForm({ ...form, logo: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Telegram URL</label>
          <input value={form.telegramUrl} onChange={(e) => setForm({ ...form, telegramUrl: e.target.value })} className={inputCls} />
        </div>
      </div>

      {/* Notice Bar */}
      <div className="space-y-3 p-4 rounded-xl bg-secondary/50 border border-border/50">
        <h4 className="text-sm font-semibold text-foreground">📢 Notice Bar</h4>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={form.noticeEnabled} onChange={(e) => setForm({ ...form, noticeEnabled: e.target.checked })} className="rounded" />
          Enable Notice Bar
        </label>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Notice Text</label>
          <textarea value={form.notice} onChange={(e) => setForm({ ...form, notice: e.target.value })} className={`${inputCls} min-h-[60px] resize-y`} placeholder="Enter notice text..." />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Notice Type</label>
          <select value={form.noticeType} onChange={(e) => setForm({ ...form, noticeType: e.target.value as any })} className={inputCls}>
            <option value="info">ℹ️ Info (Blue)</option>
            <option value="warning">⚠️ Warning (Orange)</option>
            <option value="success">✅ Success (Green)</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Notice Link (optional, makes bar clickable)</label>
          <input value={form.noticeLink} onChange={(e) => setForm({ ...form, noticeLink: e.target.value })} className={inputCls} placeholder="https://..." />
        </div>
      </div>

      {/* Theme & Ads */}
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Default Theme</label>
          <select value={form.defaultTheme} onChange={(e) => setForm({ ...form, defaultTheme: e.target.value })} className={inputCls}>
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
