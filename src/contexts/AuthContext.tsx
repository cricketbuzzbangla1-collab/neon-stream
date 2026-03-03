import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User 
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export interface UserProfile {
  uid: string;
  name: string;
  phone: string;
  role: "user" | "admin";
  avatar?: string;
  isBanned: boolean;
  createdAt: any;
  lastLogin: any;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  register: (name: string, phone: string, password: string) => Promise<void>;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isBanned: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  register: async () => {},
  login: async () => {},
  logout: async () => {},
  isAdmin: false,
  isBanned: false,
});

export const useAuth = () => useContext(AuthContext);

// Convert phone to email for Firebase Auth (phone+password not natively supported)
const phoneToEmail = (phone: string) => `${phone.replace(/[^0-9]/g, "")}@abctv.app`;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid: string) => {
    try {
      const snap = await getDoc(doc(db, "users", uid));
      if (snap.exists()) {
        const data = { uid, ...snap.data() } as UserProfile;
        setProfile(data);
        return data;
      }
    } catch (e) {
      console.error("Error fetching profile:", e);
    }
    return null;
  }, []);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        await fetchProfile(u.uid);
        // Update last login
        try {
          await updateDoc(doc(db, "users", u.uid), { lastLogin: Date.now() });
        } catch {}
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [fetchProfile]);

  const register = async (name: string, phone: string, password: string) => {
    const email = phoneToEmail(phone);
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    const userProfile: Omit<UserProfile, "uid"> = {
      name,
      phone,
      role: "user",
      isBanned: false,
      createdAt: Date.now(),
      lastLogin: Date.now(),
    };
    await setDoc(doc(db, "users", cred.user.uid), userProfile);
    setProfile({ uid: cred.user.uid, ...userProfile });
  };

  const login = async (phone: string, password: string) => {
    const email = phoneToEmail(phone);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      register,
      login,
      logout,
      isAdmin: profile?.role === "admin",
      isBanned: profile?.isBanned || false,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
