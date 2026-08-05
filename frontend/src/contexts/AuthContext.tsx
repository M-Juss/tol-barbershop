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
  type AuthUser,
  type LoginResponse,
} from "@/services/shared/auth.api";
import { AUTH_UNAUTHORIZED_EVENT } from "@/lib/api";
import {
  enableBrowserPush,
  getBrowserPushSubscription,
  isBrowserPushEnabledForUser,
  isPushSupported,
  NOTIFICATION_PROMPT_DISMISSED_KEY,
  rememberBrowserPushEnabledForUser,
  unsubscribeBrowserPushLocally,
} from "@/services/shared/push.api";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: { email: string; password: string }) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function setAuthRoleCookie(role: string): void {
  if (typeof document === "undefined") return;
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `auth_role=${encodeURIComponent(role)}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax${secure}`;
}

function clearAuthRoleCookie(): void {
  if (typeof document === "undefined") return;
  document.cookie = "auth_role=; path=/; max-age=0; samesite=lax";
}

function hasAuthRoleCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((cookie) => cookie.trim().startsWith("auth_role="));
}

function redirectFromProtectedRoute(reason: string): void {
  if (
    typeof window !== "undefined" &&
    /^\/(admin|manager|customer)(?:\/|$)/.test(window.location.pathname)
  ) {
    window.location.replace(
      reason === "account_disabled" ? "/login?account_disabled=1" : "/login",
    );
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const handleUnauthorized = (event: Event) => {
      clearAuthRoleCookie();
      setUser(null);

      const code = (event as CustomEvent<{ code?: string | null }>).detail?.code;
      redirectFromProtectedRoute(
        code === "ACCOUNT_DISABLED" ? "account_disabled" : "session_expired",
      );
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () =>
      window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

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
      redirectFromProtectedRoute("session_expired");
    }
  }, []);

  useEffect(() => {
    const restore = async () => {
      setIsLoading(true);
      if (!hasAuthRoleCookie()) {
        setUser(null);
        setIsLoading(false);
        return;
      }
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

    if (
      isBrowserPushEnabledForUser(user.id) &&
      isPushSupported() &&
      Notification.permission === "granted"
    ) {
      await enableBrowserPush().catch(() => false);
    } else {
      localStorage.removeItem(NOTIFICATION_PROMPT_DISMISSED_KEY);
    }

    setUser(user);
    return res;
  };

  const logout = async () => {
    let pushEndpoint: string | undefined;

    try {
      const subscription = await getBrowserPushSubscription();
      pushEndpoint = subscription?.endpoint;

      if (subscription && user) {
        rememberBrowserPushEnabledForUser(user.id);
      }
    } catch {}

    const response = await logoutRequest(pushEndpoint);
    if (!response?.success) {
      throw new Error(response?.message || "Logout failed");
    }

    await unsubscribeBrowserPushLocally().catch(() => {});
    clearAuthRoleCookie();
    setUser(null);
    window.location.replace("/");
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
