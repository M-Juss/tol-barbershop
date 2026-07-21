"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { usePageVisibility } from "@/hooks/usePageVisibility";
import { getPollingBackoffMs } from "@/lib/polling";
import {
  getEntityChangeVersions,
  type EntityChangeVersions,
} from "@/services/shared/entity-change.api";

type EntityType = keyof EntityChangeVersions;
type EventCallback = () => void | Promise<void>;
type RealtimeEventCallback = (signal: AbortSignal) => void | Promise<void>;

type RealtimeContextValue = {
  subscribe: (entityType: EntityType, callback: EventCallback) => () => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);
const POLL_INTERVAL_MS = 10_000;
const POLL_JITTER_MS = 1_000;
const FALLBACK_REFRESH_INTERVAL_MS = 5 * 60_000;
const CHANGE_REQUEST_TIMEOUT_MS = 15_000;

function getPollDelay(): number {
  return (
    POLL_INTERVAL_MS +
    Math.floor(Math.random() * (POLL_JITTER_MS * 2 + 1)) -
    POLL_JITTER_MS
  );
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const isPageVisible = usePageVisibility();
  const listenersRef = useRef(
    new Map<EntityType, Set<EventCallback>>(),
  );
  const versionsRef = useRef(
    new Map<EntityType, EntityChangeVersions[EntityType]>(),
  );
  const lastRefreshRef = useRef(new Map<EntityType, number>());
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const consecutiveFailuresRef = useRef(0);
  const backoffUntilRef = useRef(0);

  const notify = useCallback((entityType: EntityType) => {
    const listeners = listenersRef.current.get(entityType);
    if (!listeners) return;

    lastRefreshRef.current.set(entityType, Date.now());
    for (const listener of listeners) {
      try {
        void Promise.resolve(listener()).catch(() => {});
      } catch {}
    }
  }, []);

  const subscribe = useCallback((entityType: EntityType, callback: EventCallback) => {
    let listeners = listenersRef.current.get(entityType);
    if (!listeners) {
      listeners = new Set();
      listenersRef.current.set(entityType, listeners);
    }

    const wasAdded = !listeners.has(callback);
    listeners.add(callback);
    if (wasAdded) {
      setSubscriptionCount((count) => count + 1);
    }

    if (versionsRef.current.has(entityType)) {
      queueMicrotask(() => {
        if (listenersRef.current.get(entityType)?.has(callback)) {
          try {
            void Promise.resolve(callback()).catch(() => {});
          } catch {}
        }
      });
    }

    return () => {
      const currentListeners = listenersRef.current.get(entityType);
      if (!currentListeners?.delete(callback)) return;

      if (currentListeners.size === 0) {
        listenersRef.current.delete(entityType);
      }
      setSubscriptionCount((count) => Math.max(0, count - 1));
    };
  }, []);

  useEffect(() => {
    versionsRef.current.clear();
    lastRefreshRef.current.clear();
    consecutiveFailuresRef.current = 0;
    backoffUntilRef.current = 0;
  }, [user?.id]);

  useEffect(() => {
    if (
      isLoading ||
      !isAuthenticated ||
      !isPageVisible ||
      subscriptionCount === 0
    ) {
      return;
    }

    let stopped = false;
    let inFlight = false;
    let rerunRequested = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    const scheduleNext = (delayMs = getPollDelay()): void => {
      timeoutId = setTimeout(() => {
        void run();
      }, delayMs);
    };

    const run = async (): Promise<void> => {
      if (stopped) return;
      const backoffRemainingMs = backoffUntilRef.current - Date.now();
      if (backoffRemainingMs > 0) {
        if (timeoutId) clearTimeout(timeoutId);
        scheduleNext(backoffRemainingMs);
        return;
      }
      if (inFlight) {
        rerunRequested = true;
        return;
      }

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = undefined;
      }

      inFlight = true;
      let shouldBackoff = false;
      let nextDelayMs = getPollDelay();
      const requestController = new AbortController();
      let didTimeout = false;
      controller = requestController;
      const requestTimeoutId = setTimeout(() => {
        didTimeout = true;
        requestController.abort();
      }, CHANGE_REQUEST_TIMEOUT_MS);

      try {
        const versions = await getEntityChangeVersions(requestController.signal);
        consecutiveFailuresRef.current = 0;
        backoffUntilRef.current = 0;

        for (const entityType of Object.keys(versions) as EntityType[]) {
          if (!listenersRef.current.has(entityType)) continue;

          const nextVersion = versions[entityType];
          const previousVersion = versionsRef.current.get(entityType);
          const lastRefresh = lastRefreshRef.current.get(entityType) ?? 0;
          versionsRef.current.set(entityType, nextVersion);

          if (
            previousVersion === undefined ||
            previousVersion !== nextVersion ||
            Date.now() - lastRefresh >= FALLBACK_REFRESH_INTERVAL_MS
          ) {
            notify(entityType);
          }
        }
      } catch (error) {
        const isAbortError =
          error instanceof DOMException && error.name === "AbortError";
        const isRateLimited = error instanceof ApiError && error.status === 429;

        if (!isAbortError || didTimeout) {
          consecutiveFailuresRef.current++;
          shouldBackoff = true;
          nextDelayMs = getPollingBackoffMs(
            error,
            POLL_INTERVAL_MS,
            consecutiveFailuresRef.current,
          );
          backoffUntilRef.current = Date.now() + nextDelayMs;
        }

        if (!stopped && !isRateLimited && (!isAbortError || didTimeout)) {
          const now = Date.now();
          for (const entityType of listenersRef.current.keys()) {
            const lastRefresh = lastRefreshRef.current.get(entityType) ?? 0;
            if (now - lastRefresh >= FALLBACK_REFRESH_INTERVAL_MS) {
              notify(entityType);
            }
          }
        }
      } finally {
        clearTimeout(requestTimeoutId);
        inFlight = false;
        if (controller === requestController) {
          controller = undefined;
        }

        if (stopped) return;
        if (rerunRequested && !shouldBackoff) {
          rerunRequested = false;
          void run();
        } else {
          rerunRequested = false;
          scheduleNext(nextDelayMs);
        }
      }
    };

    const handleFocus = () => {
      if (document.visibilityState === "visible") {
        void run();
      }
    };

    window.addEventListener("focus", handleFocus);
    void run();

    return () => {
      stopped = true;
      if (timeoutId) clearTimeout(timeoutId);
      controller?.abort();
      window.removeEventListener("focus", handleFocus);
    };
  }, [isAuthenticated, isLoading, isPageVisible, notify, subscriptionCount]);

  const value = useMemo(() => ({ subscribe }), [subscribe]);

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error("useRealtime must be used within RealtimeProvider");
  return ctx;
}

export function useRealtimeEvent(
  entityType: EntityType,
  callback: RealtimeEventCallback,
  enabled = true,
): void {
  const { subscribe } = useRealtime();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    let controller: AbortController | undefined;
    const unsubscribe = subscribe(entityType, () => {
      controller?.abort();
      controller = new AbortController();
      return callbackRef.current(controller.signal);
    });

    return () => {
      controller?.abort();
      unsubscribe();
    };
  }, [enabled, entityType, subscribe]);
}
