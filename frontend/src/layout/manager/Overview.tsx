import { useEffect, useState } from "react";
import { ManagerRevenueChart } from "@/components/common/ManagerRevenueChart";
import { ManagerServiceChart } from "@/components/common/ManagerServiceChart";
import { StatCard } from "@/components/common/StatCard";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppointmentStatusBadge } from "@/components/common/AppointmentStatusBadge";
import {
  CheckCircle2,
  User,
  Clock,
  AlertCircle,
  Mail,
  Phone,
  StickyNote,
  Star,
} from "lucide-react";
import {
  getOverviewStats,
  getMonthlyRevenue,
  getServiceStats,
  getTimeSlotsForDate,
  type SlotAppointment,
  type TimeSlot,
  type OverviewStats,
} from "@/services/manager/overview.api";
import { getClosedDates } from "@/services/manager/close.date.api";
import {
  getAnalyticsKPI,
  type AnalyticsKPI,
} from "@/services/manager/analytics.api";

function formatDateToLocal(date: Date): string {
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
}

function formatDisplayDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time: string | null): string {
  if (!time) return "—";
  const [hours, minutes] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-100 border-green-200";
    case "approved":
      return "bg-blue-100 border-blue-200";
    case "pending":
      return "bg-yellow-100 border-yellow-200";
    case "no_show":
      return "bg-gray-200 border-gray-300";
    default:
      return "bg-white border-gray-200";
  }
}

