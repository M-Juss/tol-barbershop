import { useState, useEffect } from "react";
import {
  Plus,
  Clock,
  CalendarDays,
  Timer,
  Ban,
  Calendar,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { TimeSlots } from "@/components/common/TimeSlots";
import { ActivityLog } from "@/components/common/ActivityLog";
import { ClosedDateForm } from "@/forms/ClosedDateForm";
import { ClosedDateSchemaFormValues } from "@/validations/closed.date.validation";
import {
  getClosedDates,
  createClosedDate,
  updateClosedDate,
  getAllClosedDatesForActivityLog,
  ClosedDate,
} from "@/services/manager/close.date.api";

// Helper function to format date consistently (local timezone)
const formatDateToLocal = (date: Date): string => {
  return (
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0")
  );
};

export function Slots() {
  const [showClosedDateModal, setShowClosedDateModal] = useState(false);
  const [closedDates, setClosedDates] = useState<ClosedDate[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activityLogs, setActivityLogs] = useState<
    Array<{
      action: string;
      details: string;
      time: string;
    }>
  >([]);
  const [activityCurrentPage, setActivityCurrentPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [activityLoading, setActivityLoading] = useState(true);

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
      value: "9:00 AM – 7:00 PM",
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

  const fetchClosedDates = async (page: number = 1) => {
    try {
      setLoading(true);

      // Fetch main closed dates (non-removed only)
      const response = await getClosedDates(page, 5);

      // Check if response and response.data exist before proceeding
      if (!response || !response.data) {
        console.error("Invalid response structure:", response);
        setClosedDates([]);
        setCurrentPage(1);
        setTotalPages(1);
        return;
      }

      // Set main closed dates (backend already filters out removed ones)
      setClosedDates(response.data);
      setCurrentPage(response.current_page || 1);
      setTotalPages(response.last_page || 1);
    } catch (error) {
      console.error("Error fetching closed dates:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivityLogs = async (page: number = 1) => {
    try {
      setActivityLoading(true);

      // Fetch all closed dates for activity log
      const activityResponse = await getAllClosedDatesForActivityLog(page, 5);

      // Generate activity logs from all closed dates (including removed ones)
      if (activityResponse && activityResponse.data) {
        const logs = activityResponse.data.map((date: ClosedDate) => {
          const formattedDate = new Date(date.date_closed).toLocaleDateString(
            "en-US",
            {
              year: "numeric",
              month: "long",
              day: "numeric",
            },
          );

          const timeField = date.is_removed ? date.updated_at : date.created_at;
          const time = new Date(timeField).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          });

          return {
            action: date.is_removed
              ? `${formattedDate} has been re-opened`
              : `${formattedDate} has been closed`,
            details: date.reason,
            time: time,
          };
        });

        setActivityLogs(logs);
        setActivityCurrentPage(activityResponse.current_page || 1);
        setActivityTotalPages(activityResponse.last_page || 1);
      }
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchAllData = async (page: number = 1) => {
    await Promise.all([
      fetchClosedDates(page),
      fetchActivityLogs(activityCurrentPage),
    ]);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const openClosedDateModal = () => {
    setShowClosedDateModal(true);
  };

  const closeClosedDateModal = () => {
    setShowClosedDateModal(false);
  };

  const handleClosedDateSubmit = async (data: ClosedDateSchemaFormValues) => {
    try {
      await createClosedDate({
        date_closed: formatDateToLocal(data.date_closed!),
        reason: data.reason,
      });
      await fetchAllData(currentPage);
      closeClosedDateModal();

      // Show success toast
      const formattedDate = data.date_closed!.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      toast.success(`Closed date added successfully for ${formattedDate}`);
    } catch (error) {
      console.error("Error creating closed date:", error);
      toast.error("Failed to add closed date");
    }
  };

  const handleRemoveClosedDate = async (id: number, dateClosed: string) => {
    try {
      await updateClosedDate(id, {
        date_closed: dateClosed,
        reason: `${dateClosed} is now available to be booked`,
        is_removed: true,
      });
      // Automatic refetch after update to refresh pagination and data
      await fetchAllData(currentPage);

      // Show success toast
      const date = new Date(dateClosed);
      const formattedDate = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      toast.success(`${formattedDate} has been reopened successfully`);
    } catch (error) {
      console.error("Error removing closed date:", error);
      toast.error("Failed to reopen closed date");
    }
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
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 transition-colors text-white text-sm rounded-lg px-4 py-2"
            >
              <Plus className="w-3 h-3" strokeWidth={2} />
              Add Closed Date
            </button>
          </div>
          <div className="space-y-2">
            {loading ? (
              <p className="text-gray-500 text-sm">Loading...</p>
            ) : closedDates.length === 0 ? (
              <p className="text-gray-500 text-sm">No closed dates found</p>
            ) : (
              closedDates.map((date) => {
                const formattedDate = new Date(
                  date.date_closed,
                ).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                });
                return (
                  <div
                    key={date.id}
                    className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-red-500" />
                      <p className="text-sm text-gray-700">{formattedDate}</p>
                    </div>
                    <button
                      onClick={() =>
                        handleRemoveClosedDate(date.id, date.date_closed)
                      }
                      className="text-red-600 hover:text-red-700 hover:bg-red-100 p-1 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => fetchClosedDates(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => fetchClosedDates(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
              >
                Next
              </button>
            </div>
          )}
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
            {scheduleInfo.map(
              ({ icon: Icon, label, value, accent, iconBg }) => (
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
              ),
            )}
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
          {activityLoading ? (
            <p className="text-gray-500 text-sm">Loading activity logs...</p>
          ) : activityLogs.length === 0 ? (
            <p className="text-gray-500 text-sm">No activity logs found</p>
          ) : (
            activityLogs.map((log, index) => (
              <ActivityLog
                key={`${log.action}-${index}`}
                action={log.action}
                details={log.details}
                time={log.time}
              />
            ))
          )}
        </div>

        {/* Activity Log Pagination */}
        {activityTotalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => fetchActivityLogs(activityCurrentPage - 1)}
              disabled={activityCurrentPage === 1}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {activityCurrentPage} of {activityTotalPages}
            </span>
            <button
              onClick={() => fetchActivityLogs(activityCurrentPage + 1)}
              disabled={activityCurrentPage === activityTotalPages}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <ClosedDateForm
        open={showClosedDateModal}
        onClose={closeClosedDateModal}
        onSubmit={handleClosedDateSubmit}
      />
    </div>
  );
}
