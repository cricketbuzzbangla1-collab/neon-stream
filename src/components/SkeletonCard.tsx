const SkeletonCard = () => (
  <div className="glass-card overflow-hidden">
    <div className="aspect-video skeleton-shimmer" />
    <div className="p-3 space-y-2">
      <div className="h-4 w-3/4 rounded skeleton-shimmer" />
    </div>
  </div>
);

export default SkeletonCard;
