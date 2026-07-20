"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const Service = dynamic(
  () => import("@/layout/manager/Service").then((m) => m.Service),
  { ssr: false }
);
const Gallery = dynamic(
  () => import("@/layout/manager/Gallery").then((m) => m.Gallery),
  { ssr: false }
);
const Admin = dynamic(
  () => import("@/layout/manager/Admin").then((m) => m.Admin),
  { ssr: false }
);
const Barber = dynamic(
  () => import("@/layout/manager/Barber").then((m) => m.Barber),
  { ssr: false }
);
const Slots = dynamic(
  () => import("@/layout/manager/Slots").then((m) => m.Slots),
  { ssr: false }
);

type ManagementTab = "Service" | "Gallery" | "Admin" | "Barber" | "Slots";

export default function Management() {
  const { user } = useAuth();
  const allTabs: ManagementTab[] = ["Service", "Admin", "Barber", "Slots", "Gallery"];
  const tabs = user?.role === "admin"
    ? allTabs.filter((t) => t !== "Admin")
    : allTabs;
  const [activeTab, setActiveTab] = useState<ManagementTab>("Service");

  return (
    <div className="w-full h-full bg-slate-100 font-sans">
      <div className="px-4 sm:px-6 pt-4 sm:pt-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Management</h1>
            <p className="text-gray-500 mt-1">Manage services, gallery images, admins, barbers, and appointment slots</p>
          </div>
        </div>

        <div className="mb-4 rounded-xl border border-gray-100 bg-white p-1 shadow-sm">
          <div className="flex w-full gap-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn("flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-lg px-1 py-2 text-[11px] font-semibold transition-colors sm:px-4 sm:text-sm", activeTab === tab ? "bg-gray-100 text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="pb-4 sm:pb-6">
        {activeTab === "Service" && <Service />}
        {activeTab === "Gallery" && <Gallery />}
        {activeTab === "Admin" && <Admin />}
        {activeTab === "Barber" && <Barber />}
        {activeTab === "Slots" && <Slots />}
      </div>
    </div>
  );
}
