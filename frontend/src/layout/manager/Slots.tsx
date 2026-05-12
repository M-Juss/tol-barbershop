import { useState } from "react";
import { Plus, Clock, CalendarDays, Timer, Ban } from "lucide-react";
import { TimeSlots } from "@/components/common/TimeSlots";
import { CloseDates } from "@/components/common/ClosedDates";
import { ActivityLog } from "@/components/common/ActivityLog";
import { ClosedDateForm } from "@/forms/ClosedDateForm";
import { ClosedDateSchemaFormValues } from "@/validations/closed.date.validation";

export function Slots() {
  const [showClosedDateModal, setShowClosedDateModal] = useState(false);

  const MOCK_CLOSED_DATES = [
    { label: "April 17, 2026" },
    { label: "April 18, 2026" },
    { label: "April 19, 2026" },
  ];

  const MOCK_ACTIVITY_LOGS = [
    {
      action: "Closed date added",
      details: "Manager marked April 17, 2026 as unavailable.",
      time: "8:15 AM",
    },
    {
      action: "Time slot removed",
      details: "The 10:00 AM slot was removed from weekday schedule.",
      time: "9:40 AM",
    },
    {
      action: "Time slot added",
      details: "Added a new 6:00 PM appointment slot.",
      time: "11:05 AM",
    },
    {
      action: "Closed date removed",
      details: "April 19, 2026 was reopened for bookings.",
      time: "1:20 PM",
    },
    {
      action: "Schedule updated",
      details: "Adjusted afternoon slots for weekend availability.",
      time: "3:45 PM",
    },
  ];

  const scheduleInfo = [
    {
      icon: CalendarDays,
      label: "Working Days",
      value: "Monday – Saturday",
      accent: "bg-blue-50 text-blue-600",
      iconBg: "bg-blue-100",
    },
    {
      icon: Clock,
      label: "Working Hours",
      value: "9:00 AM – 5:00 PM",
      accent: "bg-emerald-50 text-emerald-600",
      iconBg: "bg-emerald-100",
    },
    {
      icon: Timer,
      label: "Appointment Duration",
      value: "1 Hour",
      accent: "bg-violet-50 text-violet-600",
      iconBg: "bg-violet-100",
    },
    {
      icon: Ban,
      label: "Sunday",
      value: "Closed",
      accent: "bg-red-50 text-red-500",
      iconBg: "bg-red-100",
    },
  ];

  const openClosedDateModal = () => {
    setShowClosedDateModal(true);
  };

  const closeClosedDateModal = () => {
    setShowClosedDateModal(false);
  };

  const handleClosedDateSubmit = async (_data: ClosedDateSchemaFormValues) => {
    // TODO: connect closed-date create API when backend endpoint is ready.
    closeClosedDateModal();
  };

  return (
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 font-sans">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Appointment Slots
          </h1>
          <p className="text-gray-700 mt-1 text-sm sm:text-base">
            Manage your calendar availability and time slots
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Closed Dates Card */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between mb-6">
            <div className="flex flex-col">
              <p className="font-semibold">Closed Dates</p>
              <p className="text-gray-700">Mark days when the shop is closed</p>
            </div>
            <button
              onClick={openClosedDateModal}
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 transition-colors text-white font-semibold rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 text-sm"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              Close Dates
            </button>
          </div>
          <div className="space-y-2">
            {MOCK_CLOSED_DATES.map((date) => (
              <CloseDates key={date.label} label={date.label} />
            ))}
          </div>
        </div>

        {/* Schedule Overview Card */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col">
          <div className="mb-5">
            <p className="font-semibold text-gray-900">Schedule Overview</p>
            <p className="text-gray-500 text-sm mt-0.5">
              Current operating schedule for appointments
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
            {scheduleInfo.map(({ icon: Icon, label, value, accent, iconBg }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-gray-100 bg-slate-50 px-4 py-3.5 hover:bg-slate-100 transition-colors"
              >
                <div className={`${iconBg} rounded-lg p-2 shrink-0`}>
                  <Icon
                    className={`w-4 h-4 ${accent.split(" ")[1]}`}
                    strokeWidth={2}
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 font-medium uppercase tracking-wide leading-none mb-1">
                    {label}
                  </p>
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {value}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Subtle divider + status pill */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">Last updated today</p>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Schedule
            </span>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
        <p className="font-semibold">Activity Log</p>
        <p className="text-gray-700 mb-6">
          Recent changes to appointment slots
        </p>
        <div className="space-y-3 overflow-y-auto">
          {MOCK_ACTIVITY_LOGS.map((log, index) => (
            <ActivityLog
              key={`${log.action}-${index}`}
              action={log.action}
              details={log.details}
              time={log.time}
            />
          ))}
        </div>
      </div>

      <ClosedDateForm
        open={showClosedDateModal}
        onClose={closeClosedDateModal}
        onSubmit={handleClosedDateSubmit}
      />
    </div>
  );
}
