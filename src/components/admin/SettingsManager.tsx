import { useState, useEffect } from "react";
import { useSettings, addDocument, updateDocument } from "@/hooks/useFirestore";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Save } from "lucide-react";
import { toast } from "sonner";

const SettingsManager = () => {
  const { settings, loading } = useSettings();
  const [form, setForm] = useState({
    siteName: "LiveTV",
    logo: "",
    telegramUrl: "",
    notice: "",
    defaultTheme: "dark-neon",
    adsEnabled: false,
  });
  const [settingsId, setSettingsId] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setForm({
        siteName: (settings as any).siteName || "LiveTV",
        logo: (settings as any).logo || "",
        telegramUrl: (settings as any).telegramUrl || "",
        notice: (settings as any).notice || "",
        defaultTheme: (settings as any).defaultTheme || "dark-neon",
        adsEnabled: (settings as any).adsEnabled || false,
      });
      setSettingsId((settings as any).id);
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      if (settingsId) {
        await updateDocument("settings", settingsId, form);
      } else {
        const doc = await addDocument("settings", form);
        setSettingsId(doc.id);
      }
      toast.success("Settings saved");
    } catch { toast.error("Error saving"); }
  };

  return (
    <div className="glass-card neon-border p-6 space-y-4 max-w-lg">
      <h3 className="font-display font-bold text-foreground">App Settings</h3>
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
