"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { type ReactNode, useEffect } from "react";

const roleBasePath: Record<string, string> = {
  admin: "/admin",
  manager: "/manager",
  customer: "/customer",
};

export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      const path = roleBasePath[user.role] || "/";
      router.replace(path);
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
