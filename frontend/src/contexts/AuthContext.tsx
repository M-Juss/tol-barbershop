"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  loginRequest,
  logoutRequest,
  getCurrentUserRequest,
} from "@/services/auth.api";

interface User {
  id: number;
  fullname: string;
  email: string;
  contact_number: string;
  role: string;
  image?: string | null;
  created_at?: string;
  permissions?: string[] | null;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: { email: string; password: string }) => Promise<any>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function setAuthRoleCookie(role: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `auth_role=${encodeURIComponent(role)}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
}

function clearAuthRoleCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = "auth_role=; path=/; max-age=0; samesite=lax";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await getCurrentUserRequest();
      if (res.success) {
        setAuthRoleCookie(res.data.role);
        setUser(res.data);
      } else {
        clearAuthRoleCookie();
        setUser(null);
      }
    } catch {
      clearAuthRoleCookie();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const restore = async () => {
      setIsLoading(true);
      await refreshUser();
      setIsLoading(false);
    };
    restore();
  }, [refreshUser]);

  const login = async (data: { email: string; password: string }) => {
    const res = await loginRequest(data);
    if (!res.success) {
      throw new Error(res.message || "Login failed");
    }
    const user = res.data.user;
    setAuthRoleCookie(user.role);
    setUser(user);
    return res;
  };

  const logout = async () => {
    try {
      await logoutRequest();
    } catch {
    } finally {
      clearAuthRoleCookie();
      setUser(null);
      window.location.href = "/login";
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
