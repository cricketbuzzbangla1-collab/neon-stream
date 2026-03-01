import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Channel } from "@/hooks/useFirestore";
import { Volume2, VolumeX, Maximize, AlertTriangle, Loader2 } from "lucide-react";

interface PlayerProps {
  channel: Channel;
}

const Player = ({ channel }: PlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [muted, setMuted] = useState(false);
  const [currentMode, setCurrentMode] = useState(channel.playerType || "hls");

  useEffect(() => {
    setError(false);
    setBuffering(true);
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
          ...(currentMode === "hls-retry" ? {
            fragLoadingMaxRetry: 10,
            manifestLoadingMaxRetry: 10,
            levelLoadingMaxRetry: 10,
          } : {}),
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
          setBuffering(false);
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

    video.addEventListener("waiting", () => setBuffering(true));
    video.addEventListener("playing", () => setBuffering(false));

    return () => { destroyHls(); };
  }, [channel.streamUrl, currentMode]);

  const destroyHls = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  };

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
    <div ref={containerRef} className="relative w-full aspect-video bg-background rounded-xl overflow-hidden group">
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        muted={muted}
        autoPlay
      />

      {buffering && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 gap-3">
          <AlertTriangle className="w-10 h-10 text-destructive" />
          <p className="text-sm text-muted-foreground">Stream unavailable</p>
        </div>
      )}

      {/* Controls overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-between">
        <button onClick={() => setMuted(!muted)} className="p-2 rounded-lg hover:bg-secondary/50 text-foreground">
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <span className="text-xs text-muted-foreground uppercase">{currentMode}</span>
        <button onClick={toggleFullscreen} className="p-2 rounded-lg hover:bg-secondary/50 text-foreground">
          <Maximize className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Player;
