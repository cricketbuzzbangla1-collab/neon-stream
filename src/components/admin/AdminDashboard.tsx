import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChannelManager from "./ChannelManager";
import CategoryManager from "./CategoryManager";
import CountryManager from "./CountryManager";
import AdManager from "./AdManager";
import SettingsManager from "./SettingsManager";
import LiveEventManager from "./LiveEventManager";
import PlaylistManager from "./PlaylistManager";

const AdminDashboard = () => {
  return (
    <Tabs defaultValue="channels" className="space-y-6">
      <TabsList className="glass-card p-1 flex flex-wrap gap-1 h-auto w-full overflow-x-auto">
        {["channels", "playlist", "live-events", "categories", "countries", "ads", "settings"].map((t) => (
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
      <TabsContent value="settings"><SettingsManager /></TabsContent>
    </Tabs>
  );
};

export default AdminDashboard;
