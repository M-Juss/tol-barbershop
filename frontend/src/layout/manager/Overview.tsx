import { useEffect, useState } from "react";
import { ManagerRevenueChart } from "@/components/common/ManagerRevenueChart";
import { ManagerServiceChart } from "@/components/common/ManagerServiceChart";
import { StatCard } from "@/components/common/StatCard";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  CheckCircle2,
  User,
  PhilippinePeso,
  Clock,
  AlertCircle,
  Download,
} from "lucide-react";
import {
  getOverviewStats,
  getMonthlyRevenue,
  getServiceStats,
  getTimeSlotsForDate,
  getOverviewExportSummary,
  type TimeSlotAppointment,
} from "@/services/manager/overview.api";
import { getClosedDates } from "@/services/manager/close.date.api";

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

function getStatusColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-100 border-green-200 text-green-700";
    case "approved":
      return "bg-blue-100 border-blue-200 text-blue-700";
    case "pending":
      return "bg-yellow-100 border-yellow-200 text-yellow-700";
    case "no_show":
      return "bg-gray-200 border-gray-300 text-gray-700";
    default:
      return "bg-white border-gray-200 text-gray-600";
  }
}

function getStatusBadgeColor(status: string): string {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-600";
    case "approved":
      return "bg-blue-100 text-blue-600";
    case "pending":
      return "bg-yellow-100 text-yellow-600";
    case "no_show":
      return "bg-gray-200 text-gray-600";
    default:
      return "bg-green-100 text-green-600";
  }
}

function TimeSlotCard({ appt }: { appt: TimeSlotAppointment }) {
  const isAvailable = appt.status === "available";
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border p-3 ${getStatusColor(appt.status)}`}
    >
      <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-white/50">
        <Clock className="w-4 h-4 text-gray-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{appt.time}</p>
        {isAvailable ? (
          <p className="text-xs text-gray-500">Available</p>
        ) : (
          <>
            <p className="text-xs text-gray-700 truncate">{appt.customer}</p>
            <p className="text-xs text-gray-500 truncate">
              {appt.service} · {appt.barber}
            </p>
          </>
        )}
      </div>
      <span
        className={`flex-shrink-0 text-xs font-medium px-2 py-1 rounded-full capitalize ${getStatusBadgeColor(appt.status)}`}
      >
        {appt.status === "available"
          ? "Available"
          : appt.status.replace("_", " ")}
      </span>
    </div>
  );
}

export function Overview() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [stats, setStats] = useState({
    completed_appointments: 0,
    pending_appointments: 0,
    total_customers: 0,
    total_revenue: 0,
  });
  const [monthlyRevenue, setMonthlyRevenue] = useState<
    { date: string; revenue: number }[]
  >([]);
  const [serviceStats, setServiceStats] = useState<
    { service_name: string; completed_count: number }[]
  >([]);
  const [timeSlots, setTimeSlots] = useState<TimeSlotAppointment[]>([]);
  const [closedDates, setClosedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, revenueData, serviceData] = await Promise.all([
          getOverviewStats(),
          getMonthlyRevenue(),
          getServiceStats(),
        ]);
        setStats(statsData);
        setMonthlyRevenue(revenueData);
        setServiceStats(serviceData);
      } catch (error) {
        console.error("Failed to load overview data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleExportSummary = async () => {
    try {
      setExporting(true);
      const summary = await getOverviewExportSummary();

      const workbook = XLSX.utils.book_new();

      const summarySheet = XLSX.utils.json_to_sheet([
        {
          completed_appointments: summary.stats.completed_appointments,
          cancelled_appointments: summary.stats.cancelled_appointments,
          no_show_appointments: summary.stats.no_show_appointments,
          walkin_appointments: summary.stats.walkin_appointments,
          total_customers: summary.stats.total_customers,
          total_revenue: summary.stats.total_revenue,
        },
      ]);

      const revenueSheet = XLSX.utils.json_to_sheet(summary.daily_revenue);
      const serviceSheet = XLSX.utils.json_to_sheet(summary.service_stats);
      const appointmentsSheet = XLSX.utils.json_to_sheet(summary.appointments);

      XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
      XLSX.utils.book_append_sheet(workbook, revenueSheet, "Daily Revenue");
      XLSX.utils.book_append_sheet(workbook, serviceSheet, "Service Stats");
      XLSX.utils.book_append_sheet(workbook, appointmentsSheet, "Appointments");

      const dateTag = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `tols-summary-${dateTag}.xlsx`);
      toast.success("Export summary successfully");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export summary");
    } finally {
      setExporting(false);
    }
  };

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
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 font-sans">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Manager Overview
          </h1>
          <p className="text-gray-500 mt-1">
            Welcome back! Here&apos;s what is happening on your barbershop!
          </p>
        </div>
        <Button
          onClick={handleExportSummary}
          disabled={exporting}
          className="shrink-0"
        >
          <Download className="h-4 w-4 mr-2" />
          {exporting ? "Exporting..." : "Export Summary"}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Completed Appointments"
          value={loading ? "..." : stats.completed_appointments.toString()}
          icon={CheckCircle2}
          iconContainerClassName="bg-green-100"
          iconClassName="text-green-500"
        />
        <StatCard
          label="Pending Appointments"
          value={loading ? "..." : stats.pending_appointments.toString()}
          icon={AlertCircle}
          iconContainerClassName="bg-yellow-100"
          iconClassName="text-yellow-500"
        />
        <StatCard
          label="Total Customers"
          value={loading ? "..." : stats.total_customers.toString()}
          icon={User}
          iconContainerClassName="bg-blue-100"
          iconClassName="text-blue-500"
        />
        <StatCard
          label="Revenue"
          value={loading ? "..." : `₱ ${stats.total_revenue.toLocaleString()}`}
          icon={PhilippinePeso}
          iconContainerClassName="bg-orange-100"
          iconClassName="text-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
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

      <div className="grid grid-cols-1 xl:grid-cols-[auto_1fr] gap-4 items-start">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 w-fit">
          <h2 className="text-base font-bold text-gray-900">Calendar</h2>
          <p className="text-sm text-gray-400 mb-3">
            Select a date to view time slots
          </p>
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

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-base font-bold text-gray-900">
            Time Slots for{" "}
            {selectedDate ? formatDisplayDate(selectedDate) : "—"}
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
              {timeSlots.map((appt, i) => (
                <TimeSlotCard key={i} appt={appt} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
