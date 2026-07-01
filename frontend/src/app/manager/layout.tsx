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
} from "lucide-react";
import { ResponsiveSidebar } from "@/components/common/ResponsiveSidebar";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useRoleRoutePersistence } from "@/hooks/useRoleRoutePersistence";
import { getPendingAppointmentCount } from "@/services/manager/admin.api";

const navItems = [
  {
    key: "dashboard",
    href: "/manager",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    key: "management",
    href: "/manager/management",
    icon: Calendar,
    label: "Management",
  },
  {
    key: "appointment",
    href: "/manager/appointment",
    icon: BriefcaseBusiness,
    label: "Appointment",
  },
  {
    key: "walkin",
    href: "/manager/walkin",
    icon: UserPlus,
    label: "Walkin",
  },
  {
    key: "history",
    href: "/manager/history",
    icon: History,
    label: "History",
  },
  {
    key: "reports",
    href: "/manager/reports",
    icon: BarChart3,
    label: "Reports",
  },
  {
    key: "feedback",
    href: "/manager/feedback",
    icon: MessageSquareText,
    label: "Feedback",
  },
];

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useRoleRoutePersistence("/manager");
  const [pendingCount, setPendingCount] = useState(0);
  const prevCountRef = useRef(0);
  const isFirstLoadRef = useRef(true);

  const fetchPendingCount = useCallback(async () => {
    try {
      const count = await getPendingAppointmentCount();
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

  useEffect(() => {
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 30000);
    const onAppointmentsUpdated = () => fetchPendingCount();
    window.addEventListener("appointments:updated", onAppointmentsUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener("appointments:updated", onAppointmentsUpdated);
    };
  }, [fetchPendingCount]);

  useRealtimeEvent('appointments', fetchPendingCount);

  const items = navItems.map((item) =>
    item.key === "appointment" ? { ...item, badgeCount: pendingCount } : item,
  );

  return (
    <div className="flex h-dvh overflow-hidden">
      <ResponsiveSidebar navItems={items} />
      <main className="min-h-0 flex-1 overflow-y-auto bg-gray-100 md:pl-0 pt-[calc(4rem+env(safe-area-inset-top))] md:pt-0 pb-[calc(5rem+env(safe-area-inset-bottom))] overscroll-contain">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
