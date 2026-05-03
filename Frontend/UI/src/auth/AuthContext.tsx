import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import { trackEvent } from "../lib/telemetry";

export type Role = "FacilitiesManager" | "Occupant";

export interface User {
  name: string;
  email: string;
  role: Role;
  avatarInitials: string;
}

interface AuthContextValue {
  user: User | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;
}

const DEMO_USERS: Array<{ email: string; password: string; user: User }> = [
  {
    email: "facilities@greenoffice.io",
    password: "GreenOffice2026",
    user: {
      name: "Alex Chen",
      email: "facilities@greenoffice.io",
      role: "FacilitiesManager",
      avatarInitials: "AC",
    },
  },
  {
    email: "occupant@greenoffice.io",
    password: "Occupant2026",
    user: {
      name: "Sam Taylor",
      email: "occupant@greenoffice.io",
      role: "Occupant",
      avatarInitials: "ST",
    },
  },
];

const STORAGE_KEY = "em_auth_user";

const AuthContext = createContext<AuthContextValue | null>(null);

const loadUser = (): User | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(loadUser);

  const login = useCallback((email: string, password: string): boolean => {
    const match = DEMO_USERS.find(
      (u) =>
        u.email.toLowerCase() === email.toLowerCase() &&
        u.password === password,
    );
    if (match) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(match.user));
      setUser(match.user);
      trackEvent("auth_login_success", { role: match.user.role });
      return true;
    }
    trackEvent("auth_login_failed", { attemptedEmail: email });
    return false;
  }, []);

  const logout = useCallback(() => {
    trackEvent("auth_logout", { role: user?.role });
    sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, [user?.role]);

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
