import { useAppSettings, updateAppSettings, AppConfig } from "@/hooks/useAppSettings";
import { Settings, Save } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const AppSettingsManager = () => {
  const { settings, loading } = useAppSettings();
  const [form, setForm] = useState<AppConfig>(settings);

  useEffect(() => { setForm(settings); }, [settings]);

  const handleSave = async () => {
    await updateAppSettings(form);
    toast.success("Settings saved");
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
  );
};

export default AppSettingsManager;
