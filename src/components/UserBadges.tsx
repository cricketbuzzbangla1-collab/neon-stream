import { BadgeType, BADGE_CONFIG } from "@/lib/badges";

interface Props {
  badges: BadgeType[];
  size?: "sm" | "md";
}

const UserBadges = ({ badges, size = "sm" }: Props) => {
  if (!badges || badges.length === 0) return null;
  
  return (
    <span className="inline-flex items-center gap-0.5 flex-shrink-0">
      {badges.map((b) => {
        const config = BADGE_CONFIG[b];
        if (!config) return null;
        return (
          <span
            key={b}
            title={config.label}
            className={`inline-flex items-center gap-0.5 rounded-full font-bold ${config.color} ${
              size === "sm" ? "text-[9px] px-1 py-0" : "text-[10px] px-1.5 py-0.5"
            }`}
          >
            <span>{config.emoji}</span>
            {size === "md" && <span>{config.label}</span>}
          </span>
        );
      })}
    </span>
  );
};

export default UserBadges;
