"use client";

import { useEffect, useState } from "react";

function getIsPageVisible(): boolean {
  if (typeof document === "undefined") return true;
  return document.visibilityState === "visible";
}

export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState(getIsPageVisible);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(getIsPageVisible());
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return isVisible;
}
