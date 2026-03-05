import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Play, Smartphone } from "lucide-react";
import { toast } from "sonner";

interface ExternalPlayerDialogProps {
  open: boolean;
  onClose: () => void;
  streamUrl: string;
  channelName: string;
}

const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(
  navigator.userAgent
);
const isAndroid = /Android/i.test(navigator.userAgent);

const ExternalPlayerDialog = ({
  open,
  onClose,
  streamUrl,
  channelName,
}: ExternalPlayerDialogProps) => {
  const [launched, setLaunched] = useState(false);

  const openMxPlayer = () => {
    if (isAndroid) {
      window.location.href = `intent:${streamUrl}#Intent;package=com.mxtech.videoplayer.ad;type=video/*;end`;
    } else {
      window.open(streamUrl, "_blank");
    }
    setLaunched(true);
    toast.success("Opening in MX Player...");
  };

  const openVlcPlayer = () => {
    if (isAndroid) {
      window.location.href = `intent:${streamUrl}#Intent;package=org.videolan.vlc;type=video/*;end`;
    } else {
      window.location.href = `vlc://${streamUrl}`;
    }
    setLaunched(true);
    toast.success("Opening in VLC Player...");
  };

  const openSystemPlayer = () => {
    if (isAndroid) {
      window.location.href = `intent:${streamUrl}#Intent;type=video/*;end`;
    } else {
      window.open(streamUrl, "_blank");
    }
    setLaunched(true);
    toast.success("Opening in system player...");
  };

  const openInNewTab = () => {
    window.open(streamUrl, "_blank");
    setLaunched(true);
    toast.success("Opening stream in new tab...");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            External Player Required
          </DialogTitle>
          <DialogDescription>
            This stream requires an external player for playback.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          <p className="text-sm font-medium text-foreground mb-3">
            {channelName}
          </p>

          {isMobile ? (
            <>
              <Button
                onClick={openMxPlayer}
                className="w-full justify-start gap-3"
                variant="outline"
              >
                <Play className="w-4 h-4 text-primary" />
                Play in MX Player
              </Button>
              <Button
                onClick={openVlcPlayer}
                className="w-full justify-start gap-3"
                variant="outline"
              >
                <Play className="w-4 h-4 text-primary" />
                Play in VLC Player
              </Button>
              <Button
                onClick={openSystemPlayer}
                className="w-full justify-start gap-3"
                variant="outline"
              >
                <Play className="w-4 h-4 text-primary" />
                Play in System Player
              </Button>
            </>
          ) : (
            <Button
              onClick={openInNewTab}
              className="w-full justify-start gap-3"
              variant="outline"
            >
              <ExternalLink className="w-4 h-4 text-primary" />
              Open Stream in New Tab
            </Button>
          )}

          {launched && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              If no app launched, please install VLC or MX Player from your app
              store.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExternalPlayerDialog;
