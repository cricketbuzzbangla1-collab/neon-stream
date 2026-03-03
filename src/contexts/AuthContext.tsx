import { createContext, useContext, ReactNode } from "react";
import { auth, db } from "@/firebase/config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

type AuthContextType = {
  register: (name: string, phone: string, password: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {

  const register = async (name: string, phone: string, password: string) => {
    try {
      const email = `${phone}@dummy.com`; // dummy email for phone auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Firestore write
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name,
        phone,
        role: "user",
        avatar: null,
        isBanned: false,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      });

    } catch (err) {
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
