"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useRealtimeEvent } from "@/contexts/RealtimeContext";
import { Calendar, LayoutDashboard, History, UserPlus, MessageSquareText, Settings, BarChart3, Contact, Headset } from "lucide-react";
import { ResponsiveSidebar } from "@/components/common/ResponsiveSidebar";
import { NotificationPrompt } from "@/components/common/NotificationPrompt";
import { toast } from "sonner";
import { useRoleRoutePersistence } from "@/hooks/useRoleRoutePersistence";
import { useAuth } from "@/contexts/AuthContext";
import { getNavigationSummary } from "@/services/shared/navigation.api";

const navSections = [
  {
    label: "Overview",
    items: [
      { key: "dashboard", href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    label: "Operations",
    items: [
      { key: "appointment", href: "/admin/appointment", icon: Calendar, label: "Appointments" },
      { key: "walkin", href: "/admin/walkin", icon: UserPlus, label: "Walkin" },
      { key: "history", href: "/admin/history", icon: History, label: "History" },
    ],
  },
  {
    label: "Administration",
    items: [
      { key: "management", href: "/admin/management", icon: Settings, label: "Management" },
    ],
  },
  {
    label: "Relations",
    items: [
      { key: "crm", href: "/admin/customers", icon: Contact, label: "Customers" },
      { key: "customer-service", href: "/admin/customer-service", icon: Headset, label: "Customer Service" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { key: "reports", href: "/admin/reports", icon: BarChart3, label: "Reports" },
      { key: "feedback", href: "/admin/feedback", icon: MessageSquareText, label: "Feedback" },
    ],
  },
];
const navItems = navSections.flatMap((section) => section.items);
const noPermissions: string[] = [];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useRoleRoutePersistence("/admin");
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const prevCountRef = useRef(0);
  const prevWaitingRef = useRef(0);
  const isFirstLoadRef = useRef(true);
  const isFirstWaitingLoadRef = useRef(true);
  const permissions = user?.permissions ?? noPermissions;
  const fallbackPath = navItems.find((item) =>
    permissions.includes(item.key),
  )?.href;
  const requiredPermission = navItems.find((item) =>
    item.href === "/admin"
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(`${item.href}/`),
  )?.key;
  const canViewAppointments = permissions.includes("appointment");
  const canViewCustomerService = permissions.includes("customer-service");

  useEffect(() => {
    if (isLoading || user?.role !== "admin" || !requiredPermission) return;
    if (permissions.includes(requiredPermission)) return;

    if (fallbackPath) router.replace(fallbackPath);
  }, [
    fallbackPath,
    isLoading,
    permissions,
    requiredPermission,
    router,
    user?.role,
  ]);

  const fetchSummary = useCallback(async (signal?: AbortSignal, force = true) => {
    try {
      const summary = await getNavigationSummary(signal, force);
      const pendingAppointments = summary.pending_appointments ?? 0;
      const waitingTickets = summary.waiting_support_tickets ?? 0;

      if (!isFirstLoadRef.current && pendingAppointments > prevCountRef.current) {
        const diff = pendingAppointments - prevCountRef.current;
        toast(`${diff} New Pending Appointment${diff > 1 ? "s" : ""}`, {
          description: `A customer has submitted a new booking request.`,
          action: {
            label: "View",
            onClick: () => router.push("/admin/appointment"),
          },
          duration: 8000,
        });
      }
      isFirstLoadRef.current = false;
      prevCountRef.current = pendingAppointments;
      setPendingCount(pendingAppointments);

      if (!isFirstWaitingLoadRef.current && waitingTickets > prevWaitingRef.current) {
        const diff = waitingTickets - prevWaitingRef.current;
        toast(`${diff} New Waiting Ticket${diff > 1 ? "s" : ""}`, {
          description: `A customer is waiting in the support queue.`,
          action: {
            label: "View",
            onClick: () => router.push("/admin/customer-service"),
          },
          duration: 8000,
        });
      }
      isFirstWaitingLoadRef.current = false;
      prevWaitingRef.current = waitingTickets;
      setWaitingCount(waitingTickets);
    } catch {}
  }, [router]);

  useEffect(() => {
    if (!canViewAppointments && !canViewCustomerService) return;

    const controller = new AbortController();
    queueMicrotask(() => void fetchSummary(controller.signal, false));

    const onAppointmentsUpdated = () => fetchSummary();
    window.addEventListener("appointments:updated", onAppointmentsUpdated);

    return () => {
      controller.abort();
      window.removeEventListener("appointments:updated", onAppointmentsUpdated);
    };
  }, [canViewAppointments, canViewCustomerService, fetchSummary]);

  useRealtimeEvent("appointments", fetchSummary, canViewAppointments);
  useRealtimeEvent("support_tickets", fetchSummary, canViewCustomerService);

  const sections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => permissions.includes(item.key)),
    }))
    .filter((section) => section.items.length > 0)
    .map((section) => ({
      ...section,
      items: section.items.map((item) => {
        if (item.key === "appointment") return { ...item, badgeCount: pendingCount };
        if (item.key === "customer-service") return { ...item, badgeCount: waitingCount };
        return item;
      }),
    }));

  if (!isLoading && user?.role === "admin" && permissions.length === 0) {
    return (
      <div className="flex h-dvh overflow-hidden">
        <ResponsiveSidebar sections={[]} />
        <main className="flex min-h-0 flex-1 items-center justify-center bg-gray-100 p-6 text-center">
          <div className="max-w-md rounded-xl border bg-white p-6 shadow-sm">
            <h1 className="text-lg font-semibold text-gray-900">
              No modules assigned
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Ask a manager to assign the modules required for your role.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (
    !isLoading &&
    requiredPermission &&
    !permissions.includes(requiredPermission)
  ) {
    return null;
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      <ResponsiveSidebar sections={sections} />
      <main className="min-h-0 flex-1 overflow-y-auto bg-gray-100 md:pl-0 pt-[calc(4rem+env(safe-area-inset-top))] md:pt-0 pb-[calc(5rem+env(safe-area-inset-bottom))] overscroll-contain">
        {children}
        <NotificationPrompt />
      </main>
    </div>
  );
}
