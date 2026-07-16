"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useRealtimeEvent } from "@/contexts/RealtimeContext";
import { buildTableUrl, parsePage } from "@/lib/table-query";
import {
  getAppointmentHistory,
  type Appointment,
  type AppointmentHistoryMeta,
  type AppointmentStatus,
} from "@/services/customer/appointment.api";

export type AppointmentHistoryStatusFilter =
  | "all"
  | "walkin"
  | AppointmentStatus;

const validStatuses = new Set<AppointmentHistoryStatusFilter>([
  "all",
  "walkin",
  "pending",
  "approved",
  "completed",
  "cancelled",
  "rejected",
  "no_show",
]);

export function useAppointmentHistory() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const committedSearch = (searchParams.get("search") ?? "").slice(0, 100);
  const rawStatus = searchParams.get("status") ?? "all";
  const status = validStatuses.has(rawStatus as AppointmentHistoryStatusFilter)
    ? (rawStatus as AppointmentHistoryStatusFilter)
    : "all";
  const page = parsePage(searchParams.get("page"));
  const [search, setSearch] = useState(committedSearch);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [meta, setMeta] = useState<AppointmentHistoryMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    setSearch(committedSearch);
  }, [committedSearch]);

  useEffect(() => {
    const normalizedSearch = search.trim().slice(0, 100);
    if (normalizedSearch === committedSearch) return;

    const timer = window.setTimeout(() => {
      router.replace(
        buildTableUrl(pathname, searchParams, {
          search: normalizedSearch || null,
          page: null,
        }),
        { scroll: false },
      );
    }, 300);

    return () => window.clearTimeout(timer);
  }, [committedSearch, pathname, router, search, searchParams]);

  const setStatus = useCallback(
    (nextStatus: AppointmentHistoryStatusFilter) => {
      router.push(
        buildTableUrl(pathname, searchParams, {
          status: nextStatus === "all" ? null : nextStatus,
          page: null,
        }),
        { scroll: false },
      );
    },
    [pathname, router, searchParams],
  );

  const setPage = useCallback(
    (nextPage: number) => {
      router.push(
        buildTableUrl(pathname, searchParams, {
          page: nextPage === 1 ? null : nextPage,
        }),
        { scroll: false },
      );
    },
    [pathname, router, searchParams],
  );

  const getPageHref = useCallback(
    (nextPage: number) =>
      buildTableUrl(pathname, searchParams, {
        page: nextPage === 1 ? null : nextPage,
      }),
    [pathname, searchParams],
  );

  const fetchHistory = useCallback(
    async (signal?: AbortSignal, background = false) => {
      const requestId = ++requestIdRef.current;
      if (background) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const data = await getAppointmentHistory(
          {
            search: committedSearch || undefined,
            status:
              status !== "all" && status !== "walkin" ? status : undefined,
            is_walkin: status === "walkin" ? true : undefined,
            page,
            per_page: 10,
          },
          signal,
        );

        if (requestId !== requestIdRef.current) return;

        if (
          data.appointments.length === 0 &&
          page > data.meta.last_page &&
          data.meta.last_page > 0
        ) {
          setPage(data.meta.last_page);
          return;
        }

        setAppointments(data.appointments);
        setMeta(data.meta);
      } catch (fetchError) {
        if (signal?.aborted || requestId !== requestIdRef.current) return;
        console.error("Failed to load appointment history:", fetchError);
        setError("Could not load appointment history. Please try again.");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [committedSearch, page, setPage, status],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchHistory(controller.signal);
    return () => controller.abort();
  }, [fetchHistory]);

  useRealtimeEvent("appointments", (signal) =>
    fetchHistory(signal, true),
  );

  return {
    appointments,
    meta,
    loading,
    refreshing,
    error,
    search,
    setSearch,
    status,
    setStatus,
    page,
    setPage,
    getPageHref,
  };
}
