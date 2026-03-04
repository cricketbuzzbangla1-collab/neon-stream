import { useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { addDocument } from "@/hooks/useFirestore";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const REASONS = [
  "Stream Not Loading",
  "Buffering Too Much",
  "Audio Problem",
  "Wrong Channel",
  "Other",
];

interface Props {
  channelId: string;
  channelName: string;
  streamUrl: string;
  open: boolean;
  onClose: () => void;
}

const ReportChannelModal = ({ channelId, channelName, streamUrl, open, onClose }: Props) => {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm" onClick={onClose}>
        <div className="glass-card neon-border p-6 max-w-sm w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-foreground">Report Channel</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
          </div>
          <p className="text-sm text-muted-foreground">You need to be logged in to report a channel.</p>
          <Link to="/login" className="block w-full text-center py-2.5 rounded-xl bg-primary text-primary-foreground font-medium">Login</Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!reason) { toast.error("Select a reason"); return; }
    setSubmitting(true);
    try {
      // Check duplicate
      const q = query(collection(db, "channelReports"), where("channelId", "==", channelId), where("reportedBy", "==", user.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        toast.error("You already reported this channel.");
        setSubmitting(false);
        return;
      }

      await addDocument("channelReports", {
        channelId,
        channelName,
        streamUrl,
        reportedBy: user.uid,
        reason,
        message: message || null,
        status: "pending",
      });
      toast.success("Report submitted. Thank you!");
      onClose();
    } catch {
      toast.error("Failed to submit report");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card neon-border p-6 max-w-sm w-full mx-4 space-y-4 animate-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h3 className="font-display font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" /> Report Channel
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        <p className="text-xs text-muted-foreground">Report: <span className="text-foreground font-medium">{channelName}</span></p>

        <div className="space-y-2">
          {REASONS.map(r => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all border ${
                reason === r
                  ? "bg-primary/15 border-primary/40 text-primary font-medium"
                  : "bg-secondary border-border/50 text-foreground hover:border-border"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Additional details (optional)"
          className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground text-sm resize-none h-20"
        />

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-2.5 rounded-xl bg-destructive text-destructive-foreground font-medium hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
          Submit Report
        </button>
      </div>
    </div>
  );
};

export default ReportChannelModal;
