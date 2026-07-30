"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Calendar, CalendarPlus, LayoutDashboard, User } from "lucide-react";
import { ResponsiveSidebar } from "@/components/common/ResponsiveSidebar";
import { SupportFab } from "@/components/common/SupportFab";
import { NotificationPrompt } from "@/components/common/NotificationPrompt";
import { CustomerBottomNavigation } from "@/layout/customer/CustomerBottomNavigation";
import { useRoleRoutePersistence } from "@/hooks/useRoleRoutePersistence";
import { startPolling } from "@/lib/polling";
import { getNotifications } from "@/services/shared/notification.api";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [unreadCount, setUnreadCount] = useState(0);
  const scrollContainerRef = useRef<HTMLElement | null>(null);
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
      <ResponsiveSidebar sections={sections} mobileMode="desktop-only" />
      <main
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gray-100 pt-[env(safe-area-inset-top)] pb-[calc(7.5rem+env(safe-area-inset-bottom))] md:pt-0 md:pb-0"
      >
        {children}
        <SupportFab />
        <NotificationPrompt settingsLocation="Profile under Device Notifications" />
      </main>
      <CustomerBottomNavigation
        unreadCount={unreadCount}
        scrollContainerRef={scrollContainerRef}
      />
    </div>
  );
}
