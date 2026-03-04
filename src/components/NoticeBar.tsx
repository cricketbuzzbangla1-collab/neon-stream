import { useState, useEffect } from "react";
import { useSettings } from "@/hooks/useFirestore";
import { X } from "lucide-react";

const typeConfig = {
  info: {
    bg: "from-[hsl(210,80%,15%)] to-[hsl(210,60%,10%)]",
    border: "border-[hsl(190,100%,50%)]",
    glow: "shadow-[0_0_15px_hsl(190,100%,50%,0.2)]",
    icon: "ℹ️",
  },
  warning: {
    bg: "from-[hsl(30,80%,15%)] to-[hsl(30,60%,10%)]",
    border: "border-[hsl(30,100%,50%)]",
    glow: "shadow-[0_0_15px_hsl(30,100%,50%,0.2)]",
    icon: "⚠️",
  },
  success: {
    bg: "from-[hsl(150,80%,12%)] to-[hsl(150,60%,8%)]",
    border: "border-[hsl(150,100%,50%)]",
    glow: "shadow-[0_0_15px_hsl(150,100%,50%,0.2)]",
    icon: "✅",
  },
};

const NoticeBar = () => {
  const { settings } = useSettings();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  const noticeEnabled = (settings as any)?.noticeEnabled !== false;
  const notice = settings?.notice;
  const noticeType = ((settings as any)?.noticeType || "info") as keyof typeof typeConfig;
  const noticeLink = (settings as any)?.noticeLink || null;

  useEffect(() => {
    if (notice && noticeEnabled) {
      const key = `notice-dismissed-${notice}`;
      if (localStorage.getItem(key)) {
        setDismissed(true);
      } else {
        setDismissed(false);
        setTimeout(() => setVisible(true), 100);
      }
    }
  }, [notice, noticeEnabled]);

  if (!notice || !noticeEnabled || dismissed) return null;

  const config = typeConfig[noticeType] || typeConfig.info;

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setVisible(false);
    setTimeout(() => {
      setDismissed(true);
      localStorage.setItem(`notice-dismissed-${notice}`, "1");
    }, 300);
  };

  const content = (
    <div
      className={`w-full overflow-hidden bg-gradient-to-r ${config.bg} border-b ${config.border} ${config.glow} rounded-b-xl transition-all duration-300 ${
        visible ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
      }`}
    >
      <div className="flex items-center px-4 py-2.5 gap-3">
        <span className="text-base shrink-0">{config.icon}</span>
        <div className="flex-1 overflow-hidden">
          <div className="animate-scroll-left whitespace-nowrap text-sm font-medium text-foreground">
            {notice}
          </div>
        </div>
        <button onClick={handleDismiss} className="shrink-0 p-1 rounded-full hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  if (noticeLink) {
    return (
      <a href={noticeLink} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }

  return content;
};

export default NoticeBar;
