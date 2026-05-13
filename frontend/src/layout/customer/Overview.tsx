"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Settings,
  CalendarPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { StatCard } from "@/components/common/StatCard";
import { AppointmentCardCustomer } from "@/components/common/AppointmentCardCustomer";
import {
  getAppointments,
  type Appointment,
} from "@/services/customer/appointment.api";

type UiAppointment = {
  id: number;
  service: string;
  barber: string;
  price: number;
  status: "Approved";
  date: string;
  time: string;
};

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

export function Overview() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const currentUserId = getCurrentUserId();
        if (!currentUserId) {
          setAppointments([]);
          return;
        }

        const data = await getAppointments();
        const userAppointments = data.filter(
          (appointment) => appointment.customer.id === currentUserId,
        );

        setAppointments(userAppointments);
      } catch (error) {
        console.error("Failed to load appointments:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  const completedCount = useMemo(
    () => appointments.filter((appointment) => appointment.status === "completed").length,
    [appointments],
  );

  const approvedCount = useMemo(
    () => appointments.filter((appointment) => appointment.status === "approved").length,
    [appointments],
  );

  const pendingCount = useMemo(
    () => appointments.filter((appointment) => appointment.status === "pending").length,
    [appointments],
  );

  const approvedAppointments: UiAppointment[] = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.status === "approved")
        .map((appointment) => ({
          id: appointment.id,
          service: appointment.service.name ?? "Unknown service",
          barber: appointment.barber.fullname ?? "Unknown barber",
          price: Number(appointment.price) || 0,
          status: "Approved",
          date: formatDate(appointment.appointment_date),
          time: formatTime(appointment.appointment_time),
        })),
    [appointments],
  );

  return (
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Overview</h1>
        <p className="text-gray-500 mt-1">
          Welcome back! Here&apos;s your appointment summary.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <StatCard
          label="Completed"
          value={String(completedCount)}
          icon={CheckCircle2}
          iconContainerClassName="bg-green-100"
          iconClassName="text-green-500"
        />
        <StatCard
          label="Upcoming"
          value={String(approvedCount)}
          icon={CalendarDays}
          iconContainerClassName="bg-blue-100"
          iconClassName="text-blue-500"
        />
        <StatCard
          label="Pending"
          value={String(pendingCount)}
          icon={Clock}
          iconContainerClassName="bg-yellow-100"
          iconClassName="text-yellow-500"
        />
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
        <h2 className="text-base font-bold text-gray-900">Upcoming Appointments</h2>
        <p className="text-gray-500 text-sm mb-4">Your approved appointments</p>

        {loading ? (
          <div className="rounded-lg p-8 text-center text-gray-400 border border-gray-100">
            Loading appointments...
          </div>
        ) : approvedAppointments.length === 0 ? (
          <div className="rounded-lg p-8 text-center text-gray-400 border border-gray-100">
            No approved appointments right now.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {approvedAppointments.map((appointment) => (
              <AppointmentCardCustomer
                key={appointment.id}
                service={appointment.service}
                barber={appointment.barber}
                price={appointment.price}
                status={appointment.status}
                date={appointment.date}
                time={appointment.time}
              />
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-base font-bold text-gray-900">Quick Actions</h2>
        <p className="text-gray-500 text-sm mb-4">
          Manage your account and appointments
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => router.push("/customer/appointment")}
            className="bg-red-500 hover:bg-red-600 transition-colors rounded-xl px-5 py-4 flex items-center gap-4 text-left"
          >
            <div className="bg-red-400 rounded-lg p-2">
              <CalendarPlus className="text-white w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <p className="text-white font-bold text-sm">New Appointment</p>
              <p className="text-red-100 text-xs mt-0.5">Book your next visit</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => router.push("/customer/profile")}
            className="bg-slate-800 hover:bg-slate-700 transition-colors rounded-xl px-5 py-4 flex items-center gap-4 text-left"
          >
            <div className="bg-slate-600 rounded-lg p-2">
              <Settings className="text-white w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Profile Settings</p>
              <p className="text-slate-400 text-xs mt-0.5">Update your information</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
