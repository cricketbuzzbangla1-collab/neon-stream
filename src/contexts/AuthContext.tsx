import { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "@/firebase/config";
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

interface AuthContextType {
  user: any;
  profile: any;
  register: (name: string, phone: string, password: string) => Promise<void>;
  login: (phone: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const docSnap = await doc(db, "users", u.uid).get();
        setProfile(docSnap.data());
      } else {
        setProfile(null);
      }
    });
    return unsubscribe;
  }, []);

  const register = async (name: string, phone: string, password: string) => {
    const email = `${phone}@dummy.com`;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const u = userCredential.user;

    await setDoc(doc(db, "users", u.uid), {
      uid: u.uid,
      name,
      phone,
      role: "user",
      avatar: null,
      isBanned: false,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    });
  };

  const login = async (phone: string, password: string) => {
    const email = `${phone}@dummy.com`;
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
