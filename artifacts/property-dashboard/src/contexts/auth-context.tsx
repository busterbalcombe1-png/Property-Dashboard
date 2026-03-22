import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Role = "admin" | "viewer";
type AuthState = { username: string; role: Role } | null;

type AuthContextType = {
  user: AuthState;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isReadOnly: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = "propdash_auth";

const CREDENTIALS: Record<string, { password: string; role: Role }> = {
  admin:           { password: "propdash",    role: "admin" },
  james:           { password: "propdash",    role: "admin" },
  charlesbalcombe: { password: "A7@k3s9gs",   role: "viewer" },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  const login = (username: string, password: string): boolean => {
    const lc = username.trim().toLowerCase();
    const cred = CREDENTIALS[lc];
    if (cred && cred.password === password) {
      setUser({ username: lc, role: cred.role });
      return true;
    }
    return false;
  };

  const logout = () => setUser(null);
  const isReadOnly = user?.role === "viewer";

  return (
    <AuthContext.Provider value={{ user, login, logout, isReadOnly }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
