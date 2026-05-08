"use client";
import {
  Calendar,
  LogOut,
  BriefcaseBusiness,
  History,
  UserPlus,
  LayoutDashboard
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";


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


export default function ManagerLayout({ children,}: {children: React.ReactNode;}){
const pathname = usePathname();

    return (
        
    <div className="flex min-h-screen">
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