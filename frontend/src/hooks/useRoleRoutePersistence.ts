"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

function keyFor(basePath: string): string {
  return `last_route:${basePath}`;
}

export function useRoleRoutePersistence(basePath: "/admin" | "/manager" | "/customer") {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!pathname.startsWith(basePath)) return;
    localStorage.setItem(keyFor(basePath), pathname);
  }, [basePath, pathname]);

  useEffect(() => {
    if (pathname !== basePath) return;

    const savedPath = localStorage.getItem(keyFor(basePath));
    if (!savedPath) return;
    if (savedPath === basePath) return;
    if (!savedPath.startsWith(basePath)) return;

    router.replace(savedPath);
  }, [basePath, pathname, router]);
}

export function getSavedRoleRoute(basePath: "/admin" | "/manager" | "/customer"): string | null {
  const savedPath = localStorage.getItem(keyFor(basePath));
  if (!savedPath || !savedPath.startsWith(basePath)) return null;
  return savedPath;
}
