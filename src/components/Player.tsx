import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { Channel } from "@/hooks/useFirestore";
import {
  Volume2, VolumeX, Maximize, Minimize, AlertTriangle, Loader2,
  Play, Pause, Settings, Radio, RotateCcw,
  PictureInPicture2, Gauge, SkipBack, SkipForward,
  Monitor, Rows3, ChevronLeft, ChevronRight
} from "lucide-react";

interface PlayerProps {
  channel: Channel;
  autoPlay?: boolean;
  onFatalError?: () => void;
  onSwipeNext?: () => void;
  onSwipePrev?: () => void;
  channelInfo?: { current: number; total: number };
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

type ScreenMode = "fit" | "contain" | "stretch" | "cover" | "theater";

const SCREEN_MODES: { value: ScreenMode; label: string; icon: string }[] = [
  { value: "fit", label: "100% Fit", icon: "📐" },
  { value: "contain", label: "Contain", icon: "🖥" },
  { value: "stretch", label: "Stretch", icon: "↔️" },
  { value: "cover", label: "Crop/Cover", icon: "🔲" },
  { value: "theater", label: "Theater", icon: "🎬" },
];

const Player = ({ channel, onFatalError, onSwipeNext, onSwipePrev, channelInfo }: PlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const shakaRef = useRef<any>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastTapRef = useRef<{ time: number; side: "left" | "right" | null }>({ time: 0, side: null });
  const retryCountRef = useRef(0);

  const [error, setError] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playing, setPlaying] = useState(true);
  const [currentMode, setCurrentMode] = useState(channel.playerType || "hls");
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLiveStream, setIsLiveStream] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [qualityLevels, setQualityLevels] = useState<{ height: number; index: number }[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showScreenMenu, setShowScreenMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [screenMode, setScreenMode] = useState<ScreenMode>("fit");
  const [seekIndicator, setSeekIndicator] = useState<{ side: "left" | "right"; seconds: number } | null>(null);
  const [brightness, setBrightness] = useState(1);
  const [volumeIndicator, setVolumeIndicator] = useState(false);
  const [brightnessIndicator, setBrightnessIndicator] = useState(false);
  const [theaterMode, setTheaterMode] = useState(false);
  const [currentResLabel, setCurrentResLabel] = useState("Auto");
  const [swipeChannelIndicator, setSwipeChannelIndicator] = useState<"next" | "prev" | null>(null);

  const closeAllMenus = useCallback(() => {
    setShowQualityMenu(false);
    setShowSpeedMenu(false);
    setShowScreenMenu(false);
  }, []);

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (playing) {
        setShowControls(false);
        closeAllMenus();
      }
    }, 3000);
  }, [playing, closeAllMenus]);

  useEffect(() => {
    resetControlsTimer();
    return () => clearTimeout(controlsTimerRef.current);
  }, [playing, resetControlsTimer]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const video = videoRef.current;
      if (!video) return;
      switch (e.key.toLowerCase()) {
        case " ":
          e.preventDefault();
          togglePlay();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "arrowleft":
          e.preventDefault();
          seekBy(-10);
          break;
        case "arrowright":
          e.preventDefault();
          seekBy(10);
          break;
        case "arrowup":
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case "arrowdown":
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
      }
      resetControlsTimer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isLiveStream, volume, resetControlsTimer]);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Auto-detect stream type
  type PlayerMode = "hls" | "hls-retry" | "dash" | "native" | "iframe";
  const detectStreamType = useCallback((url: string): PlayerMode => {
    if (channel.playerType === "iframe") return "iframe";
    if (channel.playerType === "dash" || url.includes(".mpd")) return "dash";
    if (channel.playerType === "hls" || url.includes(".m3u8")) return "hls";
    if (url.match(/\.(mp4|webm|ogg|mov)(\?|$)/i)) return "native";
    return (channel.playerType && channel.playerType !== "external" ? channel.playerType : "hls") as PlayerMode;
  }, [channel.playerType]);

  const destroyHls = () => {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
  };

  const destroyShaka = async () => {
    if (shakaRef.current) {
      try { await shakaRef.current.destroy(); } catch {}
      shakaRef.current = null;
    }
  };

  // --- DASH (Shaka Player) setup ---
  const initShaka = useCallback(async () => {
    const video = videoRef.current;
    if (!video || !channel.streamUrl) { setError(true); return; }

    try {
      const shaka = await import("shaka-player");
      shaka.default.polyfill.installAll();

      if (!shaka.default.Player.isBrowserSupported()) {
        setCurrentMode("native");
        return;
      }

      const player = new shaka.default.Player();
      await player.attach(video);
      shakaRef.current = player;

      player.configure({
        streaming: {
          bufferingGoal: 30,
          rebufferingGoal: 2,
          retryParameters: { maxAttempts: 5, baseDelay: 1000, backoffFactor: 2 },
        },
        abr: { enabled: true },
      });

      player.addEventListener("error", (event: any) => {
        console.error("Shaka error:", event.detail);
        if (retryCountRef.current < 3) {
          retryCountRef.current++;
          setTimeout(() => initShaka(), 2000);
        } else {
          setError(true);
          setBuffering(false);
          onFatalError?.();
        }
      });

      player.addEventListener("buffering", (e: any) => setBuffering(e.buffering));

      player.addEventListener("adaptation", () => {
        const tracks = player.getVariantTracks();
        const activeTrack = tracks.find((t: any) => t.active);
        if (activeTrack && activeTrack.height) {
          setCurrentResLabel(qualityLabel(activeTrack.height));
        }
        const levels = tracks
          .filter((t: any) => t.height > 0)
          .reduce((acc: any[], t: any) => {
            if (!acc.find((a: any) => a.height === t.height)) {
              acc.push({ height: t.height, index: t.id });
            }
            return acc;
          }, []);
        setQualityLevels(levels.sort((a: any, b: any) => b.height - a.height));
      });

      await player.load(channel.streamUrl);
      setBuffering(false);
      retryCountRef.current = 0;
      setIsLiveStream(player.isLive());

      const tracks = player.getVariantTracks();
      const levels = tracks
        .filter((t: any) => t.height > 0)
        .reduce((acc: any[], t: any) => {
          if (!acc.find((a: any) => a.height === t.height)) {
            acc.push({ height: t.height, index: t.id });
          }
          return acc;
        }, []);
      setQualityLevels(levels.sort((a: any, b: any) => b.height - a.height));
      video.play().catch(() => {});
    } catch (err) {
      console.error("Shaka init error:", err);
      setError(true);
      setBuffering(false);
    }
  }, [channel.streamUrl]);

  // Main player setup effect
  useEffect(() => {
    setError(false);
    setBuffering(true);
    setQualityLevels([]);
    setCurrentQuality(-1);
    setCurrentResLabel("Auto");
    retryCountRef.current = 0;
    destroyHls();
    (async () => { await destroyShaka(); })();

    const detectedMode = detectStreamType(channel.streamUrl);
    if (detectedMode === "iframe") {
      setCurrentMode("iframe");
      return;
    }
    setCurrentMode(detectedMode);

    const video = videoRef.current;
    if (!video) return;
    const url = channel.streamUrl;
    if (!url) { setError(true); return; }

    if (detectedMode === "dash") {
      initShaka();
    } else if (detectedMode === "hls" || detectedMode === "hls-retry") {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true, lowLatencyMode: true, startLevel: -1,
          ...(detectedMode === "hls-retry" ? { fragLoadingMaxRetry: 10, manifestLoadingMaxRetry: 10, levelLoadingMaxRetry: 10 } : {}),
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
          setBuffering(false);
          const levels = hls.levels.map((level, index) => ({ height: level.height, index })).filter(l => l.height > 0);
          setQualityLevels(levels);
          setIsLiveStream(true);
        });
        hls.on(Hls.Events.LEVEL_LOADED, (_, data) => setIsLiveStream(data.details.live));
        hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
          const level = hls.levels[data.level];
          if (level) setCurrentResLabel(qualityLabel(level.height));
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            if (detectedMode === "hls") {
              setCurrentMode("hls-retry");
            } else {
              setError(true);
              setBuffering(false);
              onFatalError?.();
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        video.addEventListener("loadedmetadata", () => { video.play().catch(() => {}); setBuffering(false); });
      } else {
        setCurrentMode("native");
      }
    } else {
      // native (mp4, webm, etc.)
      video.src = url;
      video.addEventListener("canplay", () => setBuffering(false));
      video.addEventListener("error", () => { setError(true); setBuffering(false); });
      video.play().catch(() => {});
      setIsLiveStream(false);
    }

    const onWaiting = () => setBuffering(true);
    const onPlaying = () => { setBuffering(false); setPlaying(true); };
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => { setCurrentTime(video.currentTime); setDuration(video.duration || 0); };

    video.addEventListener("waiting", onWaiting);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      destroyHls();
      destroyShaka();
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [channel.streamUrl, channel.playerType]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  const seekBy = (seconds: number) => {
    const video = videoRef.current;
    if (!video || isLiveStream) return;
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
    setSeekIndicator({ side: seconds < 0 ? "left" : "right", seconds: Math.abs(seconds) });
    setTimeout(() => setSeekIndicator(null), 600);
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      try { (screen.orientation as any)?.unlock?.(); } catch {}
    } else {
      await el.requestFullscreen();
      try { await (screen.orientation as any)?.lock?.("landscape"); } catch {}
    }
  };

  const handleVolumeChange = (val: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = val; setVolume(val); setMuted(val === 0); video.muted = val === 0;
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !muted; setMuted(!muted);
  };

  const handleSeek = (val: number) => {
    const video = videoRef.current;
    if (!video || isLiveStream) return;
    video.currentTime = val; setCurrentTime(val);
  };

  const handleQualityChange = (levelIndex: number) => {
    if (currentMode === "dash" && shakaRef.current) {
      if (levelIndex === -1) {
        shakaRef.current.configure({ abr: { enabled: true } });
        setCurrentResLabel("Auto");
      } else {
        shakaRef.current.configure({ abr: { enabled: false } });
        const tracks = shakaRef.current.getVariantTracks();
        const target = tracks.find((t: any) => t.id === levelIndex);
        if (target) {
          shakaRef.current.selectVariantTrack(target, true);
          setCurrentResLabel(qualityLabel(target.height));
        }
      }
    } else if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      if (levelIndex === -1) {
        setCurrentResLabel("Auto");
      } else {
        const level = hlsRef.current.levels[levelIndex];
        if (level) setCurrentResLabel(qualityLabel(level.height));
      }
    }
    setCurrentQuality(levelIndex);
    setShowQualityMenu(false);
  };

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  };

  const handleScreenModeChange = (mode: ScreenMode) => {
    setScreenMode(mode);
    if (mode === "theater") {
      setTheaterMode(true);
    } else {
      setTheaterMode(false);
    }
    setShowScreenMenu(false);
  };

  const goLive = () => {
    const video = videoRef.current;
    if (!video) return;
    if (shakaRef.current && shakaRef.current.isLive()) {
      video.currentTime = shakaRef.current.seekRange().end;
    } else if (hlsRef.current) {
      video.currentTime = video.duration || video.buffered.end(video.buffered.length - 1);
    }
  };

  const togglePiP = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {}
  };

  // Double-tap seek for mobile
  const handleTap = (e: React.TouchEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.changedTouches[0].clientX - rect.left;
    const side: "left" | "right" = x < rect.width / 2 ? "left" : "right";
    const now = Date.now();

    if (now - lastTapRef.current.time < 300 && lastTapRef.current.side === side) {
      seekBy(side === "left" ? -10 : 10);
      lastTapRef.current = { time: 0, side: null };
    } else {
      lastTapRef.current = { time: now, side };
      setTimeout(() => {
        if (lastTapRef.current.time === now) resetControlsTimer();
      }, 310);
    }
  };

  // Swipe gestures: right = volume, left = brightness
  const touchStartRef = useRef<{ x: number; y: number; vol: number; bright: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, vol: volume, bright: brightness };
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !containerRef.current) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const startX = touchStartRef.current.x - rect.left;
    const dy = touchStartRef.current.y - touch.clientY;
    const sensitivity = rect.height * 0.5;

    if (startX > rect.width / 2) {
      // Right side → volume
      const newVol = Math.max(0, Math.min(1, touchStartRef.current.vol + dy / sensitivity));
      handleVolumeChange(newVol);
      setVolumeIndicator(true);
      setBrightnessIndicator(false);
    } else {
      // Left side → brightness
      const newBright = Math.max(0.2, Math.min(1.5, touchStartRef.current.bright + dy / sensitivity));
      setBrightness(newBright);
      setBrightnessIndicator(true);
      setVolumeIndicator(false);
    }
  };
  const handleTouchEnd = () => {
    setTimeout(() => { setVolumeIndicator(false); setBrightnessIndicator(false); }, 600);
  };

  const formatTime = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return "0:00";
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const qualityLabel = (h: number) => h >= 1080 ? "1080p" : h >= 720 ? "720p" : h >= 480 ? "480p" : h >= 360 ? "360p" : `${h}p`;

  const getVideoStyle = (): string => {
    switch (screenMode) {
      case "contain": return "object-contain";
      case "stretch": return "w-full h-full";
      case "cover": return "object-cover";
      case "theater": return "object-contain";
      default: return "object-contain";
    }
  };

  const getVideoInlineStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = { filter: `brightness(${brightness})` };
    if (screenMode === "stretch") {
      base.objectFit = "fill";
    }
    return base;
  };

  if (currentMode === "iframe" || channel.playerType === "iframe") {
    return (
      <div className="relative w-full aspect-video bg-background rounded-xl overflow-hidden">
        <iframe src={channel.streamUrl} className="w-full h-full border-0" allowFullScreen allow="autoplay; encrypted-media" />
      </div>
    );
  }

  const streamTypeBadge = currentMode === "dash" ? "DASH" : currentMode === "native" ? "MP4" : "HLS";

  return (
    <div
      ref={containerRef}
      className={`relative bg-background overflow-hidden group select-none transition-all duration-500 ${
        theaterMode ? "w-full max-w-none rounded-none aspect-[21/9]" : "w-full aspect-video rounded-xl"
      }`}
      onMouseMove={resetControlsTimer}
      onTouchEnd={(e) => { handleTap(e); handleTouchEnd(); }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <video
        ref={videoRef}
        className={`w-full h-full ${getVideoStyle()}`}
        style={getVideoInlineStyle()}
        playsInline
        muted={muted}
        autoPlay
      />

      {/* Buffering spinner */}
      {buffering && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm pointer-events-none z-10">
          <div className="relative flex flex-col items-center gap-3">
            <div className="relative">
              <Loader2 className="w-14 h-14 text-primary animate-spin" />
              <div className="absolute inset-0 rounded-full blur-2xl bg-primary/30" />
            </div>
            <span className="text-xs text-muted-foreground font-medium animate-pulse">Buffering...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-md gap-4 z-10">
          <div className="relative">
            <AlertTriangle className="w-14 h-14 text-destructive" />
            <div className="absolute inset-0 blur-2xl bg-destructive/20" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Stream unavailable</p>
          <button
            onClick={() => { setError(false); retryCountRef.current = 0; setCurrentMode(detectStreamType(channel.streamUrl)); }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      )}

      {/* Double-tap seek indicator */}
      {seekIndicator && (
        <div className={`absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none animate-fade-in ${seekIndicator.side === "left" ? "left-8" : "right-8"}`}>
          <div className="bg-background/70 backdrop-blur-xl rounded-2xl px-5 py-3 flex items-center gap-2 border border-border/30">
            {seekIndicator.side === "left" ? <SkipBack className="w-5 h-5 text-primary" /> : <SkipForward className="w-5 h-5 text-primary" />}
            <span className="text-foreground text-sm font-bold">{seekIndicator.seconds}s</span>
          </div>
        </div>
      )}

      {/* Volume swipe indicator */}
      {volumeIndicator && (
        <div className="absolute right-6 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <div className="bg-background/70 backdrop-blur-xl rounded-2xl px-4 py-3 flex flex-col items-center gap-2 border border-border/30">
            <Volume2 className="w-5 h-5 text-primary" />
            <div className="w-1 h-16 rounded-full bg-muted overflow-hidden relative">
              <div className="absolute bottom-0 w-full bg-primary rounded-full transition-all" style={{ height: `${volume * 100}%` }} />
            </div>
            <span className="text-[10px] text-foreground font-bold">{Math.round(volume * 100)}%</span>
          </div>
        </div>
      )}

      {/* Brightness swipe indicator */}
      {brightnessIndicator && (
        <div className="absolute left-6 top-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <div className="bg-background/70 backdrop-blur-xl rounded-2xl px-4 py-3 flex flex-col items-center gap-2 border border-border/30">
            <span className="text-lg">☀️</span>
            <div className="w-1 h-16 rounded-full bg-muted overflow-hidden relative">
              <div className="absolute bottom-0 w-full bg-accent rounded-full transition-all" style={{ height: `${Math.min(100, (brightness / 1.5) * 100)}%` }} />
            </div>
            <span className="text-[10px] text-foreground font-bold">{Math.round(brightness * 100)}%</span>
          </div>
        </div>
      )}

      {/* Top bar badges */}
      {!error && (
        <div className={`absolute top-0 left-0 right-0 z-20 flex items-start justify-between p-3 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
          <div className="flex items-center gap-2">
            {/* LIVE badge */}
            {isLiveStream && (
              <button onClick={goLive} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/90 backdrop-blur-md text-destructive-foreground text-[11px] font-bold uppercase tracking-wider shadow-lg shadow-destructive/20 hover:shadow-destructive/40 transition-all">
                <span className="w-2 h-2 rounded-full bg-destructive-foreground animate-pulse" />
                Live
              </button>
            )}
            {/* Resolution label */}
            <span className="px-2.5 py-1 rounded-lg bg-card/80 backdrop-blur-md text-foreground text-[10px] font-bold uppercase tracking-wider border border-border/30">
              {currentResLabel}
            </span>
          </div>
          {/* Stream type badge */}
          <span className="px-2.5 py-1 rounded-lg bg-primary/20 backdrop-blur-md text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20">
            {streamTypeBadge}
          </span>
        </div>
      )}

      {/* Controls overlay */}
      <div className={`absolute inset-0 z-10 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        {/* Top gradient */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-background/80 to-transparent" />

        {/* Center play/pause button */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {!playing && !buffering && !error && (
            <button onClick={togglePlay} className="pointer-events-auto p-5 rounded-full bg-primary/20 backdrop-blur-xl border border-primary/30 text-primary shadow-2xl shadow-primary/20 hover:bg-primary/30 transition-all animate-scale-in">
              <Play className="w-10 h-10 fill-current" />
            </button>
          )}
        </div>

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent pt-20 pb-3 px-3 space-y-2">
          {/* Seek bar */}
          {!isLiveStream && duration > 0 && (
            <div className="flex items-center gap-2 px-1">
              <span className="text-[10px] text-foreground/80 font-mono tabular-nums min-w-[36px]">{formatTime(currentTime)}</span>
              <div className="flex-1 relative group/seek h-6 flex items-center">
                <input
                  type="range" min={0} max={duration} value={currentTime}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  className="w-full h-1 group-hover/seek:h-2 rounded-full appearance-none cursor-pointer transition-all duration-200
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg
                    [&::-webkit-slider-thumb]:shadow-primary/40 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-primary-foreground/50"
                  style={{ background: `linear-gradient(to right, hsl(var(--primary)) ${(currentTime / duration) * 100}%, hsl(var(--muted)) ${(currentTime / duration) * 100}%)` }}
                />
              </div>
              <span className="text-[10px] text-foreground/80 font-mono tabular-nums min-w-[36px] text-right">{formatTime(duration)}</span>
            </div>
          )}

          {/* Control buttons */}
          <div className="flex items-center justify-between gap-0.5">
            {/* Left controls */}
            <div className="flex items-center gap-0.5">
              {/* Skip back */}
              {!isLiveStream && (
                <button onClick={() => seekBy(-10)} className="p-2 rounded-lg hover:bg-foreground/10 text-foreground transition-colors">
                  <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}

              <button onClick={togglePlay} className="p-2 rounded-lg hover:bg-foreground/10 text-foreground transition-colors">
                {playing ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>

              {/* Skip forward */}
              {!isLiveStream && (
                <button onClick={() => seekBy(10)} className="p-2 rounded-lg hover:bg-foreground/10 text-foreground transition-colors">
                  <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}

              {/* Volume */}
              <div className="flex items-center gap-0.5 group/vol">
                <button onClick={toggleMute} className="p-2 rounded-lg hover:bg-foreground/10 text-foreground transition-colors">
                  {muted || volume === 0 ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                </button>
                <div className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-300">
                  <input
                    type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="w-full h-1 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
                    style={{ background: `linear-gradient(to right, hsl(var(--foreground)) ${(muted ? 0 : volume) * 100}%, hsl(var(--muted)) ${(muted ? 0 : volume) * 100}%)` }}
                  />
                </div>
              </div>

              {/* Live indicator */}
              {isLiveStream && (
                <button onClick={goLive} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-destructive hover:bg-destructive/10 transition-colors">
                  <Radio className="w-3 h-3" /> LIVE
                </button>
              )}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-0.5">
              {/* Playback speed */}
              <div className="relative">
                <button onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowQualityMenu(false); setShowScreenMenu(false); }}
                  className="p-2 rounded-lg hover:bg-foreground/10 text-foreground transition-colors">
                  <Gauge className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-card/95 backdrop-blur-xl border border-border rounded-xl overflow-hidden shadow-2xl min-w-[110px] z-30">
                    <div className="p-1.5">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase px-3 py-1 tracking-wider">Speed</p>
                      {PLAYBACK_SPEEDS.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleSpeedChange(s)}
                          className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${playbackSpeed === s ? "bg-primary text-primary-foreground font-bold" : "text-foreground hover:bg-foreground/10"}`}
                        >
                          {s}x {s === 1 && "(Normal)"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quality selector */}
              {qualityLevels.length > 0 && (
                <div className="relative">
                  <button onClick={() => { setShowQualityMenu(!showQualityMenu); setShowSpeedMenu(false); setShowScreenMenu(false); }}
                    className="p-2 rounded-lg hover:bg-foreground/10 text-foreground transition-colors">
                    <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  {showQualityMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-card/95 backdrop-blur-xl border border-border rounded-xl overflow-hidden shadow-2xl min-w-[140px] z-30">
                      <div className="p-1.5">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase px-3 py-1 tracking-wider">Quality</p>
                        <button
                          onClick={() => handleQualityChange(-1)}
                          className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${currentQuality === -1 ? "bg-primary text-primary-foreground font-bold" : "text-foreground hover:bg-foreground/10"}`}
                        >
                          Auto
                        </button>
                        {qualityLevels.map((level) => (
                          <button
                            key={level.index}
                            onClick={() => handleQualityChange(level.index)}
                            className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${currentQuality === level.index ? "bg-primary text-primary-foreground font-bold" : "text-foreground hover:bg-foreground/10"}`}
                          >
                            {qualityLabel(level.height)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Screen mode */}
              <div className="relative">
                <button onClick={() => { setShowScreenMenu(!showScreenMenu); setShowQualityMenu(false); setShowSpeedMenu(false); }}
                  className="p-2 rounded-lg hover:bg-foreground/10 text-foreground transition-colors">
                  <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                {showScreenMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-card/95 backdrop-blur-xl border border-border rounded-xl overflow-hidden shadow-2xl min-w-[150px] z-30">
                    <div className="p-1.5">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase px-3 py-1 tracking-wider">Display</p>
                      {SCREEN_MODES.map((m) => (
                        <button
                          key={m.value}
                          onClick={() => handleScreenModeChange(m.value)}
                          className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center gap-2 ${screenMode === m.value ? "bg-primary text-primary-foreground font-bold" : "text-foreground hover:bg-foreground/10"}`}
                        >
                          <span>{m.icon}</span> {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* PiP */}
              <button onClick={togglePiP} className="p-2 rounded-lg hover:bg-foreground/10 text-foreground transition-colors hidden sm:block">
                <PictureInPicture2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="p-2 rounded-lg hover:bg-foreground/10 text-foreground transition-colors">
                {isFullscreen ? <Minimize className="w-5 h-5 sm:w-6 sm:h-6" /> : <Maximize className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Click to play/pause center overlay (desktop) */}
      <div
        className="absolute inset-0 z-[5] hidden md:block cursor-pointer"
        onClick={(e) => { e.stopPropagation(); togglePlay(); resetControlsTimer(); }}
      />
    </div>
  );
};

export default Player;
