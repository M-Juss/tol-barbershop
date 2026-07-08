"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type EventCallback = () => void;

interface RealtimeContextValue {
  subscribe: (entityType: string, callback: EventCallback) => () => void;
  lastEvent: string | null;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("auth-storage");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const token =
      parsed?.state?.token ??
      parsed?.token ??
      (Array.isArray(parsed) ? parsed.find((p: Record<string, unknown>) => p?.token)?.token : null);
    return typeof token === "string" && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const listenersRef = useRef<Map<string, Set<EventCallback>>>(new Map());
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  const subscribe = useCallback((entityType: string, callback: EventCallback) => {
    if (!listenersRef.current.has(entityType)) {
      listenersRef.current.set(entityType, new Set());
    }
    listenersRef.current.get(entityType)!.add(callback);

    return () => {
      const set = listenersRef.current.get(entityType);
      if (set) {
        set.delete(callback);
        if (set.size === 0) {
          listenersRef.current.delete(entityType);
        }
      }
    };
  }, []);

  const connect = useCallback(() => {
    const token = getAuthToken();
    if (!token) return;

    const url = "/api/v1/events/stream";
    const abortController = new AbortController();

    const entityTypes = [
      "appointments", "barbers", "services", "admins",
      "notifications", "feedback", "closed_dates", "modules", "roles",
    ];

    (async () => {
      try {
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) {
          throw new Error(`SSE connection failed: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() || "";

          for (const part of parts) {
            const eventMatch = part.match(/^event: (.+)$/m);
            if (eventMatch) {
              const type = eventMatch[1];
              if (entityTypes.includes(type)) {
                setLastEvent(type);
                const callbacks = listenersRef.current.get(type);
                if (callbacks) {
                  for (const cb of callbacks) {
                    cb();
                  }
                }
              }
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
      }

      eventSourceRef.current = null;
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    })();

    eventSourceRef.current = { close: () => abortController.abort() } as unknown as EventSource;
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      connect();
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "auth-storage") {
        disconnect();
        connect();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      disconnect();
      window.removeEventListener("storage", handleStorage);
    };
  }, [connect, disconnect]);

  const value = useMemo(() => ({ subscribe, lastEvent }), [subscribe, lastEvent]);

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

export function useRealtimeEvent(entityType: string, callback: EventCallback) {
  const { subscribe } = useRealtime();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    const unsub = subscribe(entityType, () => {
      callbackRef.current();
    });
    return unsub;
  }, [entityType, subscribe]);
}
