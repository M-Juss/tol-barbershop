"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AppointmentCard,
  type AppointmentStatus,
} from "@/components/common/AppointmentCardAdmin";
import {
  getAppointments,
  type Appointment,
} from "@/services/customer/appointment.api";

type Status = AppointmentStatus;

type UiAppointment = {
  id: number;
  service: string;
  barber: string;
  price: number;
  status: Status;
  date: string;
  time: string;
  customer: string;
  cancellation_reason?: string | null;
};

const tabs: Status[] = [
  "Pending",
  "Approved",
  "Completed",
  "Cancelled",
  "No-show",
];

function toUiStatus(status: Appointment["status"]): Status {
  if (status === "approved") return "Approved";
  if (status === "completed") return "Completed";
  if (status === "pending") return "Pending";
  if (status === "no_show") return "No-show";
  return "Cancelled";
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function Historical() {
  const [activeTab, setActiveTab] = useState<Status>("Pending");
  const [appointments, setAppointments] = useState<UiAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const data = await getAppointments();
        const mapped = data.map((appt) => ({
          id: appt.id,
          service: appt.service.name ?? "Unknown service",
          barber: appt.barber.fullname ?? "Unknown barber",
          customer: appt.customer.fullname ?? "Unknown customer",
          price: Number(appt.price) || 0,
          status: toUiStatus(appt.status),
          date: formatDate(appt.appointment_date),
          time: formatTime(appt.appointment_time),
          cancellation_reason: appt.cancellation_reason,
        }));

        setAppointments(mapped);
      } catch (error) {
        console.error("Failed to load appointments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const filtered = useMemo(
    () => appointments.filter((a) => a.status === activeTab),
    [appointments, activeTab],
  );

  const countByStatus = (status: Status) =>
    appointments.filter((a) => a.status === status).length;

  return (
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 font-sans">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Appointment History
          </h1>
          <p className="text-gray-500 mt-1">
            View appointment according to its status
          </p>
        </div>
      </div>

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

      <div className="flex flex-col gap-3">
        {loading ? (
          <div className="bg-white rounded-xl p-10 text-center text-gray-400 border border-gray-100 shadow-sm">
            Loading appointments...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center text-gray-400 border border-gray-100 shadow-sm">
            No {activeTab.toLowerCase()} appointments.
          </div>
        ) : (
          filtered.map((apt) => (
            <AppointmentCard
              key={apt.id}
              service={apt.service}
              barber={apt.barber}
              price={apt.price}
              status={apt.status}
              date={apt.date}
              time={apt.time}
              customer={apt.customer}
              cancellation_reason={apt.cancellation_reason}
            />
          ))
        )}
      </div>
    </div>
  );
}
