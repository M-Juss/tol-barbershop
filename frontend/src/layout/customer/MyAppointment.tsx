"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AppointmentCardCustomer,
  type AppointmentStatus,
} from "@/components/common/AppointmentCardCustomer";
import { getAppointments, type Appointment } from "@/services/customer/appointment.api";

type Status = AppointmentStatus;

type UiAppointment = {
  id: number;
  service: string;
  barber: string;
  price: number;
  status: Status;
  date: string;
  time: string;
};

const tabs: Status[] = ["Pending", "Approved", "Completed", "Cancelled"];

const emptyStatusMessage: Record<Status, string> = {
  Pending: "No pending appointments right now.",
  Approved: "No approved appointments right now.",
  Completed: "No completed appointments yet.",
  Cancelled: "No cancelled appointments.",
};

function toUiStatus(status: Appointment["status"]): Status {
  if (status === "approved") return "Approved";
  if (status === "completed") return "Completed";
  if (status === "pending") return "Pending";
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

function getCurrentUserId(): number | null {
  const raw = localStorage.getItem("auth_user");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return typeof parsed?.id === "number" ? parsed.id : null;
  } catch {
    return null;
  }
}

export function MyAppointment() {
  const [activeTab, setActiveTab] = useState<Status>("Pending");
  const [appointments, setAppointments] = useState<UiAppointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const currentUserId = getCurrentUserId();
        const data = await getAppointments();

        const mapped = data
          .filter((appt) =>
            currentUserId ? appt.customer.id === currentUserId : true,
          )
          .map((appt) => ({
            id: appt.id,
            service: appt.service.name ?? "Unknown service",
            barber: appt.barber.fullname ?? "Unknown barber",
            price: Number(appt.price) || 0,
            status: toUiStatus(appt.status),
            date: formatDate(appt.appointment_date),
            time: formatTime(appt.appointment_time),
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
    <div className="w-full h-full bg-slate-100 p-6 font-sans">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Appointments</h1>
          <p className="text-gray-500 mt-1">
            View and manage your appointments
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl flex p-1 gap-1 mb-4 shadow-sm border border-gray-100 w-fit">
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

      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        {loading ? (
          <div className="rounded-lg p-10 text-center text-gray-400 border border-gray-100">
            Loading appointments...
          </div>
        ) : filtered.length === 0 ? (
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
