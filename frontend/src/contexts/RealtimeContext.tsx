"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

type EventCallback = () => void;

type RealtimeContextValue = {
  subscribe: (entityType: string, callback: EventCallback) => () => void;
  lastEvent: string | null;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const subscribe = useCallback(() => {
    return () => {};
  }, []);

  const value = useMemo(
    () => ({ subscribe, lastEvent: null }),
    [subscribe],
  );

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

export function useRealtimeEvent(_entityType: string, _callback: EventCallback): void {
  void _entityType;
  void _callback;
  useRealtime();
}
