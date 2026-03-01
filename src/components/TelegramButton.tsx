import { MessageCircle } from "lucide-react";
import { useSettings } from "@/hooks/useFirestore";

const TelegramButton = () => {
  const { settings } = useSettings();
  if (!settings?.telegramUrl) return null;

  return (
    <a
      href={settings.telegramUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-20 right-4 md:bottom-6 z-40 w-12 h-12 rounded-full bg-primary flex items-center justify-center glow-primary animate-float transition-transform duration-300 hover:scale-110"
    >
      <MessageCircle className="w-6 h-6 text-primary-foreground" />
    </a>
  );
};

export default TelegramButton;
