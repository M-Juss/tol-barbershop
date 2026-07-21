"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Calendar, CalendarPlus, LayoutDashboard, User } from "lucide-react";
import { ResponsiveSidebar } from "@/components/common/ResponsiveSidebar";
import { SupportFab } from "@/components/common/SupportFab";
import { NotificationPrompt } from "@/components/common/NotificationPrompt";
import { useRoleRoutePersistence } from "@/hooks/useRoleRoutePersistence";
import { startPolling } from "@/lib/polling";
import { getNotifications } from "@/services/shared/notification.api";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  useRoleRoutePersistence("/customer");

  const loadUnreadCount = useCallback(async (signal?: AbortSignal) => {
    try {
      const data = await getNotifications(1, signal);
      setUnreadCount(data.unread_count);
    } catch (error) {
      if (signal?.aborted) return;
      setUnreadCount(0);
      throw error;
    }
  }, []);

  useEffect(() => {
    const stopPolling = startPolling(loadUnreadCount, 30000);

    const handleUnreadUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ unreadCount?: number }>;
      const nextCount = customEvent.detail?.unreadCount;
      if (typeof nextCount === "number") {
        setUnreadCount(nextCount);
      }
    };

    window.addEventListener("notifications:unread-updated", handleUnreadUpdate as EventListener);

    return () => {
      stopPolling();
      window.removeEventListener("notifications:unread-updated", handleUnreadUpdate as EventListener);
    };
  }, [loadUnreadCount]);

  const sections = useMemo(
    () => [
      {
        label: "Dashboard",
        items: [
          { key: "overview", href: "/customer", icon: LayoutDashboard, label: "Dashboard" },
        ],
      },
      {
        label: "Appointments",
        items: [
          { key: "book-appointment", href: "/customer/appointment", icon: CalendarPlus, label: "Book Appointment" },
          { key: "appointments", href: "/customer/history", icon: Calendar, label: "My Appointment" },
        ],
      },
      {
        label: "Account",
        items: [
          { key: "notification", href: "/customer/notification", icon: Bell, label: "Notification", badgeCount: unreadCount },
          { key: "profile", href: "/customer/profile", icon: User, label: "Profile" },
        ],
      },
    ],
    [unreadCount],
  );

  return (
    <div className="flex h-dvh overflow-hidden">
      <ResponsiveSidebar sections={sections} />
      <main className="min-h-0 flex-1 overflow-y-auto bg-gray-100 md:pl-0 pt-[calc(4rem+env(safe-area-inset-top))] md:pt-0 pb-[calc(5rem+env(safe-area-inset-bottom))] overscroll-contain">
        {children}
        <SupportFab />
        <NotificationPrompt />
      </main>
    </div>
  );
}
