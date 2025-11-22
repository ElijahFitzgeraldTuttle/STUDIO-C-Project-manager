import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface UserContextType {
  currentUser: string | null;
  setCurrentUser: (user: string) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<string | null>(() => {
    return localStorage.getItem("currentUser");
  });

  const setCurrentUser = (user: string) => {
    localStorage.setItem("currentUser", user);
    setCurrentUserState(user);
  };

  const logout = () => {
    localStorage.removeItem("currentUser");
    setCurrentUserState(null);
  };

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
