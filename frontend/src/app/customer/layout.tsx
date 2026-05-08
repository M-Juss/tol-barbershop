"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  CalendarPlus,
  LayoutDashboard,
  LogOut,
  User,
} from "lucide-react";
import Image from "next/image";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

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

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-70 shrink-0 bg-primary text-sm hidden md:flex md:flex-col">
        <div className="flex space-x-2 items-center p-4 border-b border-slate-600">
          <Image src="/logo.svg" alt="Logo" height={40} width={40} />
          <h1 className="font-bold text-primary-foreground text-xl">
            Tols Barbershop
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === item.href
                  ? "bg-slate-800 text-white"
                  : "text-gray-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-slate-600">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </Link>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto bg-gray-100">{children}</main>
    </div>
  );
}
