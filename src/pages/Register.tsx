// src/pages/Register.tsx
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Phone, Lock, User, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ----------------- Validation -----------------
    if (!name.trim() || !phone.trim() || !password) {
      return toast.error("Fill all fields");
    }
    if (phone.replace(/[^0-9]/g, "").length < 7) {
      return toast.error("Invalid phone number");
    }
    if (password.length < 6) {
      return toast.error("Password must be 6+ characters");
    }

    setLoading(true);

    try {
      // ----------------- Call AuthContext register -----------------
      await register(name.trim(), phone.trim(), password);

      toast.success("Account created!");
      navigate("/"); // Redirect to homepage

    } catch (err: any) {
      console.error("Registration Error:", err);

      if (err?.code === "auth/email-already-in-use") {
        toast.error("Phone number already registered");
      } else {
        toast.error("Registration failed. Try again.");
      }

    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-16 pb-20 flex items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="glass-card neon-border p-8 w-full max-w-sm space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <UserPlus className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-xl font-display font-bold text-foreground">Create Account</h1>
          <p className="text-sm text-muted-foreground">Join AbcTV LIVE</p>
        </div>

        {/* Input Fields */}
        <div className="space-y-4">
          {/* Name */}
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={50}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>

          {/* Phone */}
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="tel"
              placeholder="Phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type={showPass ? "text" : "password"}
              placeholder="Password (6+ chars)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-3 rounded-xl bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all duration-300 glow-primary disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Account"}
        </button>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Register;
