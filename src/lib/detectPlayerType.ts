/**
 * Auto-detect the optimal player type based on stream URL.
 *
 * Rules:
 *  - http://  → external (mixed-content, needs native player)
 *  - .mpd     → dash (Shaka Player)
 *  - https:// → hls (HLS.js internal player, default for HTTPS)
 */
export function detectPlayerType(url: string): "hls" | "dash" | "external" | "native" | "iframe" | "hls-retry" {
  if (!url) return "hls";

  const trimmed = url.trim().toLowerCase();

  // HTTP streams must use external player (mixed-content blocked in browsers)
  if (trimmed.startsWith("http://")) return "external";

  // DASH streams
  if (trimmed.endsWith(".mpd") || trimmed.includes(".mpd?")) return "dash";

  // Default: HTTPS streams play internally via HLS.js
  return "hls";
}
