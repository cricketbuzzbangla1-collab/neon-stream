import { useState, useRef, useCallback, useMemo } from "react";
import { useChannels, useCategories, useCountries, addDocument, deleteDocument, Channel } from "@/hooks/useFirestore";
import { Upload, Download, Trash2, Search, FileText, Check, X, AlertTriangle, Loader2, Link as LinkIcon, Filter } from "lucide-react";
import { toast } from "sonner";
import { detectPlayerType } from "@/lib/detectPlayerType";
import { Progress } from "@/components/ui/progress";
import { collection, getDocs, query, where, writeBatch, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ParsedChannel {
  name: string;
  logo: string;
  category: string;
  streamUrl: string;
  tvgId: string;
  selected: boolean;
  isDuplicate: boolean;
  editMode: boolean;
  countryId: string;
  isLive: boolean;
  status: "valid" | "invalid" | "unchecked";
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
      countryId: "",
      isLive: true,
      status: "unchecked",
    });

    i++;
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
  const { data: countries } = useCountries();
  const [parsed, setParsed] = useState<ParsedChannel[]>([]);
  const [rawText, setRawText] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [showPaste, setShowPaste] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [dupMode, setDupMode] = useState<"skip" | "overwrite">("skip");
  const [removeDups, setRemoveDups] = useState(true);
  const [exportCat, setExportCat] = useState("");
  const [exportCountry, setExportCountry] = useState("");
  const [validating, setValidating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const existingUrls = useMemo(() => new Set(channels.map((c) => c.streamUrl)), [channels]);
  const existingUrlToId = useMemo(() => {
    const map: Record<string, string> = {};
    channels.forEach(c => { map[c.streamUrl] = c.id; });
    return map;
  }, [channels]);

  const handleParse = useCallback((text: string) => {
    let result = parseM3U8(text);
    if (removeDups) {
      const seen = new Set<string>();
      result = result.filter(ch => {
        if (seen.has(ch.streamUrl)) return false;
        seen.add(ch.streamUrl);
        return true;
      });
    }
    const marked = result.map((ch) => ({
      ...ch,
      isDuplicate: existingUrls.has(ch.streamUrl),
      selected: dupMode === "overwrite" || !existingUrls.has(ch.streamUrl),
    }));
    setParsed(marked);
    if (marked.length === 0) {
      toast.error("No valid channels found in playlist");
    } else {
      toast.success(`Parsed ${marked.length} channels (${marked.filter((c) => c.isDuplicate).length} duplicates)`);
    }
  }, [existingUrls, removeDups, dupMode]);

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

  const handleFetchUrl = async () => {
    if (!urlInput.trim()) { toast.error("Enter a URL"); return; }
    setFetchingUrl(true);
    try {
      const resp = await fetch(urlInput.trim());
      if (!resp.ok) throw new Error("Failed to fetch");
      const text = await resp.text();
      setRawText(text);
      handleParse(text);
      setShowUrl(false);
    } catch {
      toast.error("Failed to fetch playlist. Try uploading the file instead.");
    }
    setFetchingUrl(false);
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

    const catMap: Record<string, string> = {};
    for (const cat of categories) {
      catMap[cat.name.toLowerCase()] = cat.id;
    }

    // Batch write - max 500 per batch
    const BATCH_SIZE = 450;
    let batch = writeBatch(db);
    let batchCount = 0;

    for (let i = 0; i < toImport.length; i++) {
      const ch = toImport[i];
      try {
        let categoryId = "";
        if (ch.category) {
          categoryId = catMap[ch.category.toLowerCase()] || "";
          if (!categoryId) {
            const catDoc = await addDocument("categories", { name: ch.category, icon: "📺", order: 0 });
            categoryId = catDoc.id;
            catMap[ch.category.toLowerCase()] = categoryId;
          }
        }

        if (ch.isDuplicate && dupMode === "overwrite" && existingUrlToId[ch.streamUrl]) {
          const ref = doc(db, "channels", existingUrlToId[ch.streamUrl]);
          batch.update(ref, {
            name: ch.name,
            logo: ch.logo,
            categoryId,
            countryId: ch.countryId,
            isLive: ch.isLive,
            source: "playlist-import",
          });
        } else if (!ch.isDuplicate || dupMode === "overwrite") {
          const ref = doc(collection(db, "channels"));
          batch.set(ref, {
            name: ch.name,
            logo: ch.logo,
            streamUrl: ch.streamUrl,
            playerType: detectPlayerType(ch.streamUrl),
            categoryId,
            countryId: ch.countryId,
            isFeatured: false,
            isLive: ch.isLive,
            order: 0,
            source: "playlist-import",
            createdAt: Date.now(),
          });
        }
        batchCount++;
        success++;

        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
        }
      } catch {
        failed++;
      }
      setImportProgress(Math.round(((i + 1) / toImport.length) * 100));
    }

    if (batchCount > 0) await batch.commit();

    setImporting(false);
    setParsed([]);
    setRawText("");
    toast.success(`Imported ${success} channels${failed > 0 ? `, ${failed} failed` : ""}`);
  };

  const handleExport = () => {
    let exportChannels = channels;
    if (exportCat) exportChannels = exportChannels.filter(c => c.categoryId === exportCat);
    if (exportCountry) exportChannels = exportChannels.filter(c => c.countryId === exportCountry);

    if (exportChannels.length === 0) { toast.error("No channels to export"); return; }
    const text = generateM3U8(exportChannels, categories);
    const blob = new Blob([text], { type: "application/x-mpegURL" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "playlist.m3u";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${exportChannels.length} channels`);
  };

  const handleValidateStreams = async () => {
    setValidating(true);
    const updated = [...parsed];
    for (let i = 0; i < updated.length; i++) {
      if (!updated[i].selected) continue;
      try {
        const resp = await fetch(updated[i].streamUrl, { method: "HEAD", mode: "no-cors" });
        updated[i].status = "valid";
      } catch {
        updated[i].status = "invalid";
      }
    }
    setParsed(updated);
    setValidating(false);
    const invalid = updated.filter(c => c.status === "invalid").length;
    toast.success(`Validation done. ${invalid} invalid streams found.`);
  };

  const toggleAll = (val: boolean) => {
    setParsed((prev) => prev.map((c) => ({ ...c, selected: val })));
  };

  const setCategoryBulk = (cat: string) => {
    setParsed((prev) => prev.map((c) => (c.selected ? { ...c, category: cat } : c)));
    toast.success(`Category set to "${cat}" for selected channels`);
  };

  const setCountryBulk = (countryId: string) => {
    setParsed((prev) => prev.map((c) => (c.selected ? { ...c, countryId } : c)));
    const country = countries.find(c => c.id === countryId);
    toast.success(`Country set to "${country?.name}" for selected channels`);
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

  const inputCls = "px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm";

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        <input ref={fileRef} type="file" accept=".m3u,.m3u8" onChange={handleFile} className="hidden" />
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all duration-300">
          <Upload className="w-4 h-4" /> Upload File
        </button>
        <button onClick={() => { setShowUrl(!showUrl); setShowPaste(false); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground font-medium hover:opacity-90 transition-all duration-300">
          <LinkIcon className="w-4 h-4" /> From URL
        </button>
        <button onClick={() => { setShowPaste(!showPaste); setShowUrl(false); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground font-medium hover:opacity-90 transition-all duration-300">
          <FileText className="w-4 h-4" /> Paste Text
        </button>
      </div>

      {/* Import options */}
      <div className="flex flex-wrap gap-4 items-center text-sm">
        <label className="flex items-center gap-2 text-foreground">
          <input type="checkbox" checked={removeDups} onChange={e => setRemoveDups(e.target.checked)} className="rounded" />
          Remove duplicates
        </label>
        <div className="flex items-center gap-2 text-foreground">
          <span className="text-muted-foreground">Existing:</span>
          <select value={dupMode} onChange={e => setDupMode(e.target.value as any)} className={`${inputCls} py-1`}>
            <option value="skip">Skip</option>
            <option value="overwrite">Overwrite</option>
          </select>
        </div>
      </div>

      {/* URL input */}
      {showUrl && (
        <div className="glass-card neon-border p-4 space-y-3">
          <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="https://example.com/playlist.m3u8" className={`${inputCls} w-full`} />
          <div className="flex gap-2">
            <button onClick={handleFetchUrl} disabled={fetchingUrl} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-all duration-300 disabled:opacity-50">
              {fetchingUrl ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Fetch & Parse
            </button>
            <button onClick={() => setShowUrl(false)} className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:opacity-90 transition-all duration-300">Cancel</button>
          </div>
        </div>
      )}

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
            <button onClick={() => { setShowPaste(false); setRawText(""); }} className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground hover:opacity-90 transition-all duration-300">Cancel</button>
          </div>
        </div>
      )}

      {/* Parsed results */}
      {parsed.length > 0 && (
        <div className="space-y-4">
          <div className="glass-card p-4 flex flex-wrap items-center gap-4 text-sm">
            <span className="text-foreground font-semibold">{parsed.length} channels parsed</span>
            <span className="text-primary">{selectedCount} selected</span>
            {dupCount > 0 && (
              <span className="flex items-center gap-1 text-amber-500">
                <AlertTriangle className="w-3.5 h-3.5" /> {dupCount} duplicates
              </span>
            )}
            <button onClick={handleValidateStreams} disabled={validating} className="ml-auto flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs hover:opacity-80 disabled:opacity-50">
              {validating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Validate Streams
            </button>
          </div>

          {/* Filters & bulk actions */}
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search channels..." className={`${inputCls} pl-9 w-full`} />
            </div>
            {uniqueCategories.length > 0 && (
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={inputCls}>
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

          {/* Bulk assign */}
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Bulk assign:</span>
            {uniqueCategories.slice(0, 6).map((c) => (
              <button key={c} onClick={() => setCategoryBulk(c)} className="px-2 py-1 rounded bg-secondary text-secondary-foreground text-xs hover:opacity-80">{c}</button>
            ))}
            {countries.length > 0 && (
              <select onChange={e => { if (e.target.value) setCountryBulk(e.target.value); }} className={`${inputCls} py-1 text-xs`} defaultValue="">
                <option value="" disabled>Country...</option>
                {countries.map(c => <option key={c.id} value={c.id}>{c.flag} {c.name}</option>)}
              </select>
            )}
          </div>

          {/* Channel list */}
          <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
            {filtered.map((ch, idx) => {
              const realIdx = parsed.indexOf(ch);
              return (
                <div key={realIdx} className={`glass-card p-3 flex items-center gap-3 ${ch.isDuplicate ? "border border-amber-500/30" : ""} ${ch.status === "invalid" ? "border border-destructive/30" : ""}`}>
                  <input type="checkbox" checked={ch.selected} onChange={(e) => updateParsed(realIdx, "selected", e.target.checked)} className="rounded shrink-0" />
                  {ch.logo ? (
                    <img src={ch.logo} alt="" className="w-8 h-8 rounded object-cover shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-8 h-8 rounded bg-secondary shrink-0 flex items-center justify-center text-xs text-muted-foreground font-bold">{ch.name.charAt(0)}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    {ch.editMode ? (
                      <div className="flex flex-wrap gap-2">
                        <input value={ch.name} onChange={(e) => updateParsed(realIdx, "name", e.target.value)} className={`${inputCls} flex-1 min-w-[120px] py-1`} />
                        <input value={ch.logo} onChange={(e) => updateParsed(realIdx, "logo", e.target.value)} placeholder="Logo URL" className={`${inputCls} w-32 py-1`} />
                        <input value={ch.category} onChange={(e) => updateParsed(realIdx, "category", e.target.value)} placeholder="Category" className={`${inputCls} w-24 py-1`} />
                        <input value={ch.streamUrl} onChange={(e) => updateParsed(realIdx, "streamUrl", e.target.value)} placeholder="Stream URL" className={`${inputCls} flex-1 min-w-[150px] py-1`} />
                        <button onClick={() => updateParsed(realIdx, "editMode", false)} className="text-primary"><Check className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground truncate">{ch.name}</p>
                        {ch.category && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">{ch.category}</span>}
                        {ch.isDuplicate && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 shrink-0">DUP</span>}
                        {ch.status === "invalid" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive shrink-0">INVALID</span>}
                        {ch.status === "valid" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-neon-green/10 text-neon-green shrink-0">✓</span>}
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

      {/* Stream Link Manager */}
      <StreamLinkManager channels={channels} />

      {/* Export section */}
      <div className="glass-card neon-border p-4 space-y-3">
        <h3 className="font-display font-bold text-foreground text-sm">Export Channels</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={exportCat} onChange={e => setExportCat(e.target.value)} className={inputCls}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={exportCountry} onChange={e => setExportCountry(e.target.value)} className={inputCls}>
            <option value="">All Countries</option>
            {countries.map(c => <option key={c.id} value={c.id}>{c.flag} {c.name}</option>)}
          </select>
          <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-accent-foreground font-medium hover:opacity-90 transition-all duration-300">
            <Download className="w-4 h-4" /> Export .m3u ({
              channels.filter(c => (!exportCat || c.categoryId === exportCat) && (!exportCountry || c.countryId === exportCountry)).length
            })
          </button>
        </div>
      </div>

      {/* Empty state */}
      {parsed.length === 0 && (
        <div className="glass-card p-8 text-center space-y-2">
          <Upload className="w-10 h-10 mx-auto text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Upload .m3u/.m3u8 file, paste URL, or paste text to import channels</p>
          <p className="text-xs text-muted-foreground">{channels.length} channels currently in database</p>
        </div>
      )}
    </div>
  );
};

// Stream Link Manager sub-component
const StreamLinkManager = ({ channels }: { channels: Channel[] }) => {
  const [filter, setFilter] = useState<"all" | "http" | "https">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const httpChannels = channels.filter(c => c.streamUrl?.startsWith("http://"));
  const httpsChannels = channels.filter(c => c.streamUrl?.startsWith("https://"));

  const filtered = channels.filter(c => {
    const matchProtocol = filter === "all" ||
      (filter === "http" && c.streamUrl?.startsWith("http://")) ||
      (filter === "https" && c.streamUrl?.startsWith("https://"));
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.streamUrl?.toLowerCase().includes(search.toLowerCase());
    return matchProtocol && matchSearch;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(c => c.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    try {
      await Promise.all([...selectedIds].map(id => deleteDocument("channels", id)));
      setSelectedIds(new Set());
      toast.success(`${count} channels deleted`);
    } catch { toast.error("Error deleting"); }
  };

  const inputCls = "px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm";

  return (
    <div className="glass-card neon-border p-4 space-y-3">
      <h3 className="font-display font-bold text-foreground text-sm">Stream Link Manager</h3>

      {/* Protocol filter buttons */}
      <div className="flex flex-wrap gap-2 items-center">
        <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
          All ({channels.length})
        </button>
        <button onClick={() => setFilter("https")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === "https" ? "bg-emerald-600 text-white" : "bg-emerald-500/10 text-emerald-500"}`}>
          🔒 HTTPS ({httpsChannels.length})
        </button>
        <button onClick={() => setFilter("http")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === "http" ? "bg-amber-600 text-white" : "bg-amber-500/10 text-amber-500"}`}>
          ⚠️ HTTP ({httpChannels.length})
        </button>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search links..." className={`${inputCls} pl-9 w-full`} />
        </div>
        {selectedIds.size > 0 && (
          <button onClick={handleBulkDelete} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-xs font-medium hover:opacity-90">
            <Trash2 className="w-3.5 h-3.5" /> Delete ({selectedIds.size})
          </button>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded" />
          <span className="text-muted-foreground text-xs">Select all ({filtered.length})</span>
        </div>
      )}

      <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No links found</p>
        ) : filtered.map(ch => {
          const isHttp = ch.streamUrl?.startsWith("http://");
          return (
            <div key={ch.id} className={`flex items-center gap-2 p-2 rounded-lg bg-secondary/50 ${isHttp ? "border border-amber-500/20" : ""}`}>
              <input type="checkbox" checked={selectedIds.has(ch.id)} onChange={() => toggleSelect(ch.id)} className="rounded shrink-0" />
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${isHttp ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                {isHttp ? "HTTP" : "HTTPS"}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{ch.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{ch.streamUrl}</p>
              </div>
              <button onClick={async () => { await deleteDocument("channels", ch.id); toast.success("Deleted"); }} className="p-1.5 rounded hover:bg-destructive/10 text-destructive/60 hover:text-destructive shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PlaylistManager;
