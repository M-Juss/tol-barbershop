"use client";

import { Calendar, LayoutDashboard, History, UserPlus } from "lucide-react";
import { ResponsiveSidebar } from "@/components/common/ResponsiveSidebar";

const navItems = [
  {
    key: "overview",
    href: "/admin",
    icon: LayoutDashboard,
    label: "Overview",
  },
  {
    key: "appointment",
    href: "/admin/appointment",
    icon: Calendar,
    label: "Appointment",
  },
  {
    key: "history",
    href: "/admin/history",
    icon: History,
    label: "History",
  },
  {
    key: "walkin",
    href: "/admin/walkin",
    icon: UserPlus,
    label: "Walkin",
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <ResponsiveSidebar navItems={navItems} />
      <main className="flex-1 overflow-y-auto bg-gray-100 md:pl-0 pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}
