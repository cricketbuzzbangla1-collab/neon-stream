import { Link } from "react-router-dom";
import { Channel } from "@/hooks/useFirestore";

const ChannelCard = ({ channel }: { channel: Channel }) => {
  return (
    <Link
      to={`/watch/${channel.id}`}
      className="group glass-card overflow-hidden hover:neon-border transition-all duration-300 hover:scale-105"
    >
      <div className="relative aspect-video bg-secondary overflow-hidden">
        {channel.logo ? (
          <img
            src={channel.logo}
            alt={channel.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl font-display font-bold text-muted-foreground">
              {channel.name?.charAt(0)}
            </span>
          </div>
        )}
        {channel.isLive && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-live-badge text-foreground live-pulse">
            LIVE
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-semibold text-foreground truncate">{channel.name}</h3>
      </div>
    </Link>
  );
};

export default ChannelCard;
