import { useAuth } from "@/contexts/AuthContext";
import { Lock, LogOut } from "lucide-react";
import AdminDashboard from "@/components/admin/AdminDashboard";

const Admin = () => {
  const { user, profile, isAdmin, logout, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen pt-16 pb-20 flex items-center justify-center">
        <div className="glass-card neon-border p-8 w-full max-w-sm text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-destructive/10 mx-auto flex items-center justify-center">
            <Lock className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">Admin Access Required</h1>
          <p className="text-sm text-muted-foreground">
            {!user ? "Please sign in with an admin account." : "Your account doesn't have admin privileges."}
          </p>
        </div>
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
