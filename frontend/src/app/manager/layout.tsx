"use client";
import { useState, useEffect, useCallback, useRef } from "react";
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
import { startPolling } from "@/lib/polling";
import { getPendingAppointmentCount } from "@/services/manager/admin.api";
import { getWaitingCount } from "@/services/manager/support.api";

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
  const [pendingCount, setPendingCount] = useState(0);
  const [waitingCount, setWaitingCount] = useState(0);
  const prevCountRef = useRef(0);
  const prevWaitingRef = useRef(0);
  const isFirstLoadRef = useRef(true);
  const isFirstWaitingLoadRef = useRef(true);

  const fetchPendingCount = useCallback(async (signal?: AbortSignal) => {
    try {
      const count = await getPendingAppointmentCount(signal);
      if (!isFirstLoadRef.current && count > prevCountRef.current) {
        const diff = count - prevCountRef.current;
        toast(`${diff} New Pending Appointment${diff > 1 ? "s" : ""}`, {
          description: `A customer has submitted a new booking request.`,
          action: {
            label: "View",
            onClick: () => (window.location.href = "/manager/appointment"),
          },
          duration: 8000,
        });
      }
      isFirstLoadRef.current = false;
      prevCountRef.current = count;
      setPendingCount(count);
    } catch {}
  }, []);

  const fetchWaitingCount = useCallback(async (signal?: AbortSignal) => {
    const count = await getWaitingCount(signal);
    if (!isFirstWaitingLoadRef.current && count > prevWaitingRef.current) {
      const diff = count - prevWaitingRef.current;
      toast(`${diff} New Waiting Ticket${diff > 1 ? "s" : ""}`, {
        description: `A customer is waiting in the support queue.`,
        action: {
          label: "View",
          onClick: () => (window.location.href = "/manager/customer-service"),
        },
        duration: 8000,
      });
    }
    isFirstWaitingLoadRef.current = false;
    prevWaitingRef.current = count;
    setWaitingCount(count);
  }, []);

  useEffect(() => {
    return startPolling(fetchWaitingCount, 10000);
  }, [fetchWaitingCount]);

  useEffect(() => {
    const onAppointmentsUpdated = () => fetchPendingCount();
    window.addEventListener("appointments:updated", onAppointmentsUpdated);

    return () => {
      window.removeEventListener("appointments:updated", onAppointmentsUpdated);
    };
  }, [fetchPendingCount]);

  useRealtimeEvent("appointments", fetchPendingCount);

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
