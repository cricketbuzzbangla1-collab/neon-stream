import { useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import PostsSection from "@/components/PostsSection";
import { MessageCircle, FileText } from "lucide-react";

const Chat = () => {
  const [tab, setTab] = useState<"chat" | "posts">("chat");

  return (
    <div className="min-h-screen pb-20 pt-16 flex flex-col">
      {/* Tab switcher */}
      <div className="container pt-3 pb-2">
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          <button
            onClick={() => setTab("chat")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "chat" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <MessageCircle className="w-4 h-4" /> Chat
          </button>
          <button
            onClick={() => setTab("posts")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === "posts" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <FileText className="w-4 h-4" /> Community
          </button>
        </div>
      </div>

      {/* Content */}
      {tab === "chat" ? (
        <div className="flex-1 min-h-0" style={{ height: "calc(100vh - 180px)" }}>
          <ChatPanel />
        </div>
      ) : (
        <div className="container py-4 flex-1 overflow-y-auto">
          <PostsSection />
        </div>
      )}
    </div>
  );
};

export default Chat;
