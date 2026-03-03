import { useState, useEffect } from "react";
import { collection, onSnapshot, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Search, Ban, Shield, Trash2, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";

interface UserData {
  uid: string;
  name: string;
  phone: string;
  role: "user" | "admin";
  isBanned: boolean;
  createdAt: number;
  lastLogin: number;
}

const UserManager = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

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

  const promoteAdmin = async (u: UserData) => {
    await updateDoc(doc(db, "users", u.uid), { role: u.role === "admin" ? "user" : "admin" });
    toast.success(`${u.name} role updated`);
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
            <div key={u.uid} className="glass-card p-3 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground truncate">{u.name}</span>
                  {u.role === "admin" && (
                    <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">ADMIN</span>
                  )}
                  {u.isBanned && (
                    <span className="text-[10px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full font-bold">BANNED</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{u.phone}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => toggleBan(u)} title={u.isBanned ? "Unban" : "Ban"} className={`p-2 rounded-lg transition-colors ${u.isBanned ? "bg-neon-green/10 text-neon-green hover:bg-neon-green/20" : "bg-destructive/10 text-destructive hover:bg-destructive/20"}`}>
                  {u.isBanned ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                </button>
                <button onClick={() => promoteAdmin(u)} title="Toggle admin" className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                  <Shield className="w-4 h-4" />
                </button>
                <button onClick={() => deleteUser(u)} title="Delete" className="p-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserManager;
