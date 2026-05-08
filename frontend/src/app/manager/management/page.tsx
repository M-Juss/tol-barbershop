"use client";
import { useState } from "react";
import { Service } from "@/layout/manager/Service";
import { Admin } from "@/layout/manager/Admin";
import { Barber } from "@/layout/manager/Barber";
import { Slots } from "@/layout/manager/Slots";

type ManagementTab = "Service" | "Admin" | "Barber" | "Slots";

const tabs: ManagementTab[] = ["Service", "Admin", "Barber", "Slots"];

export default function Management() {
  const [activeTab, setActiveTab] = useState<ManagementTab>("Service");

  return (
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 font-sans">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Management</h1>
          <p className="text-gray-500 mt-1">Manage services, admins, barbers, and appointment slots</p>
        </div>
      </div>

      <div className="bg-white rounded-xl flex flex-wrap p-1 gap-1 mb-4 shadow-sm border border-gray-100 w-full sm:w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab
                ? "bg-gray-100 text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="sm:-mx-6">
        {activeTab === "Service" && <Service />}
        {activeTab === "Admin" && <Admin />}
        {activeTab === "Barber" && <Barber />}
        {activeTab === "Slots" && <Slots />}
      </div>
    </div>
  );
}
