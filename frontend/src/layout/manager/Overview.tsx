import { useState } from "react";
import { StatCard } from "@/components/common/StatCard";
import { Calendar } from "@/components/ui/calendar";
import { CheckCircle2, Star, User, PhilippinePeso, Clock } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Appointment = {
  time: string;
  customer: string | null;
  service: string | null;
  barber: string | null;
  status: "booked" | "available";
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_APPOINTMENTS: Record<string, Appointment[]> = {
  "2026-04-17": [
    {
      time: "9:00 AM",
      customer: "John Dela Cruz",
      service: "Premium Haircut",
      barber: "Miguel Santos",
      status: "booked",
    },
    {
      time: "10:00 AM",
      customer: null,
      service: null,
      barber: null,
      status: "available",
    },
    {
      time: "11:00 AM",
      customer: "Pedro Martinez",
      service: "Beard Trim",
      barber: "Carlos Reyes",
      status: "booked",
    },
    {
      time: "1:00 PM",
      customer: "Luis Gonzales",
      service: "Regular Haircut",
      barber: "Ramon Cruz",
      status: "booked",
    },
    {
      time: "2:00 PM",
      customer: null,
      service: null,
      barber: null,
      status: "available",
    },
    {
      time: "3:00 PM",
      customer: null,
      service: null,
      barber: null,
      status: "available",
    },
    {
      time: "1:00 PM",
      customer: "Arnel Gonzales",
      service: "Beard Trim",
      barber: "Ramon Cruz",
      status: "booked",
    },
    {
      time: "5:00 PM",
      customer: null,
      service: null,
      barber: null,
      status: "available",
    },
    {
      time: "1:00 PM",
      customer: "Luis Gonzales",
      service: "Regular Haircut",
      barber: "Ramon Cruz",
      status: "booked",
    },
    {
      time: "3:00 PM",
      customer: null,
      service: null,
      barber: null,
      status: "available",
    },
  ],
  "2026-04-18": [
    {
      time: "9:00 AM",
      customer: "Marco Reyes",
      service: "Regular Haircut",
      barber: "Miguel Santos",
      status: "booked",
    },
    {
      time: "10:00 AM",
      customer: null,
      service: null,
      barber: null,
      status: "available",
    },
    {
      time: "11:00 AM",
      customer: null,
      service: null,
      barber: null,
      status: "available",
    },
    {
      time: "1:00 PM",
      customer: "Jose Santos",
      service: "Premium Haircut",
      barber: "Carlos Reyes",
      status: "booked",
    },
  ],
};

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ─── Time Slot Card ───────────────────────────────────────────────────────────

function TimeSlotCard({ appt }: { appt: Appointment }) {
  const isBooked = appt.status === "booked";
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3 ${
        isBooked ? "bg-blue-50 border-blue-100" : "bg-white border-gray-200"
      }`}
    >
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
          isBooked ? "bg-blue-100" : "bg-gray-100"
        }`}
      >
        <Clock
          className={`w-4 h-4 ${isBooked ? "text-blue-500" : "text-gray-400"}`}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{appt.time}</p>
        {isBooked ? (
          <>
            <p className="text-xs text-gray-700 truncate">{appt.customer}</p>
            <p className="text-xs text-gray-400 truncate">
              {appt.service} · {appt.barber}
            </p>
          </>
        ) : (
          <p className="text-xs text-gray-400">No appointment</p>
        )}
      </div>
      <span
        className={`flex-shrink-0 text-xs font-medium px-2 py-1 rounded-full ${
          isBooked ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
        }`}
      >
        {isBooked ? "Booked" : "Available"}
      </span>
    </div>
  );
}

// ─── Overview ─────────────────────────────────────────────────────────────────

export function Overview() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );

  const appointments = selectedDate
    ? (MOCK_APPOINTMENTS[formatDateKey(selectedDate)] ?? [])
    : [];

  return (
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 font-sans">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Manager Overview
        </h1>
        <p className="text-gray-500 mt-1">
          Welcome back! Here's what is happening on your barbershop!
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Completed Appointments"
          value="341"
          icon={CheckCircle2}
          iconContainerClassName="bg-green-100"
          iconClassName="text-green-500"
        />
        <StatCard
          label="Total Customer"
          value="125"
          icon={User}
          iconContainerClassName="bg-blue-100"
          iconClassName="text-blue-500"
        />
        <StatCard
          label="Revenue"
          value="₱ 24,990"
          icon={PhilippinePeso}
          iconContainerClassName="bg-orange-100"
          iconClassName="text-orange-500"
        />
        <StatCard
          label="Rating & Feedback"
          value="4.9 / 5"
          icon={Star}
          iconContainerClassName="bg-yellow-100"
          iconClassName="text-yellow-500"
        />
      </div>

      {/* Calendar + Time Slots */}
      <div className="grid grid-cols-1 xl:grid-cols-[auto_1fr] gap-4 items-start">
        {/* Calendar Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 w-fit">
          <h2 className="text-base font-bold text-gray-900">Calendar</h2>
          <p className="text-sm text-gray-400 mb-3">
            Select a date to view time slots
          </p>

          {/* ✅ shadcn Calendar — drop-in, no custom logic needed */}
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-lg"
          />
        </div>

        {/* Time Slots Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-base font-bold text-gray-900">
            Time Slots for{" "}
            {selectedDate ? formatDisplayDate(selectedDate) : "—"}
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            View appointments and availability
          </p>

          {appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Clock className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No time slots for this date.</p>
            </div>
          ) : (
            // ✅ 2-column grid as requested
            <div className="grid grid-cols-2 gap-3">
              {appointments.map((appt, i) => (
                <TimeSlotCard key={i} appt={appt} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
