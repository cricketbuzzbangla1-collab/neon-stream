import React, { createContext, useContext, useState } from "react";

interface AdminContextType {
  isAdmin: boolean;
  login: (code: string) => boolean;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType>({
  isAdmin: false,
  login: () => false,
  logout: () => {},
});

export const useAdmin = () => useContext(AdminContext);

const ADMIN_CODE = "258000";

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(() => {
    return sessionStorage.getItem("ott-admin") === "true";
  });

  const login = (code: string) => {
    if (code === ADMIN_CODE) {
      setIsAdmin(true);
      sessionStorage.setItem("ott-admin", "true");
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAdmin(false);
    sessionStorage.removeItem("ott-admin");
  };

  return (
    <AdminContext.Provider value={{ isAdmin, login, logout }}>
      {children}
    </AdminContext.Provider>
  );
};
