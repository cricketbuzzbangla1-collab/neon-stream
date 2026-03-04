import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import {
  Volume2, VolumeX, Maximize, Minimize, AlertTriangle, Loader2,
  Play, Pause, RotateCcw, Radio, SkipBack, SkipForward,
  PictureInPicture2, Settings, Gauge
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface PlaylistChannel {
  name: string;
  logo: string;
  group: string;
  streamUrl: string;
}

interface PlaylistPlayerProps {
  channel: PlaylistChannel;
  autoPlay?: boolean;
  onError?: () => void;
}

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const PlaylistPlayer = ({ channel, autoPlay = true, onError }: PlaylistPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastTapRef = useRef<{ time: number; side: "left" | "right" | null }>({ time: 0, side: null });
  const retryCountRef = useRef(0);

  const isMobile = useIsMobile();
  const [error, setError] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playing, setPlaying] = useState(autoPlay);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLiveStream, setIsLiveStream] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [qualityLevels, setQualityLevels] = useState<{ height: number; index: number }[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentResLabel, setCurrentResLabel] = useState("Auto");
  const [seekIndicator, setSeekIndicator] = useState<{ side: "left" | "right"; seconds: number } | null>(null);
  const [volumeIndicator, setVolumeIndicator] = useState(false);

  const closeAllMenus = useCallback(() => {
    setShowQualityMenu(false);
    setShowSpeedMenu(false);
  }, []);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (playing) { setShowControls(false); closeAllMenus(); }
    }, 3500);
  }, [playing, closeAllMenus]);

  useEffect(() => {
    resetControlsTimer();
    return () => clearTimeout(controlsTimerRef.current);
  }, [playing, resetControlsTimer]);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // Auto-fullscreen on mobile
  useEffect(() => {
    if (isMobile && autoPlay && containerRef.current) {
      const timer = setTimeout(() => {
        containerRef.current?.requestFullscreen?.().catch(() => {});
        try { (screen.orientation as any)?.lock?.("landscape").catch?.(() => {}); } catch {}
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isMobile, autoPlay]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const video = videoRef.current;
      if (!video) return;
      switch (e.key.toLowerCase()) {
        case " ": e.preventDefault(); togglePlay(); break;
        case "f": e.preventDefault(); toggleFullscreen(); break;
        case "m": e.preventDefault(); toggleMute(); break;
        case "arrowleft": e.preventDefault(); seekBy(-10); break;
        case "arrowright": e.preventDefault(); seekBy(10); break;
        case "arrowup": e.preventDefault(); handleVolumeChange(Math.min(1, volume + 0.1)); break;
        case "arrowdown": e.preventDefault(); handleVolumeChange(Math.max(0, volume - 0.1)); break;
      }
      resetControlsTimer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [volume, resetControlsTimer]);

  const destroyHls = () => {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
  };

  const detectIsHls = (url: string) =>
    url.includes(".m3u8") || url.includes("m3u") || (!url.match(/\.(mp4|webm|ogg|mov)(\?|$)/i));

  // Main player setup
  useEffect(() => {
    setError(false);
    setBuffering(true);
    setQualityLevels([]);
    setCurrentQuality(-1);
    setCurrentResLabel("Auto");
    retryCountRef.current = 0;
    destroyHls();

    const video = videoRef.current;
    if (!video) return;
    const url = channel.streamUrl;
    if (!url) { setError(true); return; }

    const isHls = detectIsHls(url);

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        startLevel: -1,
        fragLoadingMaxRetry: 8,
        manifestLoadingMaxRetry: 8,
        levelLoadingMaxRetry: 8,
        xhrSetup: (xhr: XMLHttpRequest) => {
          // Allow mixed content for HTTP streams in HTTPS environment
          xhr.withCredentials = false;
        },
      });
      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        setBuffering(false);
        const levels = hls.levels
          .map((level, index) => ({ height: level.height, index }))
          .filter((l) => l.height > 0);
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
          if (retryCountRef.current < 3) {
            retryCountRef.current++;
            hls.destroy();
            hlsRef.current = null;
            // Retry after delay
            setTimeout(() => {
              if (videoRef.current) {
                videoRef.current.src = url;
                videoRef.current.play().catch(() => {});
              }
            }, 1500);
          } else {
            setError(true);
            setBuffering(false);
            onError?.();
          }
        }
      });
    } else if (isHls && video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = url;
      video.addEventListener("loadedmetadata", () => { video.play().catch(() => {}); setBuffering(false); });
    } else {
      // Native (mp4, webm, direct HTTP)
      video.src = url;
      video.addEventListener("canplay", () => setBuffering(false));
      video.addEventListener("error", () => { setError(true); setBuffering(false); onError?.(); });
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
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [channel.streamUrl]);

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
    if (hlsRef.current) {
      hlsRef.current.currentLevel = levelIndex;
      if (levelIndex === -1) setCurrentResLabel("Auto");
      else {
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

  const goLive = () => {
    const video = videoRef.current;
    if (!video) return;
    if (hlsRef.current) {
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

  // Double-tap seek (mobile)
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
      setTimeout(() => { if (lastTapRef.current.time === now) resetControlsTimer(); }, 310);
    }
  };

  // Swipe volume (right side)
  const touchStartRef = useRef<{ x: number; y: number; vol: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, vol: volume };
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current || !containerRef.current) return;
    const touch = e.touches[0];
    const rect = containerRef.current.getBoundingClientRect();
    const startX = touchStartRef.current.x - rect.left;
    const dy = touchStartRef.current.y - touch.clientY;
    const sensitivity = rect.height * 0.5;
    if (startX > rect.width / 2) {
      const newVol = Math.max(0, Math.min(1, touchStartRef.current.vol + dy / sensitivity));
      handleVolumeChange(newVol);
      setVolumeIndicator(true);
    }
  };
  const handleTouchEnd = () => {
    setTimeout(() => setVolumeIndicator(false), 600);
  };

  const formatTime = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return "0:00";
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const qualityLabel = (h: number) =>
    h >= 1080 ? "1080p" : h >= 720 ? "720p" : h >= 480 ? "480p" : h >= 360 ? "360p" : `${h}p`;

  const streamTypeBadge = detectIsHls(channel.streamUrl) ? "HLS" : "MP4";

  return (
    <div
      ref={containerRef}
      className="relative bg-background overflow-hidden group select-none w-full aspect-video rounded-xl transition-all duration-300"
      onMouseMove={resetControlsTimer}
      onTouchEnd={(e) => { handleTap(e); handleTouchEnd(); }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        muted={muted}
        autoPlay={autoPlay}
      />

      {/* Channel info overlay (top-left) */}
      <div className={`absolute top-0 left-0 right-0 z-20 flex items-start justify-between p-3 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0"}`}>
        <div className="flex items-center gap-2.5">
          {channel.logo ? (
            <img
              src={channel.logo}
              alt={channel.name}
              className="w-9 h-9 rounded-lg object-cover border border-border/30 shadow-lg"
              loading="lazy"
            />
          ) : (
            <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center border border-border/30">
              <span className="text-sm font-bold text-muted-foreground">{channel.name.charAt(0)}</span>
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-bold text-foreground drop-shadow-lg leading-tight">{channel.name}</span>
            <span className="text-[10px] text-muted-foreground drop-shadow">{channel.group}</span>
          </div>
          {isLiveStream && (
            <button onClick={goLive} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-destructive/90 backdrop-blur-md text-destructive-foreground text-[10px] font-bold uppercase tracking-wider shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive-foreground animate-pulse" />
              Live
            </button>
          )}
          <span className="px-2 py-0.5 rounded-md bg-card/80 backdrop-blur-md text-foreground text-[9px] font-bold uppercase tracking-wider border border-border/30">
            {currentResLabel}
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-md bg-primary/20 backdrop-blur-md text-primary text-[9px] font-bold uppercase tracking-wider border border-primary/20">
          {streamTypeBadge}
        </span>
      </div>

      {/* Buffering */}
      {buffering && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm pointer-events-none z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Loader2 className="w-14 h-14 text-primary animate-spin" />
              <div className="absolute inset-0 rounded-full blur-2xl bg-primary/30" />
            </div>
            <span className="text-xs text-muted-foreground font-medium animate-pulse">Loading stream...</span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-md gap-4 z-10">
          <div className="flex flex-col items-center gap-3">
            {channel.logo && (
              <img src={channel.logo} alt="" className="w-12 h-12 rounded-xl object-cover opacity-50" />
            )}
            <AlertTriangle className="w-12 h-12 text-destructive" />
            <p className="text-sm text-muted-foreground font-medium text-center px-4">
              Unable to play <span className="text-foreground font-semibold">{channel.name}</span>
            </p>
            <p className="text-[10px] text-muted-foreground/70">Stream may be offline or incompatible</p>
          </div>
          <button
            onClick={() => {
              setError(false);
              retryCountRef.current = 0;
              // Trigger re-mount via key change isn't available, so re-run setup
              const video = videoRef.current;
              if (video) {
                video.src = channel.streamUrl;
                video.play().catch(() => {});
                setBuffering(true);
              }
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
          >
            <RotateCcw className="w-4 h-4" /> Retry Stream
          </button>
        </div>
      )}

      {/* Seek indicator */}
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

      {/* Controls overlay */}
      <div className={`absolute inset-0 z-10 transition-opacity duration-300 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-background/80 to-transparent" />

        {/* Center play/pause */}
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
            <div className="flex items-center gap-0.5">
              {!isLiveStream && (
                <button onClick={() => seekBy(-10)} className="p-2 rounded-lg hover:bg-foreground/10 text-foreground transition-colors">
                  <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
              <button onClick={togglePlay} className="p-2 rounded-lg hover:bg-foreground/10 text-foreground transition-colors">
                {playing ? <Pause className="w-5 h-5 sm:w-6 sm:h-6" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6" />}
              </button>
              {!isLiveStream && (
                <button onClick={() => seekBy(10)} className="p-2 rounded-lg hover:bg-foreground/10 text-foreground transition-colors">
                  <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              )}
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
              {isLiveStream && (
                <button onClick={goLive} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-destructive hover:bg-destructive/10 transition-colors">
                  <Radio className="w-3 h-3" /> LIVE
                </button>
              )}
            </div>

            <div className="flex items-center gap-0.5">
              {/* Speed */}
              <div className="relative">
                <button onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowQualityMenu(false); }}
                  className="p-2 rounded-lg hover:bg-foreground/10 text-foreground transition-colors">
                  <Gauge className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 bg-card/95 backdrop-blur-xl border border-border rounded-xl overflow-hidden shadow-2xl min-w-[110px] z-30">
                    <div className="p-1.5">
                      <p className="text-[10px] text-muted-foreground font-semibold uppercase px-3 py-1 tracking-wider">Speed</p>
                      {PLAYBACK_SPEEDS.map((s) => (
                        <button key={s} onClick={() => handleSpeedChange(s)}
                          className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${playbackSpeed === s ? "bg-primary text-primary-foreground font-bold" : "text-foreground hover:bg-foreground/10"}`}>
                          {s}x {s === 1 && "(Normal)"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quality */}
              {qualityLevels.length > 0 && (
                <div className="relative">
                  <button onClick={() => { setShowQualityMenu(!showQualityMenu); setShowSpeedMenu(false); }}
                    className="p-2 rounded-lg hover:bg-foreground/10 text-foreground transition-colors">
                    <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                  {showQualityMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-card/95 backdrop-blur-xl border border-border rounded-xl overflow-hidden shadow-2xl min-w-[140px] z-30">
                      <div className="p-1.5">
                        <p className="text-[10px] text-muted-foreground font-semibold uppercase px-3 py-1 tracking-wider">Quality</p>
                        <button onClick={() => handleQualityChange(-1)}
                          className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${currentQuality === -1 ? "bg-primary text-primary-foreground font-bold" : "text-foreground hover:bg-foreground/10"}`}>
                          Auto
                        </button>
                        {qualityLevels.map((level) => (
                          <button key={level.index} onClick={() => handleQualityChange(level.index)}
                            className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors ${currentQuality === level.index ? "bg-primary text-primary-foreground font-bold" : "text-foreground hover:bg-foreground/10"}`}>
                            {qualityLabel(level.height)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

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

      {/* Click to play/pause (desktop) */}
      <div
        className="absolute inset-0 z-[5] hidden md:block cursor-pointer"
        onClick={(e) => { e.stopPropagation(); togglePlay(); resetControlsTimer(); }}
      />
    </div>
  );
};

export default PlaylistPlayer;
