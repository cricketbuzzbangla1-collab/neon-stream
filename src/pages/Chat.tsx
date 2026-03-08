import PostsSection from "@/components/PostsSection";
import { Users } from "lucide-react";

const Chat = () => {
  return (
    <div className="min-h-screen pb-20 pt-16 flex flex-col">
      <div className="container pt-3 pb-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-display font-bold text-foreground">Community</h1>
        </div>
      </div>
      <div className="container py-4 flex-1 overflow-y-auto">
        <PostsSection />
      </div>
    </div>
  );
};

export default Chat;
