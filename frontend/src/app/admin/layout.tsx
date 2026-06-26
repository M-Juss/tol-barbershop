"use client";

import { useState, useEffect, useCallback } from "react";
import { Calendar, LayoutDashboard, History, UserPlus, MessageSquareText, Settings, BarChart3 } from "lucide-react";
import { ResponsiveSidebar } from "@/components/common/ResponsiveSidebar";
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

  const fetchPendingCount = useCallback(async () => {
    try {
      const count = await getPendingAppointmentCount();
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

  const navItems = (user?.permissions
    ? allNavItems.filter((item) => item.key === "dashboard" || user.permissions?.includes(item.key))
    : allNavItems
  ).map((item) =>
    item.key === "appointment" ? { ...item, badgeCount: pendingCount } : item,
  );

  return (
    <div className="flex h-dvh overflow-hidden">
      <ResponsiveSidebar navItems={navItems} />
      <main className="min-h-0 flex-1 overflow-y-auto bg-gray-100 md:pl-0 pt-16 md:pt-0 pb-20 overscroll-contain">
        {children}
      </main>
    </div>
  );
}
