// Badge system utilities
export type BadgeType = "admin" | "moderator" | "verified" | "new-member";

export interface BadgeInfo {
  type: BadgeType;
  label: string;
  emoji: string;
  color: string; // semantic tailwind class
}

export const BADGE_CONFIG: Record<BadgeType, BadgeInfo> = {
  admin: { type: "admin", label: "Admin", emoji: "👑", color: "bg-destructive/20 text-destructive" },
  moderator: { type: "moderator", label: "Mod", emoji: "🛡️", color: "bg-primary/20 text-primary" },
  verified: { type: "verified", label: "Verified", emoji: "✅", color: "bg-accent/20 text-accent" },
  "new-member": { type: "new-member", label: "New", emoji: "🆕", color: "bg-muted text-muted-foreground" },
};

export function getAutoBadges(profile: any): BadgeType[] {
  if (!profile) return [];
  const badges: BadgeType[] = [];

  if (profile.role === "admin") badges.push("admin");
  else if (profile.role === "moderator") badges.push("moderator");

  if (profile.badges?.includes("verified")) badges.push("verified");

  // Auto-assign "new-member" if joined within 7 days
  const createdAt = profile.createdAt?.seconds
    ? profile.createdAt.seconds * 1000
    : profile.createdAt || 0;
  if (createdAt && Date.now() - createdAt < 7 * 24 * 60 * 60 * 1000) {
    badges.push("new-member");
  }

  // Include any manually assigned badges from profile
  if (Array.isArray(profile.badges)) {
    profile.badges.forEach((b: string) => {
      if (b in BADGE_CONFIG && !badges.includes(b as BadgeType)) {
        badges.push(b as BadgeType);
      }
    });
  }

  return badges;
}
