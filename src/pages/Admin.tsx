import { useState } from "react";
import { useAdmin } from "@/contexts/AdminContext";
import { Lock, LogOut } from "lucide-react";
import AdminDashboard from "@/components/admin/AdminDashboard";

const Admin = () => {
  const { isAdmin, login, logout } = useAdmin();
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!login(code)) {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <form onSubmit={handleLogin} className="glass-card neon-border p-8 w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-xl font-display font-bold text-foreground">Admin Access</h1>
          </div>
          <input
            type="password"
            placeholder="Enter access code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={`w-full px-4 py-3 rounded-xl bg-secondary border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-300 ${
              error ? "border-destructive ring-destructive/50" : "border-border focus:ring-primary/50"
            }`}
            maxLength={10}
          />
          {error && <p className="text-xs text-destructive text-center">Invalid access code</p>}
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all duration-300 glow-primary"
          >
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-16 pb-20">
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-bold text-foreground">Admin Panel</h1>
          <button onClick={logout} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all duration-300">
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
        <AdminDashboard />
      </div>
    </div>
  );
};

export default Admin;
