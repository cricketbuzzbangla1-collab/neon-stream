import { useSettings } from "@/hooks/useFirestore";

const NoticeBar = () => {
  const { settings } = useSettings();
  if (!settings?.notice) return null;

  return (
    <div className="w-full overflow-hidden bg-primary/10 border-y border-primary/20 py-2">
      <div className="animate-scroll-left whitespace-nowrap text-sm font-medium text-primary">
        📢 {settings.notice}
      </div>
    </div>
  );
};

export default NoticeBar;
