"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";

type Options = {
  defaultSeconds?: number;
  label?: string;
};

const STORAGE_PREFIX = "action_cooldown:";

export function formatCooldown(seconds: number): string {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  if (minutes <= 0) {
    return `${remainingSeconds}s`;
  }

  return `${minutes}m ${String(remainingSeconds).padStart(2, "0")}s`;
}

export function isRateLimitError(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 429;
}

export function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function useActionCooldown(key: string, options: Options = {}) {
  const storageKey = `${STORAGE_PREFIX}${key}`;
  const defaultSeconds = options.defaultSeconds ?? 180;
  const label = options.label ?? "This action";
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const readRemaining = useCallback(() => {
    if (typeof window === "undefined") return 0;

    const raw = window.localStorage.getItem(storageKey);
    const until = raw ? Number(raw) : 0;
    if (!Number.isFinite(until) || until <= Date.now()) {
      window.localStorage.removeItem(storageKey);
      return 0;
    }

    return Math.ceil((until - Date.now()) / 1000);
  }, [storageKey]);

  useEffect(() => {
    setRemainingSeconds(readRemaining());

    const timer = window.setInterval(() => {
      setRemainingSeconds(readRemaining());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [readRemaining]);

  const start = useCallback(
    (seconds = defaultSeconds, message?: string) => {
      const safeSeconds = Math.max(1, Math.ceil(seconds));
      const until = Date.now() + safeSeconds * 1000;

      window.localStorage.setItem(storageKey, String(until));
      setRemainingSeconds(safeSeconds);
      toast.error(
        message ??
          `${label} is temporarily locked. Try again in ${formatCooldown(safeSeconds)}.`,
      );
    },
    [defaultSeconds, label, storageKey],
  );

  const guard = useCallback(() => {
    const remaining = readRemaining();

    if (remaining > 0) {
      setRemainingSeconds(remaining);
      toast.error(`${label} is locked. Try again in ${formatCooldown(remaining)}.`);
      return true;
    }

    return false;
  }, [label, readRemaining]);

  const handleRateLimit = useCallback(
    (error: unknown) => {
      if (!isRateLimitError(error)) {
        return false;
      }

      const seconds = error.retryAfterSeconds ?? defaultSeconds;
      start(
        seconds,
        `${label} limit reached. Try again in ${formatCooldown(seconds)}.`,
      );
      return true;
    },
    [defaultSeconds, label, start],
  );

  return {
    isCoolingDown: remainingSeconds > 0,
    remainingSeconds,
    cooldownLabel:
      remainingSeconds > 0 ? `Try again in ${formatCooldown(remainingSeconds)}` : "",
    start,
    guard,
    handleRateLimit,
  };
}
