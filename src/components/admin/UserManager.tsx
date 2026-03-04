import { useState, useEffect } from "react";
import { collection, onSnapshot, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Search, Ban, Shield, Trash2, UserCheck, Users, Award, Star } from "lucide-react";
import { toast } from "sonner";
import { BadgeType, BADGE_CONFIG } from "@/lib/badges";

interface UserData {
  uid: string;
  name: string;
  phone: string;
  role: "user" | "admin" | "moderator";
  badges?: string[];
  isBanned: boolean;
  createdAt: number;
  lastLogin: number;
}

const ALL_BADGES: BadgeType[] = ["admin", "moderator", "verified", "new-member"];

const UserManager = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [badgeEditUser, setBadgeEditUser] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserData)));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  );

  const toggleBan = async (u: UserData) => {
    await updateDoc(doc(db, "users", u.uid), { isBanned: !u.isBanned });
    toast.success(u.isBanned ? `${u.name} unbanned` : `${u.name} banned`);
  };

  const setRole = async (u: UserData, role: string) => {
    await updateDoc(doc(db, "users", u.uid), { role });
    toast.success(`${u.name} role → ${role}`);
  };

  const toggleBadge = async (u: UserData, badge: BadgeType) => {
    const current = u.badges || [];
    const newBadges = current.includes(badge)
      ? current.filter(b => b !== badge)
      : [...current, badge];
    await updateDoc(doc(db, "users", u.uid), { badges: newBadges });
    toast.success("Badges updated");
  };

  const deleteUser = async (u: UserData) => {
    if (!confirm(`Delete ${u.name}?`)) return;
    await deleteDoc(doc(db, "users", u.uid));
    toast.success("User deleted from database");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-display font-bold text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> Users ({users.length})
        </h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="pl-9 pr-4 py-2 rounded-lg bg-secondary border border-border text-foreground text-sm w-56 focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-14 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filtered.map((u) => (
            <div key={u.uid} className="glass-card p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-foreground truncate">{u.name}</span>
                    {u.role === "admin" && (
                      <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full font-bold">ADMIN</span>
                    )}
                    {u.role === "moderator" && (
                      <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">MOD</span>
                    )}
                    {u.isBanned && (
                      <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full font-bold">BANNED</span>
                    )}
                    {/* Show current badges */}
                    {(u.badges || []).map(b => {
                      const cfg = BADGE_CONFIG[b as BadgeType];
                      return cfg ? (
                        <span key={b} className={`text-[9px] px-1 py-0 rounded-full ${cfg.color}`}>
                          {cfg.emoji}{cfg.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground">{u.phone}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setBadgeEditUser(badgeEditUser === u.uid ? null : u.uid)} title="Badges" className="p-2 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
                    <Award className="w-4 h-4" />
                  </button>
                  <button onClick={() => toggleBan(u)} title={u.isBanned ? "Unban" : "Ban"} className={`p-2 rounded-lg transition-colors ${u.isBanned ? "bg-primary/10 text-primary hover:bg-primary/20" : "bg-destructive/10 text-destructive hover:bg-destructive/20"}`}>
                    {u.isBanned ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                  </button>
                  <select
                    value={u.role}
                    onChange={(e) => setRole(u, e.target.value)}
                    className="px-2 py-1 rounded-lg bg-secondary border border-border text-foreground text-xs"
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button onClick={() => deleteUser(u)} title="Delete" className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Badge editor */}
              {badgeEditUser === u.uid && (
                <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/30">
                  {ALL_BADGES.map(badge => {
                    const cfg = BADGE_CONFIG[badge];
                    const has = (u.badges || []).includes(badge);
                    return (
                      <button
                        key={badge}
                        onClick={() => toggleBadge(u, badge)}
                        className={`text-[10px] px-2 py-1 rounded-full font-medium transition-all ${
                          has ? `${cfg.color} ring-1 ring-primary` : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {cfg.emoji} {cfg.label} {has ? "✓" : "+"}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserManager;