function AppointmentDetailModal({
  slot,
  open,
  onClose,
}: {
  slot: TimeSlot | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!slot) return null;
  const { appointments } = slot;
  const isMulti = appointments.length > 1;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            {slot.time}
            {isMulti && (
              <span className="text-sm font-normal text-gray-400 ml-1">
                ({appointments.length} appointments)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {appointments.map((appt, i) => (
          <div key={appt.id}>
            {i > 0 && <div className="border-t border-gray-100 my-3" />}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-500">
                  Appointment #{i + 1}
                </span>
                <AppointmentStatusBadge status={appt.status as any} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {appt.customer || "—"}
                    </p>
                    <p className="text-xs text-gray-500">Customer</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 truncate">
                      {appt.customer_email || "—"}
                    </p>
                    <p className="text-xs text-gray-500">Email</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 truncate">
                      {appt.customer_contact || "—"}
                    </p>
                    <p className="text-xs text-gray-500">Contact</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-500">Service</p>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {appt.service || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Barber</p>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {appt.barber || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(appt.appointment_date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Time</p>
                  <p className="text-sm font-medium text-gray-900">
                    {formatTime(appt.appointment_time)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Price</p>
                  <p className="text-sm font-medium text-gray-900">
                    {appt.price != null ? `₱${appt.price.toLocaleString()}` : "—"}
                  </p>
                </div>
              </div>

              {appt.notes && (
                <div className="flex items-start gap-3">
                  <StickyNote className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">Notes</p>
                    <p className="text-sm text-gray-900 break-words">
                      {appt.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
}

function TimeSlotCard({
  slot,
  onClick,
}: {
  slot: TimeSlot;
  onClick: () => void;
}) {
  const isAvailable = slot.status === "available";
  const count = slot.appointments.length;

  if (isAvailable) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-white/50">
          <Clock className="w-4 h-4 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{slot.time}</p>
          <p className="text-xs text-gray-400">Available</p>
        </div>
      </div>
    );
  }

  if (count === 1) {
    const appt = slot.appointments[0];
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-3 rounded-xl border p-3 text-left w-full transition-shadow hover:shadow-md cursor-pointer ${getStatusColor(appt.status)}`}
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-white/50">
          <Clock className="w-4 h-4 text-gray-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="sm:hidden">
            <p className="font-semibold text-gray-900 text-sm">{slot.time}</p>
            <p className="text-xs text-gray-500 mt-0.5 capitalize">
              {appt.status.replace("_", " ")}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <p className="font-semibold text-gray-900 text-sm">{slot.time}</p>
            <AppointmentStatusBadge status={appt.status as any} />
          </div>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl border border-purple-200 bg-purple-50 p-3 text-left w-full transition-shadow hover:shadow-md cursor-pointer"
    >
      <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-purple-100">
        <Clock className="w-4 h-4 text-purple-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{slot.time}</p>
        <p className="text-xs text-purple-600 font-medium">
          {count} Appointments
        </p>
      </div>
    </button>
  );
}

export function Overview() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [stats, setStats] = useState<OverviewStats>({
    completed_appointments: 0,
    pending_appointments: 0,
    approved_appointments: 0,
    total_customers: 0,
    total_revenue: 0,
  });
  const [monthlyRevenue, setMonthlyRevenue] = useState<
    { date: string; revenue: number }[]
  >([]);
  const [serviceStats, setServiceStats] = useState<
    { service_name: string; completed_count: number }[]
  >([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [kpi, setKpi] = useState<AnalyticsKPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailSlot, setDetailSlot] =
    useState<TimeSlot | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, revenueData, serviceData, kpiData] = await Promise.all([
          getOverviewStats(),
          getMonthlyRevenue(),
          getServiceStats(),
          getAnalyticsKPI("monthly"),
        ]);
        setStats(statsData);
        setMonthlyRevenue(revenueData);
        setServiceStats(serviceData);
        setKpi(kpiData);
      } catch (error) {
        console.error("Failed to load overview data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    const loadTimeSlots = async () => {
      if (selectedDate) {
        try {
          const slots = await getTimeSlotsForDate(selectedDate);
          setTimeSlots(slots);
        } catch (error) {
          console.error("Failed to load time slots:", error);
        }
      }
    };
    loadTimeSlots();
  }, [selectedDate]);

  useEffect(() => {
    const loadClosedDates = async () => {
      try {
        const response = await getClosedDates(1, 100);
        const dates = (response.data ?? []).map((item) => item.date_closed);
        setClosedDates(dates);
      } catch (error) {
        console.error("Failed to load closed dates:", error);
      }
    };

    loadClosedDates();
  }, []);

  return (
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 pb-12 sm:pb-10 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Dashboard
        </h1>
        <p className="text-gray-500 mt-1">
          Welcome back! Here&apos;s what is happening on your barbershop!
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Completed"
          value={loading ? "..." : stats.completed_appointments.toString()}
          icon={CheckCircle2}
          iconContainerClassName="bg-green-100"
          iconClassName="text-green-500"
        />
        <StatCard
          label="Approved"
          value={loading ? "..." : stats.approved_appointments.toString()}
          icon={CheckCircle2}
          iconContainerClassName="bg-blue-100"
          iconClassName="text-blue-500"
        />
        <StatCard
          label="Pending"
          value={loading ? "..." : stats.pending_appointments.toString()}
          icon={AlertCircle}
          iconContainerClassName="bg-yellow-100"
          iconClassName="text-yellow-500"
        />
        <StatCard
          label="Avg Rating"
          value={loading ? "..." : (kpi?.average_rating ?? 0).toString()}
          icon={Star}
          iconContainerClassName="bg-purple-100"
          iconClassName="text-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-base font-bold text-gray-900 mb-4">
            Daily Revenue
          </h2>
          <ManagerRevenueChart data={monthlyRevenue} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-base font-bold text-gray-900 mb-4">
            Services by Completed Appointments
          </h2>
          <ManagerServiceChart data={serviceStats} />
        </div>
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4 items-start min-w-0">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 w-full overflow-hidden">
          <h2 className="text-base font-bold text-gray-900">Calendar</h2>
          <p className="text-sm text-gray-400 mb-3">
            Select a date to view time slots
          </p>
          <div className="w-full flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(day) => {
                const isSunday = day.getDay() === 0;
                const isClosedDate = closedDates.includes(formatDateToLocal(day));
                return isSunday || isClosedDate;
              }}
              className="rounded-lg"
            />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h2 className="flex items-baseline gap-1 min-w-0 text-xs sm:text-base font-bold text-gray-900">
            <span className="shrink-0 sm:text-xl">Time Slots for</span>
            <span className="truncate min-w-0">
              {selectedDate ? formatDisplayDate(selectedDate) : "—"}
            </span>
          </h2>
          <p className="text-sm text-gray-400 mb-4">
            View appointments and availability (9:00 AM - 7:00 PM)
          </p>

          {timeSlots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Clock className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No time slots for this date.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {timeSlots.map((slot, i) => (
                <TimeSlotCard
                  key={i}
                  slot={slot}
                  onClick={() => setDetailSlot(slot)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="h-8" ></div>

      <AppointmentDetailModal
        slot={detailSlot}
        open={detailSlot !== null}
        onClose={() => setDetailSlot(null)}
      />
    </div>
  );
}
