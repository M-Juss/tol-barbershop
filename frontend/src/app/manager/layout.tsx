"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useRealtimeEvent } from "@/contexts/RealtimeContext";
import {
  Calendar,
  BriefcaseBusiness,
  History,
  UserPlus,
  LayoutDashboard,
  BarChart3,
  MessageSquareText,
  Contact,
  Headset,
} from "lucide-react";
import { ResponsiveSidebar } from "@/components/common/ResponsiveSidebar";
import { NotificationPrompt } from "@/components/common/NotificationPrompt";
import { toast } from "sonner";
import { useRoleRoutePersistence } from "@/hooks/useRoleRoutePersistence";
import { getNavigationSummary } from "@/services/shared/navigation.api";

const navSections = [
  {
    label: "Overview",
    items: [
      { key: "dashboard", href: "/manager", icon: LayoutDashboard, label: "Dashboard" },
    ],
  },
  {
    label: "Operations",
    items: [
      { key: "appointment", href: "/manager/appointment", icon: BriefcaseBusiness, label: "Appointments" },
      { key: "walkin", href: "/manager/walkin", icon: UserPlus, label: "Walkin" },
      { key: "history", href: "/manager/history", icon: History, label: "History" },
    ],
  },
  {
    label: "Administration",
    items: [
      { key: "management", href: "/manager/management", icon: Calendar, label: "Management" },
    ],
  },
  {
    label: "Relations",
    items: [
      { key: "crm", href: "/manager/customers", icon: Contact, label: "Customers" },
      { key: "customer-service", href: "/manager/customer-service", icon: Headset, label: "Customer Service" },
    ],
  },
  {
    label: "Analytics",
    items: [
      { key: "reports", href: "/manager/reports", icon: BarChart3, label: "Reports" },
      { key: "feedback", href: "/manager/feedback", icon: MessageSquareText, label: "Feedback" },
    ],
  },
];

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useRoleRoutePersistence("/manager");
  const router = useRouter();
  const [pendingCount, setPendingCount] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const prevCountRef = useRef(0);
  const prevWaitingRef = useRef(0);
  const isFirstLoadRef = useRef(true);
  const isFirstWaitingLoadRef = useRef(true);

  const fetchSummary = useCallback(async (signal?: AbortSignal, force = false) => {
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
            onClick: () => router.push("/manager/appointment"),
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
            onClick: () => router.push("/manager/customer-service"),
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
    const controller = new AbortController();
    queueMicrotask(() => void fetchSummary(controller.signal, false));

    const onAppointmentsUpdated = () => fetchSummary();
    window.addEventListener("appointments:updated", onAppointmentsUpdated);

    return () => {
      controller.abort();
      window.removeEventListener("appointments:updated", onAppointmentsUpdated);
    };
  }, [fetchSummary]);

  useRealtimeEvent("appointments", fetchSummary);
  useRealtimeEvent("support_tickets", fetchSummary);

  const sections = navSections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      if (item.key === "appointment") return { ...item, badgeCount: pendingCount };
      if (item.key === "customer-service") return { ...item, badgeCount: waitingCount };
      return item;
    }),
  }));

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
