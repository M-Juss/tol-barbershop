"use client";
import { useState } from "react";
import { Service } from "@/layout/manager/Service";
import { Admin } from "@/layout/manager/Admin";
import { Barber } from "@/layout/manager/Barber";
import { Slots } from "@/layout/manager/Slots";
import { Gallery } from "@/layout/manager/Gallery";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type ManagementTab = "Service" | "Gallery" | "Admin" | "Barber" | "Slots";

export default function Management() {
  const { user } = useAuth();
  const allTabs: ManagementTab[] = ["Service",  "Admin", "Barber", "Slots", "Gallery"];
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

        <div className="bg-white rounded-xl p-1 mb-4 shadow-sm border border-gray-100 overflow-x-auto">
          <div className="flex min-w-max gap-1">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn("min-w-24 flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors", activeTab === tab ? "bg-gray-100 text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 pb-4 sm:pb-6">
        {activeTab === "Service" && <Service />}
        {activeTab === "Gallery" && <Gallery />}
        {activeTab === "Admin" && <Admin />}
        {activeTab === "Barber" && <Barber />}
        {activeTab === "Slots" && <Slots />}
      </div>
    </div>
  );
}
