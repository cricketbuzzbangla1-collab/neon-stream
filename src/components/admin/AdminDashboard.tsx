import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChannelManager from "./ChannelManager";
import CategoryManager from "./CategoryManager";
import CountryManager from "./CountryManager";
import AdManager from "./AdManager";
import SettingsManager from "./SettingsManager";
import LiveEventManager from "./LiveEventManager";
import PlaylistManager from "./PlaylistManager";
import UserManager from "./UserManager";
import ChatManager from "./ChatManager";
import PostPollManager from "./PostPollManager";
import AppSettingsManager from "./AppSettingsManager";
import SeoSettingsManager from "./SeoSettingsManager";
import ReportManager from "./ReportManager";
import { useOnlineUsers } from "@/hooks/useOnlineUsers";

const AdminDashboard = () => {
  const onlineCount = useOnlineUsers();

  return (
    <div className="space-y-6">
      <div className="glass-card neon-border p-4 flex items-center gap-3 w-fit">
        <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
        <span className="text-sm font-semibold text-foreground">
          Online Users: {onlineCount}
        </span>
      </div>
      <Tabs defaultValue="channels" className="space-y-6">
      <TabsList className="glass-card p-1 flex flex-wrap gap-1 h-auto w-full overflow-x-auto">
        {["channels", "playlist", "live-events", "categories", "countries", "ads", "users", "chat", "posts-polls", "reports", "app-settings", "seo", "settings"].map((t) => (
          <TabsTrigger
            key={t}
            value={t}
            className="capitalize data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-4 py-2 text-sm transition-all duration-300"
          >
            {t.replace("-", " ")}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="channels"><ChannelManager /></TabsContent>
      <TabsContent value="playlist"><PlaylistManager /></TabsContent>
      <TabsContent value="live-events"><LiveEventManager /></TabsContent>
      <TabsContent value="categories"><CategoryManager /></TabsContent>
      <TabsContent value="countries"><CountryManager /></TabsContent>
      <TabsContent value="ads"><AdManager /></TabsContent>
      <TabsContent value="users"><UserManager /></TabsContent>
      <TabsContent value="chat"><ChatManager /></TabsContent>
      <TabsContent value="posts-polls"><PostPollManager /></TabsContent>
      <TabsContent value="reports"><ReportManager /></TabsContent>
      <TabsContent value="app-settings"><AppSettingsManager /></TabsContent>
      <TabsContent value="seo"><SeoSettingsManager /></TabsContent>
      <TabsContent value="settings"><SettingsManager /></TabsContent>
    </Tabs>
    </div>
  );
};

export default AdminDashboard;
