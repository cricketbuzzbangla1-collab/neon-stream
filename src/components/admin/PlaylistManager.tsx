import { useState, useRef, useCallback, useMemo } from "react";
import { useChannels, useCategories, addDocument, deleteDocument, Channel } from "@/hooks/useFirestore";
import { Upload, Download, Trash2, Search, FileText, Check, X, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface ParsedChannel {
  name: string;
  logo: string;
  category: string;
  streamUrl: string;
  tvgId: string;
  selected: boolean;
  isDuplicate: boolean;
  editMode: boolean;
}

function parseM3U8(text: string): ParsedChannel[] {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const channels: ParsedChannel[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("#EXTINF")) continue;

    const urlLine = lines[i + 1];
    if (!urlLine || urlLine.startsWith("#")) continue;

    const url = urlLine.trim();
    if (!url.match(/^https?:\/\/.+/i)) continue;

    const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
    const groupMatch = line.match(/group-title="([^"]*)"/i);
    const tvgIdMatch = line.match(/tvg-id="([^"]*)"/i);
    const nameMatch = line.match(/,(.+)$/);

    channels.push({
      name: nameMatch?.[1]?.trim() || "Unknown",
      logo: logoMatch?.[1]?.trim() || "",
      category: groupMatch?.[1]?.trim() || "",
      streamUrl: url,
      tvgId: tvgIdMatch?.[1]?.trim() || "",
      selected: true,
      isDuplicate: false,
      editMode: false,
    });

    i++; // skip URL line
  }

  return channels;
}

function generateM3U8(channels: Channel[], categories: { id: string; name: string }[]): string {
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c.name]));
  let output = "#EXTM3U\n";
  for (const ch of channels) {
    const group = catMap[ch.categoryId] || "";
    output += `#EXTINF:-1 tvg-logo="${ch.logo}" group-title="${group}",${ch.name}\n`;
    output += `${ch.streamUrl}\n`;
  }
  return output;
}

