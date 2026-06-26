"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

interface RateLimitOptions {
  maxAttempts?: number;
  cooldownMinutes?: number;
  storageKey?: string;
}

interface RateLimitState {
  canAttempt: boolean;
  remainingAttempts: number;
  cooldownRemaining: number;
  isCooldown: boolean;
}

/**
 * Custom hook for rate limiting button clicks
 * Prevents spamming of crucial actions with cooldown period
 */
export function useRateLimit(options: RateLimitOptions = {}) {
  const {
    maxAttempts = 5,
    cooldownMinutes = 5,
    storageKey = "rate_limit_default",
  } = options;

  const [state, setState] = useState<RateLimitState>({
    canAttempt: true,
    remainingAttempts: maxAttempts,
    cooldownRemaining: 0,
    isCooldown: false,
  });

  const resetRateLimit = useCallback(() => {
    localStorage.removeItem(storageKey);
    setState({
      canAttempt: true,
      remainingAttempts: maxAttempts,
      cooldownRemaining: 0,
      isCooldown: false,
    });
  }, [storageKey, maxAttempts]);

  // Load state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const now = Date.now();

        // Check if cooldown has expired
        if (data.cooldownEnd && now < data.cooldownEnd) {
          const remaining = Math.ceil((data.cooldownEnd - now) / 1000);

          // Use requestAnimationFrame to defer setState
          requestAnimationFrame(() => {
            setState({
              canAttempt: false,
              remainingAttempts: 0,
              cooldownRemaining: remaining,
              isCooldown: true,
            });
          });

          // Start countdown timer
          const interval = setInterval(() => {
            const currentRemaining = Math.ceil(
              (data.cooldownEnd - Date.now()) / 1000,
            );
            if (currentRemaining <= 0) {
              clearInterval(interval);
              resetRateLimit();
            } else {
              setState((prev) => ({
                ...prev,
                cooldownRemaining: currentRemaining,
              }));
            }
          }, 1000);

          return () => clearInterval(interval);
        } else {
          // Cooldown expired, reset
          localStorage.removeItem(storageKey);
        }
      } catch (error) {
        console.error("Failed to parse rate limit data:", error);
        localStorage.removeItem(storageKey);
      }
    }
  }, [storageKey, resetRateLimit]);

  const attempt = useCallback((): boolean => {
    if (!state.canAttempt || state.isCooldown) {
      if (state.isCooldown) {
        const minutes = Math.ceil(state.cooldownRemaining / 60);
        toast.error(
          `Too many attempts. Please wait ${minutes} minute${minutes !== 1 ? "s" : ""} before trying again.`,
        );
      }
      return false;
    }

    const stored = localStorage.getItem(storageKey);
    let attempts = 1;
    let firstAttemptTime = Date.now();

    if (stored) {
      try {
        const data = JSON.parse(stored);
        attempts = data.attempts + 1;
        firstAttemptTime = data.firstAttemptTime;
      } catch (error) {
        console.error("Failed to parse rate limit data:", error);
      }
    }

    // Check if max attempts reached
    if (attempts >= maxAttempts) {
      const cooldownEnd = Date.now() + cooldownMinutes * 60 * 1000;
      const cooldownData = {
        attempts,
        firstAttemptTime,
        cooldownEnd,
      };

      localStorage.setItem(storageKey, JSON.stringify(cooldownData));

      setState({
        canAttempt: false,
        remainingAttempts: 0,
        cooldownRemaining: cooldownMinutes * 60,
        isCooldown: true,
      });

      toast.error(
        `Too many attempts. Please wait ${cooldownMinutes} minute${cooldownMinutes !== 1 ? "s" : ""} before trying again.`,
      );

      // Start countdown timer
      const interval = setInterval(() => {
        const currentRemaining = Math.ceil((cooldownEnd - Date.now()) / 1000);
        if (currentRemaining <= 0) {
          clearInterval(interval);
          resetRateLimit();
        } else {
          setState((prev) => ({
            ...prev,
            cooldownRemaining: currentRemaining,
          }));
        }
      }, 1000);

      return false;
    }

    // Update attempts
    const newData = {
      attempts,
      firstAttemptTime,
    };
    localStorage.setItem(storageKey, JSON.stringify(newData));

    setState((prev) => ({
      ...prev,
      remainingAttempts: maxAttempts - attempts,
    }));

    return true;
  }, [state, storageKey, maxAttempts, cooldownMinutes, resetRateLimit]);

  const formatCooldownTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }, []);

  return {
    ...state,
    attempt,
    reset: resetRateLimit,
    formatCooldownTime,
  };
}
