import { useState, useEffect } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Save } from "lucide-react";
import { toast } from "sonner";
import type { ApiProvider } from "@/hooks/useFootballAPI";

const SettingsManager = () => {
  const [form, setForm] = useState({
    siteName: "LiveTV",
    logo: "",
    telegramUrl: "",
    noticeBarEnabled: true,
    noticeText: "",
    noticeType: "info" as "info" | "warning" | "success",
    noticeLink: "",
    defaultTheme: "dark-neon",
    adsEnabled: false,
    footballApiKey: "10144b1b1c0934e60629f08a37064aec805f0a3b4fa6488a654ff791ef86aac7",
    footballdataApiKey: "e4df9b4f6d364f2d9950728666d9a897",
    footballApiEnabled: true,
    footballApiCallsPerHour: 3,
    footballApiProvider: "apifootball" as ApiProvider,
    tmdbApiKey: "ea17f4c1fca3ed86e12ac87d94bf0fbb",
    tmdbEnabled: true,
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
          noticeBarEnabled: data.noticeBarEnabled !== false,
          noticeText: data.noticeText || "",
          noticeType: data.noticeType || "info",
          noticeLink: data.noticeLink || "",
          defaultTheme: data.defaultTheme || "dark-neon",
          adsEnabled: data.adsEnabled || false,
          footballApiKey: data.footballApiKey || "10144b1b1c0934e60629f08a37064aec805f0a3b4fa6488a654ff791ef86aac7",
          footballdataApiKey: data.footballdataApiKey || "e4df9b4f6d364f2d9950728666d9a897",
          footballApiEnabled: data.footballApiEnabled !== false,
          footballApiCallsPerHour: data.footballApiCallsPerHour || 3,
          footballApiProvider: data.footballApiProvider || "apifootball",
        });
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSave = async () => {
    const trimmedApiKey = form.footballApiKey.trim();
    const trimmedFootballDataKey = form.footballdataApiKey.trim();

    if (form.footballApiProvider === "apifootball" && !trimmedApiKey) {
      toast.error("apifootball.com API key দিন");
      return;
    }

    if (form.footballApiProvider === "footballdata" && !trimmedFootballDataKey) {
      toast.error("football-data.org API key দিন");
      return;
    }

    try {
      const payload = {
        siteName: form.siteName,
        logo: form.logo,
        telegramUrl: form.telegramUrl,
        noticeBarEnabled: form.noticeBarEnabled,
        noticeText: form.noticeText,
        noticeType: form.noticeType,
        noticeLink: form.noticeLink,
        defaultTheme: form.defaultTheme,
        adsEnabled: form.adsEnabled,
        footballApiKey: trimmedApiKey,
        footballdataApiKey: trimmedFootballDataKey,
        footballApiEnabled: form.footballApiEnabled,
        footballApiCallsPerHour: form.footballApiCallsPerHour,
        footballApiProvider: form.footballApiProvider,
        updatedAt: Date.now(),
      };
      await setDoc(doc(db, "appSettings", "main"), payload, { merge: true });
      toast.success(`Settings saved • Active provider: ${form.footballApiProvider}`);
    } catch (err: any) {
      console.error("Settings save error:", err);
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
          <input type="checkbox" checked={form.noticeBarEnabled} onChange={(e) => setForm({ ...form, noticeBarEnabled: e.target.checked })} className="rounded" />
          Enable Notice Bar
        </label>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Notice Text</label>
          <textarea value={form.noticeText} onChange={(e) => setForm({ ...form, noticeText: e.target.value })} className={`${inputCls} min-h-[60px] resize-y`} placeholder="Enter notice text..." />
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
          <label className="text-xs text-muted-foreground mb-1 block">Notice Link (optional)</label>
          <input value={form.noticeLink} onChange={(e) => setForm({ ...form, noticeLink: e.target.value })} className={inputCls} placeholder="https://..." />
        </div>
      </div>

      {/* Theme & Ads */}
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Default Theme</label>
          <select value={form.defaultTheme} onChange={(e) => setForm({ ...form, defaultTheme: e.target.value })} className={inputCls}>
            <option value="dark-neon">Dark Neon</option>
            <option value="light">Light</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={form.adsEnabled} onChange={(e) => setForm({ ...form, adsEnabled: e.target.checked })} className="rounded" />
          Enable Ads Globally
        </label>
      </div>

      {/* Football API */}
      <div className="space-y-3 p-4 rounded-xl bg-secondary/50 border border-border/50">
        <h4 className="text-sm font-semibold text-foreground">⚽ Football API</h4>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={form.footballApiEnabled} onChange={(e) => setForm({ ...form, footballApiEnabled: e.target.checked })} className="rounded" />
          Enable Auto Football Matches
        </label>

        {/* Provider selector */}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Active API Provider</label>
          <select
            value={form.footballApiProvider}
            onChange={(e) => setForm({ ...form, footballApiProvider: e.target.value as ApiProvider })}
            className={inputCls}
          >
            <option value="apifootball">🟢 apifootball.com (More leagues)</option>
            <option value="footballdata">🔵 football-data.org (Free tier)</option>
          </select>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            {form.footballApiProvider === "apifootball"
              ? "✅ Active: apifootball.com — EPL, La Liga, Serie A, Bundesliga, Ligue 1, Saudi Pro, MLS, UCL, UEL, UECL, Nations League"
              : "✅ Active: football-data.org — EPL, La Liga, Serie A, Bundesliga, Ligue 1, UCL, Euro, World Cup (free tier)"}
          </p>
        </div>

        {/* apifootball.com key - always visible */}
        <div className={`p-3 rounded-lg border ${form.footballApiProvider === "apifootball" ? "border-primary/50 bg-primary/5" : "border-border/30 bg-secondary/30"}`}>
          <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
            {form.footballApiProvider === "apifootball" && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
            apifootball.com API Key
          </label>
          <input
            value={form.footballApiKey}
            onChange={(e) => setForm({ ...form, footballApiKey: e.target.value })}
            className={inputCls}
            placeholder="Enter apifootball.com API key"
          />
        </div>

        {/* football-data.org key - always visible */}
        <div className={`p-3 rounded-lg border ${form.footballApiProvider === "footballdata" ? "border-primary/50 bg-primary/5" : "border-border/30 bg-secondary/30"}`}>
          <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
            {form.footballApiProvider === "footballdata" && <span className="w-1.5 h-1.5 rounded-full bg-green-500" />}
            football-data.org API Key
          </label>
          <input
            value={form.footballdataApiKey}
            onChange={(e) => setForm({ ...form, footballdataApiKey: e.target.value })}
            className={inputCls}
            placeholder="Enter football-data.org API key"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">API Calls Per Hour (Max)</label>
          <input
            type="number"
            min={0}
            max={100000000}
            value={form.footballApiCallsPerHour}
            onChange={(e) => setForm({ ...form, footballApiCallsPerHour: Math.max(0, Math.min(100000000, parseInt(e.target.value) || 0)) })}
            className={inputCls}
          />
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            প্রতি ঘণ্টায় সর্বোচ্চ কতবার API call হবে (0 = unlimited)
          </p>
        </div>
      </div>

      <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all duration-300">
        <Save className="w-4 h-4" /> Save Settings
      </button>
    </div>
  );
};

export default SettingsManager;