const PlaylistManager = () => {
  const { data: channels } = useChannels();
  const { data: categories } = useCategories();
  const [parsed, setParsed] = useState<ParsedChannel[]>([]);
  const [rawText, setRawText] = useState("");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showPaste, setShowPaste] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const existingUrls = useMemo(() => new Set(channels.map((c) => c.streamUrl)), [channels]);

  const handleParse = useCallback((text: string) => {
    const result = parseM3U8(text);
    const marked = result.map((ch) => ({
      ...ch,
      isDuplicate: existingUrls.has(ch.streamUrl),
      selected: !existingUrls.has(ch.streamUrl),
    }));
    setParsed(marked);
    if (marked.length === 0) {
      toast.error("No valid channels found in playlist");
    } else {
      toast.success(`Parsed ${marked.length} channels (${marked.filter((c) => c.isDuplicate).length} duplicates)`);
    }
  }, [existingUrls]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRawText(text);
      handleParse(text);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handlePasteImport = () => {
    if (!rawText.trim()) { toast.error("Paste playlist text first"); return; }
    handleParse(rawText);
  };

  const handleImport = async () => {
    const toImport = parsed.filter((c) => c.selected);
    if (toImport.length === 0) { toast.error("No channels selected"); return; }

    setImporting(true);
    setImportProgress(0);
    let success = 0;
    let failed = 0;

    // Find or create category mapping
    const catMap: Record<string, string> = {};
    for (const cat of categories) {
      catMap[cat.name.toLowerCase()] = cat.id;
    }

    for (let i = 0; i < toImport.length; i++) {
      const ch = toImport[i];
      try {
        let categoryId = "";
        if (ch.category) {
          categoryId = catMap[ch.category.toLowerCase()] || "";
          if (!categoryId) {
            // Auto-create category
            const catDoc = await addDocument("categories", { name: ch.category, icon: "📺", order: 0 });
            categoryId = catDoc.id;
            catMap[ch.category.toLowerCase()] = categoryId;
          }
        }

        await addDocument("channels", {
          name: ch.name,
          logo: ch.logo,
          streamUrl: ch.streamUrl,
          playerType: "hls",
          categoryId,
          countryId: "",
          isFeatured: false,
          isLive: true,
          order: 0,
        });
        success++;
      } catch {
        failed++;
      }
      setImportProgress(Math.round(((i + 1) / toImport.length) * 100));
    }

    setImporting(false);
    setParsed([]);
    setRawText("");
    toast.success(`Imported ${success} channels${failed > 0 ? `, ${failed} failed` : ""}`);
  };

  const handleExport = () => {
    const text = generateM3U8(channels, categories);
    const blob = new Blob([text], { type: "application/x-mpegURL" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "playlist.m3u8";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${channels.length} channels`);
  };

  const toggleAll = (val: boolean) => {
    setParsed((prev) => prev.map((c) => ({ ...c, selected: val })));
  };

  const setCategoryBulk = (cat: string) => {
    setParsed((prev) => prev.map((c) => (c.selected ? { ...c, category: cat } : c)));
    toast.success(`Category set to "${cat}" for selected channels`);
  };

  const deleteSelected = () => {
    setParsed((prev) => prev.filter((c) => !c.selected));
    toast.success("Removed selected channels from list");
  };

  const updateParsed = (idx: number, field: keyof ParsedChannel, value: string | boolean) => {
    setParsed((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  const uniqueCategories = useMemo(() => [...new Set(parsed.map((c) => c.category).filter(Boolean))], [parsed]);

  const filtered = useMemo(() => {
    return parsed.filter((c) => {
      const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = !catFilter || c.category === catFilter;
      return matchSearch && matchCat;
    });
  }, [parsed, search, catFilter]);

  const selectedCount = parsed.filter((c) => c.selected).length;
  const dupCount = parsed.filter((c) => c.isDuplicate).length;

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <input ref={fileRef} type="file" accept=".m3u,.m3u8" onChange={handleFile} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all duration-300">
          <Upload className="w-4 h-4" /> Upload File
        </button>
        <button onClick={() => setShowPaste(!showPaste)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground font-medium hover:opacity-90 transition-all duration-300">
          <FileText className="w-4 h-4" /> Paste Text
        </button>
        <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground font-medium hover:opacity-90 transition-all duration-300 ml-auto">
          <Download className="w-4 h-4" /> Export ({channels.length})
        </button>
      </div>

      {/* Paste area */}
      {showPaste && (
        <div className="glass-card neon-border p-4 space-y-3">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={"#EXTM3U\n#EXTINF:-1 tvg-logo=\"...\" group-title=\"Sports\",Channel Name\nhttps://example.com/stream.m3u8"}
            className="w-full h-40 px-4 py-3 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm font-mono resize-y"
          />
          <div className="flex gap-2">
            <button onClick={handlePasteImport} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all duration-300">
              Parse Playlist
            </button>
            <button onClick={() => { setShowPaste(false); setRawText(""); }} className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:opacity-90 transition-all duration-300">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Parsed results */}
      {parsed.length > 0 && (
        <div className="space-y-4">
          {/* Stats bar */}
          <div className="glass-card p-4 flex flex-wrap items-center gap-4 text-sm">
            <span className="text-foreground font-semibold">{parsed.length} channels parsed</span>
            <span className="text-primary">{selectedCount} selected</span>
            {dupCount > 0 && (
              <span className="flex items-center gap-1 text-amber-500">
                <AlertTriangle className="w-3.5 h-3.5" /> {dupCount} duplicates
              </span>
            )}
          </div>

          {/* Filters & bulk actions */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search channels..."
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm"
              />
            </div>
            {uniqueCategories.length > 0 && (
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="px-3 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm">
                <option value="">All Categories</option>
                {uniqueCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <button onClick={() => toggleAll(true)} className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs hover:opacity-80">Select All</button>
            <button onClick={() => toggleAll(false)} className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-xs hover:opacity-80">Deselect All</button>
            <button onClick={deleteSelected} className="px-3 py-2 rounded-lg bg-destructive/10 text-destructive text-xs hover:opacity-80 flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Remove Selected
            </button>
          </div>

          {/* Bulk category assign */}
          {uniqueCategories.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Bulk assign category:</span>
              {uniqueCategories.slice(0, 6).map((c) => (
                <button key={c} onClick={() => setCategoryBulk(c)} className="px-2 py-1 rounded bg-secondary text-secondary-foreground text-xs hover:opacity-80">{c}</button>
              ))}
            </div>
          )}

          {/* Channel list */}
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {filtered.map((ch, idx) => {
              const realIdx = parsed.indexOf(ch);
              return (
                <div key={realIdx} className={`glass-card p-3 flex items-center gap-3 ${ch.isDuplicate ? "border border-amber-500/30" : ""}`}>
                  <input type="checkbox" checked={ch.selected} onChange={(e) => updateParsed(realIdx, "selected", e.target.checked)} className="rounded shrink-0" />
                  {ch.logo ? (
                    <img src={ch.logo} alt="" className="w-8 h-8 rounded object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-8 h-8 rounded bg-secondary shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {ch.editMode ? (
                      <div className="flex flex-wrap gap-2">
                        <input value={ch.name} onChange={(e) => updateParsed(realIdx, "name", e.target.value)} className="px-2 py-1 rounded bg-secondary border border-border text-foreground text-xs flex-1 min-w-[120px]" />
                        <input value={ch.category} onChange={(e) => updateParsed(realIdx, "category", e.target.value)} placeholder="Category" className="px-2 py-1 rounded bg-secondary border border-border text-foreground text-xs w-24" />
                        <button onClick={() => updateParsed(realIdx, "editMode", false)} className="text-primary"><Check className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{ch.name}</p>
                        {ch.category && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">{ch.category}</span>}
                        {ch.isDuplicate && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 shrink-0">DUP</span>}
                        <button onClick={() => updateParsed(realIdx, "editMode", true)} className="text-muted-foreground hover:text-foreground ml-auto shrink-0">
                          <FileText className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <p className="text-[11px] text-muted-foreground truncate">{ch.streamUrl}</p>
                  </div>
                  <button onClick={() => setParsed((prev) => prev.filter((_, i) => i !== realIdx))} className="text-destructive/60 hover:text-destructive shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Import button */}
          {importing ? (
            <div className="space-y-2">
              <Progress value={importProgress} className="h-2" />
              <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" /> Importing... {importProgress}%
              </p>
            </div>
          ) : (
            <button onClick={handleImport} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all duration-300 glow-primary">
              Import {selectedCount} Channels
            </button>
          )}
        </div>
      )}

      {/* Existing channels info */}
      {parsed.length === 0 && (
        <div className="glass-card p-8 text-center space-y-2">
          <Upload className="w-10 h-10 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Upload a .m3u8 file or paste playlist text to import channels</p>
          <p className="text-xs text-muted-foreground">{channels.length} channels currently in database</p>
        </div>
      )}
    </div>
  );
};

export default PlaylistManager;
