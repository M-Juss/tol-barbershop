import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Settings,
  CalendarPlus,
} from "lucide-react";
import { StatCard } from "@/components/common/StatCard";
import { AppointmentCardCustomer } from "@/components/common/AppointmentCardCustomer";

type OverviewProps = {
  onBookAppointment: () => void;
  onProfileSettings: () => void;
};

export function Overview({
  onBookAppointment,
  onProfileSettings,
}: OverviewProps) {
  return (
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 font-sans">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Overview
        </h1>
        <p className="text-gray-500 mt-1">
          Welcome back! Here's your appointment summary.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <StatCard
          label="Completed"
          value="3"
          icon={CheckCircle2}
          iconContainerClassName="bg-green-100"
          iconClassName="text-green-500"
        />
        <StatCard
          label="Upcoming"
          value="1"
          icon={CalendarDays}
          iconContainerClassName="bg-blue-100"
          iconClassName="text-blue-500"
        />
        <StatCard
          label="Pending"
          value="1"
          icon={Clock}
          iconContainerClassName="bg-yellow-100"
          iconClassName="text-yellow-500"
        />
      </div>

      {/* Upcoming Appointments */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
        <h2 className="text-base font-bold text-gray-900">
          Upcoming Appointments
        </h2>
        <p className="text-gray-500 text-sm mb-4">
          Your scheduled appointments
        </p>

        <AppointmentCardCustomer
          service="Premium Haircut + Beard Trim"
          barber="Miguel Santos"
          price={350}
          status="Approved"
          date="Apr 20, 2026"
          time="10:00 AM"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-base font-bold text-gray-900">Quick Actions</h2>
        <p className="text-gray-500 text-sm mb-4">
          Manage your account and appointments
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* New Appointment */}

          <button
            type="button"
            onClick={onBookAppointment}
            className="bg-red-500 hover:bg-red-600 transition-colors rounded-xl px-5 py-4 flex items-center gap-4 text-left"
          >
            <div className="bg-red-400 rounded-lg p-2">
              <CalendarPlus className="text-white w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <p className="text-white font-bold text-sm">New Appointment</p>
              <p className="text-red-100 text-xs mt-0.5">
                Book your next visit
              </p>
            </div>
          </button>

          {/* Profile Settings */}
          <button
            type="button"
            onClick={onProfileSettings}
            className="bg-slate-800 hover:bg-slate-700 transition-colors rounded-xl px-5 py-4 flex items-center gap-4 text-left"
          >
            <div className="bg-slate-600 rounded-lg p-2">
              <Settings className="text-white w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Profile Settings</p>
              <p className="text-slate-400 text-xs mt-0.5">
                Update your information
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
