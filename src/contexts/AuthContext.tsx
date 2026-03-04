import { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

interface AuthContextType {
  user: any;
  profile: any;
  isAdmin: boolean;
  isModerator: boolean;
  isBanned: boolean;
  loading: boolean;
  register: (name: string, phone: string, password: string) => Promise<void>;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const docSnap = await getDoc(doc(db, "users", u.uid));
          if (docSnap.exists()) {
            setProfile({ id: docSnap.id, ...docSnap.data() });
            // Update lastLogin
            setDoc(doc(db, "users", u.uid), { lastLogin: serverTimestamp() }, { merge: true }).catch(() => {});
          } else {
            setProfile(null);
          }
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const isAdmin = profile?.role === "admin";
  const isModerator = profile?.role === "moderator";
  const isBanned = profile?.isBanned === true;

  const register = async (name: string, phone: string, password: string) => {
    const email = `${phone}@abctv.app`;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const u = userCredential.user;

    await setDoc(doc(db, "users", u.uid), {
      uid: u.uid,
      name,
      phone,
      role: "user",
      avatar: null,
      badges: [],
      isBanned: false,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    });
  };

  const login = async (phone: string, password: string) => {
    const email = `${phone}@abctv.app`;
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, isModerator, isBanned, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
