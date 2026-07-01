"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRealtimeEvent } from "@/contexts/RealtimeContext";
import { Calendar, LayoutDashboard, History, UserPlus, MessageSquareText, Settings, BarChart3 } from "lucide-react";
import { ResponsiveSidebar } from "@/components/common/ResponsiveSidebar";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useRoleRoutePersistence } from "@/hooks/useRoleRoutePersistence";
import { useAuth } from "@/contexts/AuthContext";
import { getPendingAppointmentCount } from "@/services/manager/admin.api";

const allNavItems = [
  {
    key: "dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    key: "management",
    href: "/admin/management",
    icon: Settings,
    label: "Management",
  },
  {
    key: "appointment",
    href: "/admin/appointment",
    icon: Calendar,
    label: "Appointment",
  },
  {
    key: "walkin",
    href: "/admin/walkin",
    icon: UserPlus,
    label: "Walkin",
  },
  {
    key: "history",
    href: "/admin/history",
    icon: History,
    label: "History",
  },
  {
    key: "reports",
    href: "/admin/reports",
    icon: BarChart3,
    label: "Reports",
  },
  {
    key: "feedback",
    href: "/admin/feedback",
    icon: MessageSquareText,
    label: "Feedback",
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useRoleRoutePersistence("/admin");
  const { user } = useAuth();
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
            onClick: () => (window.location.href = "/admin/appointment"),
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

  const navItems = (user?.permissions
    ? allNavItems.filter((item) => item.key === "dashboard" || user.permissions?.includes(item.key))
    : allNavItems
  ).map((item) =>
    item.key === "appointment" ? { ...item, badgeCount: pendingCount } : item,
  );

  return (
    <div className="flex h-dvh overflow-hidden">
      <ResponsiveSidebar navItems={navItems} />
      <main className="min-h-0 flex-1 overflow-y-auto bg-gray-100 md:pl-0 pt-[calc(4rem+env(safe-area-inset-top))] md:pt-0 pb-[calc(5rem+env(safe-area-inset-bottom))] overscroll-contain">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
