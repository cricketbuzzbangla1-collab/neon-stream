import { Tv } from "lucide-react";

const EmptyState = ({ message = "No content available" }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-20 gap-4">
    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
      <Tv className="w-8 h-8 text-muted-foreground" />
    </div>
    <p className="text-muted-foreground text-sm">{message}</p>
  </div>
);

export default EmptyState;
