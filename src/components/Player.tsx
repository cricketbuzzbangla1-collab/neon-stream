import { useEffect, useRef, useState, useCallback } from "react";
import Hls from "hls.js";
import { Channel } from "@/hooks/useFirestore";
import {
  Volume2, VolumeX, Maximize, Minimize, AlertTriangle, Loader2,
  Play, Pause, Settings, Radio, Maximize2, Minimize2, RotateCcw
} from "lucide-react";

interface PlayerProps {
  channel: Channel;
}

const Player = ({ channel }: PlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const lastTapRef = useRef<{ time: number; side: "left" | "right" | null }>({ time: 0, side: null });

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
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 = auto
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [objectFit, setObjectFit] = useState<"contain" | "cover">("contain");
  const [seekIndicator, setSeekIndicator] = useState<{ side: "left" | "right"; seconds: number } | null>(null);

  // Auto-hide controls
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  useEffect(() => {
    resetControlsTimer();
    return () => clearTimeout(controlsTimerRef.current);
  }, [playing, resetControlsTimer]);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // HLS setup
  useEffect(() => {
    setError(false);
    setBuffering(true);
    setQualityLevels([]);
    setCurrentQuality(-1);
    destroyHls();

    if (channel.playerType === "iframe") return;

    const video = videoRef.current;
    if (!video) return;

    const url = channel.streamUrl;
    if (!url) { setError(true); return; }

    if (currentMode === "hls" || currentMode === "hls-retry") {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          startLevel: -1,
          ...(currentMode === "hls-retry" ? {
            fragLoadingMaxRetry: 10,
            manifestLoadingMaxRetry: 10,
            levelLoadingMaxRetry: 10,
          } : {}),
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
          video.play().catch(() => {});
          setBuffering(false);
          // Extract quality levels
          const levels = hls.levels.map((level, index) => ({
            height: level.height,
            index,
          })).filter(l => l.height > 0);
          setQualityLevels(levels);
          // Detect live
          setIsLiveStream(!hls.levels[0]?.details?.live === false ? true : true);
        });

        hls.on(Hls.Events.LEVEL_LOADED, (_, data) => {
          setIsLiveStream(data.details.live);
        });

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            if (currentMode === "hls") {
              setCurrentMode("hls-retry");
            } else {
              setCurrentMode("native");
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
        video.addEventListener("loadedmetadata", () => {
          video.play().catch(() => {});
          setBuffering(false);
        });
      } else {
        setCurrentMode("native");
      }
    } else if (currentMode === "native") {
      video.src = url;
      video.addEventListener("canplay", () => { setBuffering(false); });
      video.addEventListener("error", () => { setError(true); setBuffering(false); });
      video.play().catch(() => {});
    }

    const onWaiting = () => setBuffering(true);
    const onPlaying = () => { setBuffering(false); setPlaying(true); };
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
    };

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
  }, [channel.streamUrl, currentMode]);

  const destroyHls = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      try {
        (screen.orientation as any)?.unlock?.();
      } catch {}
    } else {
      await el.requestFullscreen();
      try {
        await (screen.orientation as any)?.lock?.("landscape");
      } catch {}
    }
  };

  const handleVolumeChange = (val: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = val;
    setVolume(val);
    setMuted(val === 0);
    video.muted = val === 0;
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !muted;
    setMuted(!muted);
  };

  const handleSeek = (val: number) => {
    const video = videoRef.current;
    if (!video || isLiveStream) return;
    video.currentTime = val;
    setCurrentTime(val);
  };

  const handleQualityChange = (levelIndex: number) => {
    if (!hlsRef.current) return;
    hlsRef.current.currentLevel = levelIndex;
    setCurrentQuality(levelIndex);
    setShowQualityMenu(false);
  };

  const goLive = () => {
    const video = videoRef.current;
    if (!video) return;
    if (hlsRef.current) {
      video.currentTime = video.duration || video.buffered.end(video.buffered.length - 1);
    }
  };

  // Double-tap seek for mobile
  const handleTap = (e: React.TouchEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.changedTouches[0].clientX - rect.left;
    const side: "left" | "right" = x < rect.width / 2 ? "left" : "right";
    const now = Date.now();

    if (now - lastTapRef.current.time < 300 && lastTapRef.current.side === side) {
      // Double tap detected
      const video = videoRef.current;
      if (video && !isLiveStream) {
        const seekAmount = side === "left" ? -10 : 10;
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seekAmount));
        setSeekIndicator({ side, seconds: Math.abs(seekAmount) });
        setTimeout(() => setSeekIndicator(null), 600);
      }
      lastTapRef.current = { time: 0, side: null };
    } else {
      lastTapRef.current = { time: now, side };
      // Single tap — toggle controls
      setTimeout(() => {
        if (lastTapRef.current.time === now) {
          resetControlsTimer();
        }
      }, 310);
    }
  };

  // Swipe gestures for volume (right side)
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

    // Only handle vertical swipes on right half (volume)
    if (startX > rect.width / 2) {
      const sensitivity = rect.height * 0.6;
      const newVol = Math.max(0, Math.min(1, touchStartRef.current.vol + dy / sensitivity));
      handleVolumeChange(newVol);
    }
  };

  const formatTime = (s: number) => {
    if (!isFinite(s) || isNaN(s)) return "0:00";
    const mins = Math.floor(s / 60);
    const secs = Math.floor(s % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const qualityLabel = (h: number) => h >= 1080 ? "1080p" : h >= 720 ? "720p" : h >= 480 ? "480p" : h >= 360 ? "360p" : `${h}p`;

  if (channel.playerType === "iframe") {
    return (
      <div className="relative w-full aspect-video bg-background rounded-xl overflow-hidden">
        <iframe
          src={channel.streamUrl}
          className="w-full h-full border-0"
          allowFullScreen
          allow="autoplay; encrypted-media"
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-video bg-background rounded-xl overflow-hidden group select-none"
      onMouseMove={resetControlsTimer}
      onTouchEnd={handleTap}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <video
        ref={videoRef}
        className={`w-full h-full ${objectFit === "cover" ? "object-cover" : "object-contain"}`}
        playsInline
        muted={muted}
        autoPlay
      />

      {/* Buffering spinner */}
      {buffering && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-sm pointer-events-none z-10">
          <div className="relative">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <div className="absolute inset-0 rounded-full blur-xl bg-primary/20" />
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 gap-4 z-10">
          <AlertTriangle className="w-12 h-12 text-destructive" />
          <p className="text-sm text-muted-foreground">Stream unavailable</p>
          <button
            onClick={() => { setError(false); setCurrentMode("hls"); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
          >
            <RotateCcw className="w-4 h-4" /> Retry
          </button>
        </div>
      )}

      {/* Double-tap seek indicator */}
      {seekIndicator && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none animate-fade-in ${
            seekIndicator.side === "left" ? "left-12" : "right-12"
          }`}
        >
          <div className="bg-background/60 backdrop-blur-md rounded-full px-4 py-2 flex items-center gap-1">
            <span className="text-foreground text-sm font-bold">
              {seekIndicator.side === "left" ? "−" : "+"}{seekIndicator.seconds}s
            </span>
          </div>
        </div>
      )}

      {/* LIVE badge */}
      {isLiveStream && !error && (
        <div className="absolute top-3 left-3 z-20">
          <button
            onClick={goLive}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-destructive/90 backdrop-blur-sm text-destructive-foreground text-[11px] font-bold uppercase tracking-wider"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-destructive-foreground animate-pulse" />
            Live
          </button>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 z-10 transition-opacity duration-300 ${
          showControls ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Top gradient */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-background/70 to-transparent" />

        {/* Bottom controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background/80 via-background/40 to-transparent pt-16 pb-3 px-3 space-y-2">
          {/* Seek bar (VOD only) */}
          {!isLiveStream && duration > 0 && (
            <div className="flex items-center gap-2 px-1">
              <span className="text-[10px] text-foreground/80 font-mono tabular-nums min-w-[36px]">
                {formatTime(currentTime)}
              </span>
              <div className="flex-1 relative group/seek h-5 flex items-center">
                <input
                  type="range"
                  min={0}
                  max={duration}
                  value={currentTime}
                  onChange={(e) => handleSeek(Number(e.target.value))}
                  className="w-full h-1 group-hover/seek:h-1.5 rounded-full appearance-none cursor-pointer transition-all
                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 
                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md
                    [&::-webkit-slider-thumb]:shadow-primary/30"
                  style={{
                    background: `linear-gradient(to right, hsl(var(--primary)) ${(currentTime / duration) * 100}%, hsl(var(--muted)) ${(currentTime / duration) * 100}%)`
                  }}
                />
              </div>
              <span className="text-[10px] text-foreground/80 font-mono tabular-nums min-w-[36px] text-right">
                {formatTime(duration)}
              </span>
            </div>
          )}

          {/* Control buttons */}
          <div className="flex items-center justify-between gap-1">
            {/* Left controls */}
            <div className="flex items-center gap-1">
              <button onClick={togglePlay} className="p-2 rounded-lg hover:bg-foreground/10 text-foreground transition-colors">
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>

              {/* Volume */}
              <div className="flex items-center gap-1 group/vol">
                <button onClick={toggleMute} className="p-2 rounded-lg hover:bg-foreground/10 text-foreground transition-colors">
                  {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <div className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-300">
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(Number(e.target.value))}
                    className="w-full h-1 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-foreground"
                    style={{
                      background: `linear-gradient(to right, hsl(var(--foreground)) ${(muted ? 0 : volume) * 100}%, hsl(var(--muted)) ${(muted ? 0 : volume) * 100}%)`
                    }}
                  />
                </div>
              </div>

              {/* Live indicator text */}
              {isLiveStream && (
                <button onClick={goLive} className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold text-destructive hover:bg-destructive/10 transition-colors">
                  <Radio className="w-3 h-3" /> LIVE
                </button>
              )}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-1">
              {/* Quality selector */}
              {qualityLevels.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowQualityMenu(!showQualityMenu)}
                    className="p-2 rounded-lg hover:bg-foreground/10 text-foreground transition-colors"
                  >
                    <Settings className="w-5 h-5" />
                  </button>

                  {showQualityMenu && (
                    <div className="absolute bottom-full right-0 mb-2 bg-card/95 backdrop-blur-xl border border-border rounded-lg overflow-hidden shadow-2xl min-w-[140px] z-30">
                      <div className="p-1">
                        <button
                          onClick={() => handleQualityChange(-1)}
                          className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors ${
                            currentQuality === -1
                              ? "bg-primary text-primary-foreground font-bold"
                              : "text-foreground hover:bg-foreground/10"
                          }`}
                        >
                          Auto
                        </button>
                        {qualityLevels
                          .sort((a, b) => b.height - a.height)
                          .map((level) => (
                            <button
                              key={level.index}
                              onClick={() => handleQualityChange(level.index)}
                              className={`w-full text-left px-3 py-2 text-xs rounded-md transition-colors ${
                                currentQuality === level.index
                                  ? "bg-primary text-primary-foreground font-bold"
                                  : "text-foreground hover:bg-foreground/10"
                              }`}
                            >
                              {qualityLabel(level.height)}
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Fill/Contain toggle */}
              <button
                onClick={() => setObjectFit(objectFit === "contain" ? "cover" : "contain")}
                className="p-2 rounded-lg hover:bg-foreground/10 text-foreground transition-colors"
                title={objectFit === "contain" ? "Fill" : "Fit"}
              >
                {objectFit === "contain" ? <Maximize2 className="w-5 h-5" /> : <Minimize2 className="w-5 h-5" />}
              </button>

              {/* Fullscreen */}
              <button onClick={toggleFullscreen} className="p-2 rounded-lg hover:bg-foreground/10 text-foreground transition-colors">
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Click to play/pause center overlay (desktop) */}
      <div
        className="absolute inset-0 z-[5] hidden md:block cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          togglePlay();
          resetControlsTimer();
        }}
      />
    </div>
  );
};

export default Player;
