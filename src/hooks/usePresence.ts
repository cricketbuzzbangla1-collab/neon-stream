import { useEffect } from "react";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function usePresence(uid: string | null) {
  useEffect(() => {
    if (!uid) return;

    const ref = doc(db, "onlineUsers", uid);

    const setOnline = () => {
      setDoc(ref, { uid, lastActive: Date.now(), isOnline: true }, { merge: true }).catch(() => {});
    };

    // Set online immediately
    setOnline();

    // Heartbeat every 30s
    const interval = setInterval(setOnline, 30000);

    // On page close, remove doc
    const handleUnload = () => {
      // Use deleteDoc best-effort; navigator.sendBeacon not available for Firestore
      deleteDoc(ref).catch(() => {});
    };

    // Visibility change: set offline when hidden, online when visible
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        setDoc(ref, { isOnline: false, lastActive: Date.now() }, { merge: true }).catch(() => {});
      } else {
        setOnline();
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
      deleteDoc(ref).catch(() => {});
    };
  }, [uid]);
}
