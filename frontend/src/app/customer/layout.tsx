"use client";
import { Calendar, CalendarPlus, LayoutDashboard, User } from "lucide-react";
import { ResponsiveSidebar } from "@/components/common/ResponsiveSidebar";
import { useRoleRoutePersistence } from "@/hooks/useRoleRoutePersistence";

const navItems = [
  {
    key: "overview",
    href: "/customer",
    icon: LayoutDashboard,
    label: "Overview",
  },
  {
    key: "book-appointment",
    href: "/customer/appointment",
    icon: CalendarPlus,
    label: "Book Appointment",
  },
  {
    key: "appointments",
    href: "/customer/history",
    icon: Calendar,
    label: "My Appointment",
  },
  { key: "profile", href: "/customer/profile", icon: User, label: "Profile" },
];

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useRoleRoutePersistence("/customer");

  return (
    <div className="flex h-screen overflow-hidden">
      <ResponsiveSidebar navItems={navItems} />
      <main className="flex-1 overflow-y-auto bg-gray-100 md:pl-0 pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}
