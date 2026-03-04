import { useState } from "react";
import { X, MessageCircle } from "lucide-react";
import ChatPanel from "@/components/ChatPanel";

interface ChatDrawerProps {
  open: boolean;
  onClose: () => void;
  channelId?: string;
  channelName?: string;
}

const ChatDrawer = ({ open, onClose, channelId, channelName }: ChatDrawerProps) => {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] bg-background/60 backdrop-blur-sm" onClick={onClose} />
      {/* Drawer */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] glass-card border-t border-border/50 rounded-t-2xl flex flex-col animate-slide-up"
        style={{ height: "70vh", maxHeight: "600px" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 shrink-0">
          <h3 className="font-display font-bold text-foreground flex items-center gap-2 text-sm">
            <MessageCircle className="w-4 h-4 text-primary" />
            {channelName ? `${channelName} Chat` : "Global Chat"}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 min-h-0">
          <ChatPanel channelId={channelId} channelName={channelName} />
        </div>
      </div>
    </>
  );
};

export default ChatDrawer;
