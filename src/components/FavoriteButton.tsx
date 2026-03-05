import { Heart } from "lucide-react";
import { memo } from "react";

interface FavoriteButtonProps {
  isFavorited: boolean;
  onClick: (e: React.MouseEvent) => void;
  size?: "sm" | "md";
}

const FavoriteButton = memo(({ isFavorited, onClick, size = "sm" }: FavoriteButtonProps) => {
  const sizeClass = size === "md" ? "w-5 h-5" : "w-4 h-4";

  return (
    <button
      onClick={onClick}
      className={`p-1.5 rounded-full transition-all duration-300 ${
        isFavorited
          ? "text-destructive bg-destructive/15 shadow-[0_0_10px_hsl(var(--destructive)/0.4)]"
          : "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
      }`}
      aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <Heart
        className={`${sizeClass} transition-transform duration-300 ${
          isFavorited ? "fill-current scale-110" : "scale-100"
        }`}
      />
    </button>
  );
});

FavoriteButton.displayName = "FavoriteButton";
export default FavoriteButton;
