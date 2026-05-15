"use client";
import {
  Calendar,
  BriefcaseBusiness,
  History,
  UserPlus,
  LayoutDashboard,
} from "lucide-react";
import { ResponsiveSidebar } from "@/components/common/ResponsiveSidebar";
import { Toaster } from "@/components/ui/sonner";
import { useRoleRoutePersistence } from "@/hooks/useRoleRoutePersistence";

const navItems = [
  {
    key: "overview",
    href: "/manager",
    icon: LayoutDashboard,
    label: "Overview",
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
];

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useRoleRoutePersistence("/manager");

  return (
    <div className="flex h-screen overflow-hidden">
      <ResponsiveSidebar navItems={navItems} />
      <main className="flex-1 overflow-y-auto bg-gray-100 md:pl-0 pt-16 md:pt-0">
        {children}
      </main>
      <Toaster />
    </div>
  );
}
