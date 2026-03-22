import { useAppSettings, updateAppSettings, updateSectionConfig, AppConfig, SectionConfig } from "@/hooks/useAppSettings";
import { Settings, Save, Link as LinkIcon, Zap } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const AppSettingsManager = () => {
  const { settings, loading } = useAppSettings();
  const [form, setForm] = useState<AppConfig>(settings);
  const [sectionConfig, setSectionConfig] = useState<SectionConfig>(settings.sectionConfig || {
    liveEventsEnabled: true,
    upcomingEventsEnabled: true,
    footballLiveEnabled: true,
    footballUpcomingEnabled: true,
    footballRecentResultsEnabled: true,
    matchCardInitialLoad: 10,
  });
  const [streamJsonUrl, setStreamJsonUrl] = useState("");
  const [autoStreamEnabled, setAutoStreamEnabled] = useState(true);

  useEffect(() => { 
    setForm(settings);
    setSectionConfig(settings.sectionConfig || {
      liveEventsEnabled: true,
      upcomingEventsEnabled: true,
      footballLiveEnabled: true,
      footballUpcomingEnabled: true,
      footballRecentResultsEnabled: true,
      matchCardInitialLoad: 10,
    });
  }, [settings]);

  // Load stream settings from appSettings/main
  useEffect(() => {
    getDoc(doc(db, "appSettings", "main")).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        setStreamJsonUrl(data.streamJsonUrl || "");
        setAutoStreamEnabled(data.autoStreamEnabled !== false);
      }
    });
  }, []);

  const handleSave = async () => {
    await updateAppSettings(form);
    toast.success("Settings saved");
  };

  const handleSaveSectionConfig = async () => {
    await updateSectionConfig(sectionConfig);
    toast.success("Section settings saved");
  };

  const handleSaveStreamJson = async () => {
    try {
      await updateDoc(doc(db, "appSettings", "main"), {
        streamJsonUrl: streamJsonUrl.trim(),
        autoStreamEnabled,
      });
      toast.success("Stream JSON settings saved!");
    } catch {
      toast.error("Failed to save");
    }
  };

  const Toggle = ({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-center justify-between py-2">
      <span className="text-sm text-foreground">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-10 h-6 rounded-full transition-colors ${value ? "bg-primary" : "bg-secondary"} relative`}
      >
        <span className={`block w-4 h-4 rounded-full bg-foreground absolute top-1 transition-transform ${value ? "translate-x-5" : "translate-x-1"}`} />
      </button>
    </label>
  );

  return (
    <div className="space-y-6">
      <div className="glass-card neon-border p-6 space-y-4 max-w-lg">
        <h3 className="font-display font-bold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> App Settings
        </h3>
        <div className="space-y-1 divide-y divide-border/30">
          <Toggle label="Enable Chat" value={form.chatEnabled} onChange={(v) => setForm({ ...form, chatEnabled: v })} />
          <Toggle label="Enable Posts" value={form.postEnabled} onChange={(v) => setForm({ ...form, postEnabled: v })} />
          <Toggle label="Enable Polls" value={form.pollEnabled} onChange={(v) => setForm({ ...form, pollEnabled: v })} />
          <Toggle label="Bad Word Filter" value={form.badWordFilterEnabled} onChange={(v) => setForm({ ...form, badWordFilterEnabled: v })} />
          <Toggle label="Allow Guest Watch" value={form.allowGuestWatch} onChange={(v) => setForm({ ...form, allowGuestWatch: v })} />
          <Toggle label="Maintenance Mode" value={form.maintenanceMode} onChange={(v) => setForm({ ...form, maintenanceMode: v })} />
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-foreground">Slow Mode (seconds)</span>
            <select
              value={form.slowModeSeconds}
              onChange={(e) => setForm({ ...form, slowModeSeconds: Number(e.target.value) })}
              className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-foreground text-sm"
            >
              {[1, 2, 3, 5, 10, 30, 60].map(s => (
                <option key={s} value={s}>{s}s</option>
              ))}
            </select>
          </div>
        </div>
        <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all">
          <Save className="w-4 h-4" /> Save
        </button>
      </div>

      {/* Section Visibility Controls */}
      <div className="glass-card neon-border p-6 space-y-4 max-w-lg">
        <h3 className="font-display font-bold text-foreground flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" /> Homepage Sections
        </h3>
        <p className="text-xs text-muted-foreground">
          Control which sections are displayed on the homepage to optimize performance.
        </p>
        <div className="space-y-1 divide-y divide-border/30">
          <Toggle 
            label="Live Events (Manual)" 
            value={sectionConfig.liveEventsEnabled} 
            onChange={(v) => setSectionConfig({ ...sectionConfig, liveEventsEnabled: v })} 
          />
          <Toggle 
            label="Upcoming Events (Manual)" 
            value={sectionConfig.upcomingEventsEnabled} 
            onChange={(v) => setSectionConfig({ ...sectionConfig, upcomingEventsEnabled: v })} 
          />
          <Toggle 
            label="Football Live Scores" 
            value={sectionConfig.footballLiveEnabled} 
            onChange={(v) => setSectionConfig({ ...sectionConfig, footballLiveEnabled: v })} 
          />
          <Toggle 
            label="Football Upcoming Matches" 
            value={sectionConfig.footballUpcomingEnabled} 
            onChange={(v) => setSectionConfig({ ...sectionConfig, footballUpcomingEnabled: v })} 
          />
          <Toggle 
            label="Football Recent Results" 
            value={sectionConfig.footballRecentResultsEnabled} 
            onChange={(v) => setSectionConfig({ ...sectionConfig, footballRecentResultsEnabled: v })} 
          />
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-foreground">Initial Match Load (cards)</span>
            <select
              value={sectionConfig.matchCardInitialLoad}
              onChange={(e) => setSectionConfig({ ...sectionConfig, matchCardInitialLoad: Number(e.target.value) })}
              className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-foreground text-sm"
            >
              {[5, 10, 15, 20, 30].map(n => (
                <option key={n} value={n}>{n} matches</option>
              ))}
            </select>
          </div>
        </div>
        <button 
          onClick={handleSaveSectionConfig} 
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all"
        >
          <Save className="w-4 h-4" /> Save Section Settings
        </button>
      </div>

      {/* Auto Stream JSON Section */}
      <div className="glass-card neon-border p-6 space-y-4 max-w-lg">
        <h3 className="font-display font-bold text-foreground flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-primary" /> Auto Stream (JSON)
        </h3>
        <p className="text-xs text-muted-foreground">
          JSON URL থেকে অটো স্ট্রিম লিংক ম্যাচের সাথে যুক্ত হবে। প্রতি ২ মিনিটে আপডেট হয়।
        </p>
        <Toggle
          label="Auto Stream Enabled"
          value={autoStreamEnabled}
          onChange={setAutoStreamEnabled}
        />
        <div className="space-y-2">
          <label className="text-sm text-foreground font-medium">JSON URL</label>
          <input
            type="url"
            value={streamJsonUrl}
            onChange={(e) => setStreamJsonUrl(e.target.value)}
            placeholder="https://example.com/streams.json"
            className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground"
          />
          <p className="text-[10px] text-muted-foreground">
            JSON format: [{`{ "home": "Team A", "away": "Team B", "stream_url": "https://..." }`}]
          </p>
        </div>
        <button
          onClick={handleSaveStreamJson}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all"
        >
          <Save className="w-4 h-4" /> Save Stream Settings
        </button>
      </div>
    </div>
  );
};

export default AppSettingsManager;
