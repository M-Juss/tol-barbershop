"use client";
import { useState } from "react";
import {
  AppointmentCardCustomer,
  type AppointmentStatus,
} from "@/components/common/AppointmentCardCustomer";

type Status = AppointmentStatus;

interface Appointment {
  id: number;
  service: string;
  barber: string;
  price: number;
  status: Status;
  date: string;
  time: string;
}

const mockAppointments: Appointment[] = [
  {
    id: 1,
    service: "Premium Haircut + Beard Trim",
    barber: "Miguel Santos",
    price: 350,
    status: "Approved",
    date: "Apr 20, 2026",
    time: "10:00 AM",
  },
  {
    id: 2,
    service: "Classic Haircut",
    barber: "Ramon Villanueva",
    price: 200,
    status: "Pending",
    date: "Apr 22, 2026",
    time: "2:00 PM",
  },
  {
    id: 3,
    service: "Hair Color + Treatment",
    barber: "Miguel Santos",
    price: 850,
    status: "Completed",
    date: "Mar 15, 2026",
    time: "11:00 AM",
  },
  {
    id: 4,
    service: "Beard Styling",
    barber: "Carlo Reyes",
    price: 150,
    status: "Completed",
    date: "Feb 28, 2026",
    time: "3:30 PM",
  },
  {
    id: 5,
    service: "Kids Haircut",
    barber: "Ramon Villanueva",
    price: 120,
    status: "Completed",
    date: "Jan 10, 2026",
    time: "9:00 AM",
  },
  {
    id: 6,
    service: "Hot Towel Shave",
    barber: "Carlo Reyes",
    price: 250,
    status: "Rejected",
    date: "Apr 18, 2026",
    time: "1:00 PM",
  },
];

const tabs: Status[] = ["Pending", "Approved", "Completed", "Rejected"];

function countByStatus(status: Status) {
  return mockAppointments.filter((a) => a.status === status).length;
}

const emptyStatusMessage: Record<Status, string> = {
  Pending: "No pending appointments right now.",
  Approved: "No approved appointments right now.",
  Completed: "No completed appointments yet.",
  Rejected: "No rejected appointments.",
};

// ── Root Component ─────────────────────────────────────────────────────────
export default function MyAppointment() {
  const [activeTab, setActiveTab] = useState<Status>("Pending");

  const filtered = mockAppointments.filter((a) => a.status === activeTab);

  return (
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 font-sans">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Appointments</h1>
          <p className="text-gray-500 mt-1">
            View and manage your appointments
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl flex flex-wrap p-1 gap-1 mb-4 shadow-sm border border-gray-100 w-full sm:w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab
                ? "bg-gray-100 text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab} ({countByStatus(tab)})
          </button>
        ))}
      </div>

      {/* Appointment Cards */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        {filtered.length === 0 ? (
          <div className="rounded-lg p-10 text-center text-gray-400 border border-gray-100">
            {emptyStatusMessage[activeTab]}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((apt) => (
              <AppointmentCardCustomer
                key={apt.id}
                service={apt.service}
                barber={apt.barber}
                price={apt.price}
                status={apt.status}
                date={apt.date}
                time={apt.time}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
