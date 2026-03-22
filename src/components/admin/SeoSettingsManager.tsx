import { useState, useEffect } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Save, Copy, Check, Globe, FileText } from "lucide-react";
import { toast } from "sonner";
import type { SeoSettings } from "@/hooks/useAppSettings";

const SeoSettingsManager = () => {
  const [form, setForm] = useState<SeoSettings>({
    googleVerificationCode: "",
    sitemapUrl: "https://abctvlive.vercel.app/sitemap.xml",
    robotsText: "",
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "appSettings", "config"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setForm({
          googleVerificationCode: data.seo?.googleVerificationCode || "",
          sitemapUrl: data.seo?.sitemapUrl || "https://abctvlive.vercel.app/sitemap.xml",
          robotsText: data.seo?.robotsText || "",
        });
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const handleSave = async () => {
    if (!form.googleVerificationCode) {
      toast.error("Google verification code is required");
      return;
    }

    if (!form.sitemapUrl) {
      toast.error("Sitemap URL is required");
      return;
    }

    try {
      await updateDoc(doc(db, "appSettings", "config"), {
        seo: {
          googleVerificationCode: form.googleVerificationCode.trim(),
          sitemapUrl: form.sitemapUrl.trim(),
          robotsText: form.robotsText.trim(),
        },
      });
      toast.success("SEO settings saved successfully!");
    } catch (err: any) {
      console.error("Error saving SEO settings:", err);
      toast.error("Error saving: " + (err?.message || "Unknown"));
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(null), 2000);
  };

  const metaTagExample = `<meta name="google-site-verification" content="${form.googleVerificationCode || 'YOUR_CODE'}" />`;

  const robotsTxtExample = `# SEO-friendly robots.txt for AbcTV LIVE
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Crawl-delay: 1
Sitemap: ${form.sitemapUrl || "https://abctvlive.vercel.app/sitemap.xml"}`;

  if (loading)
    return (
      <div className="glass-card p-6">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );

  const inputCls =
    "w-full px-4 py-2.5 rounded-lg bg-secondary border border-border text-foreground text-sm";

  return (
    <div className="space-y-6">
      {/* Google Verification */}
      <div className="glass-card neon-border p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-foreground">Google Search Console</h3>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">
            Google Verification Code
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Get this from Google Search Console → Settings → Verification
          </p>
          <textarea
            value={form.googleVerificationCode}
            onChange={(e) => setForm({ ...form, googleVerificationCode: e.target.value })}
            placeholder="e.g., xNDd2M9HVxh9zsGbQUTIccUKqK_1vDgwRkkOSNC1ukA"
            className={`${inputCls} min-h-[60px] font-mono text-xs`}
          />
        </div>

        {form.googleVerificationCode && (
          <div className="bg-secondary/50 border border-border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">Meta Tag to Inject</p>
              <button
                onClick={() => copyToClipboard(metaTagExample, "Meta Tag")}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-primary text-primary-foreground hover:opacity-90 transition-all"
              >
                {copied === "Meta Tag" ? (
                  <>
                    <Check className="w-3 h-3" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy
                  </>
                )}
              </button>
            </div>
            <code className="block text-xs bg-background p-2 rounded border border-border overflow-x-auto">
              {metaTagExample}
            </code>
            <p className="text-xs text-muted-foreground">
              This will be automatically injected into the &lt;head&gt; tag
            </p>
          </div>
        )}
      </div>

      {/* Sitemap Settings */}
      <div className="glass-card neon-border p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-display font-bold text-foreground">Sitemap Configuration</h3>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">Sitemap URL</label>
          <p className="text-xs text-muted-foreground mb-2">
            The full URL of your XML sitemap
          </p>
          <input
            type="url"
            value={form.sitemapUrl}
            onChange={(e) => setForm({ ...form, sitemapUrl: e.target.value })}
            placeholder="https://abctvlive.vercel.app/sitemap.xml"
            className={inputCls}
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-success/10 border border-success/30 rounded-lg">
          <p className="text-sm text-success font-medium">Sitemap auto-generated dynamically</p>
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-3 py-1 rounded bg-success text-white hover:opacity-90 transition-all"
          >
            Preview
          </a>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-foreground">robots.txt Content</label>
          <p className="text-xs text-muted-foreground mb-2">
            Optional: Leave empty for default rules
          </p>
          <textarea
            value={form.robotsText}
            onChange={(e) => setForm({ ...form, robotsText: e.target.value })}
            placeholder={robotsTxtExample}
            className={`${inputCls} min-h-[150px] font-mono text-xs`}
          />
        </div>

        {form.robotsText && (
          <div className="bg-secondary/50 border border-border rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-foreground">robots.txt Preview</p>
              <button
                onClick={() => copyToClipboard(form.robotsText, "robots.txt")}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-primary text-primary-foreground hover:opacity-90 transition-all"
              >
                {copied === "robots.txt" ? (
                  <>
                    <Check className="w-3 h-3" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" /> Copy
                  </>
                )}
              </button>
            </div>
            <code className="block text-xs bg-background p-2 rounded border border-border overflow-x-auto whitespace-pre-wrap break-words">
              {form.robotsText}
            </code>
          </div>
        )}
      </div>

      {/* Next Steps */}
      <div className="glass-card border border-border/30 p-6 space-y-3">
        <h3 className="font-display font-bold text-foreground">Next Steps</h3>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li>Save Google verification code</li>
          <li>Go to Google Search Console</li>
          <li>Verify your site using the meta tag</li>
          <li>Submit sitemap at /sitemap.xml</li>
          <li>Monitor indexing status in GSC</li>
        </ol>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all w-full sm:w-auto justify-center sm:justify-start"
      >
        <Save className="w-5 h-5" /> Save SEO Settings
      </button>
    </div>
  );
};

export default SeoSettingsManager;
