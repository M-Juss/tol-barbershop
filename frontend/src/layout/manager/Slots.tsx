"use client";

import { useCallback, useState, useEffect } from "react";
import {
  Plus,
  Clock,
  CalendarDays,
  Timer,
  Ban,
  Calendar,
  X,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { ActivityLog } from "@/components/common/ActivityLog";
import { ClosedDateForm } from "@/forms/ClosedDateForm";
import { ClosedDateSchemaFormValues } from "@/validations/closed.date.validation";
import {
  getClosedDates,
  createClosedDate,
  updateClosedDate,
  getClosedDateActivities,
  type ClosedDate,
  type ClosedDateActivity,
} from "@/services/manager/close.date.api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
      title: string;
      reason: string;
      actor: string;
      time: string;
    }>
  >([]);
  const [activityCurrentPage, setActivityCurrentPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [activityLoading, setActivityLoading] = useState(true);
  const [closedDateToReopen, setClosedDateToReopen] =
    useState<ClosedDate | null>(null);
  const [isReopening, setIsReopening] = useState(false);

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

  const fetchClosedDates = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);

      const response = await getClosedDates(page, 5, "all");

      if (!response || !response.data) {
        console.error("Invalid response structure:", response);
        setClosedDates([]);
        setCurrentPage(1);
        setTotalPages(1);
        return;
      }

      setClosedDates(response.data);
      setCurrentPage(response.current_page || 1);
      setTotalPages(response.last_page || 1);
    } catch (error) {
      console.error("Error fetching closed dates:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActivityLogs = useCallback(async (page: number = 1) => {
    try {
      setActivityLoading(true);

      const activityResponse = await getClosedDateActivities(page, 5);

      if (activityResponse && activityResponse.data) {
        const logs = activityResponse.data.map((activity: ClosedDateActivity) => {
          const formattedDate = new Date(activity.date_closed).toLocaleDateString(
            "en-US",
            {
              year: "numeric",
              month: "long",
              day: "numeric",
            },
          );
          const subject =
            activity.closure_scope === "barber"
              ? `${activity.barber_name ?? "Barber"}'s schedule`
              : "The shop";

          const title =
            activity.action === "reopened"
              ? `${subject} was reopened`
              : `${subject} was closed`;

          return {
            title,
            reason: activity.reason,
            actor: activity.actor_name ?? "",
            time: formattedDate,
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
  }, []);

  const fetchAllData = useCallback(async (page: number = 1) => {
    await Promise.all([
      fetchClosedDates(page),
      fetchActivityLogs(activityCurrentPage),
    ]);
  }, [activityCurrentPage, fetchActivityLogs, fetchClosedDates]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

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
        closure_scope: data.closure_scope,
        barber_user_id: data.barber_user_id ?? undefined,
        reason: data.reason,
      });
      await fetchAllData(currentPage);
      closeClosedDateModal();

      const formattedDate = data.date_closed!.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      toast.success(
        data.closure_scope === "barber"
          ? `Barber day off added for ${formattedDate}`
          : `Closed date added for ${formattedDate}`,
      );
    } catch (error) {
      console.error("Error creating closed date:", error);
      toast.error(error instanceof Error ? error.message : "Could not add closed date. Please try again.");
    }
  };

  const handleRemoveClosedDate = async () => {
    if (!closedDateToReopen || isReopening) return;

    const { id, date_closed: dateClosed } = closedDateToReopen;
    setIsReopening(true);
    try {
      await updateClosedDate(id, { is_removed: true });
      await fetchAllData(currentPage);

      const date = new Date(dateClosed);
      const formattedDate = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      toast.success(`${formattedDate} has been reopened successfully`);
      setClosedDateToReopen(null);
    } catch (error) {
      console.error("Error removing closed date:", error);
      toast.error(error instanceof Error ? error.message : "Could not reopen date. Please try again.");
    } finally {
      setIsReopening(false);
    }
  };

  return (
    <div className="w-full h-full p-4 sm:p-6 pb-12 sm:pb-10 font-sans">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col">
          <div className="relative mb-4">
            <p className="font-semibold">Closed Dates</p>
            <p className="text-gray-700 text-sm">Mark days when the shop is closed</p>
            <button
              onClick={openClosedDateModal}
              className="absolute top-0 right-0 flex items-center gap-1.5 bg-red-500 hover:bg-red-600 transition-colors text-white font-semibold rounded-lg px-3 py-1.5 text-xs whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
              <span className="hidden xs:inline">Add Closed Date</span>
              <span className="xs:hidden">Add</span>
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
                    <div className="flex min-w-0 items-center gap-2">
                      <Calendar size={16} className="text-red-500" />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-700">{formattedDate}</p>
                        <p className="truncate text-xs text-gray-500">
                          {date.closure_scope === "barber"
                            ? date.barber_name
                            : "Whole shop"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setClosedDateToReopen(date)}
                      disabled={isReopening}
                      className="text-red-600 hover:text-red-700 hover:bg-red-100 p-1 rounded"
                      aria-label={`Reopen ${formattedDate}`}
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

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex flex-col">
          <div className="mb-5">
            <p className="font-semibold text-gray-900">Schedule Overview</p>
            <p className="text-gray-500 text-sm mt-0.5">
              Current operating schedule for appointments
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 flex-1">
            {scheduleInfo.map(
              ({ icon: Icon, label, value, accent, iconBg }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 bg-slate-50 px-4 py-3.5 hover:bg-slate-100 transition-colors"
                >
                  <div className={cn(iconBg, "rounded-lg p-2 shrink-0")}>
                    <Icon
                      className={cn("w-4 h-4", accent.split(" ")[1])}
                      strokeWidth={2}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide leading-none mb-1">
                      {label}
                    </p>
                    <p className="text-sm font-semibold text-gray-800 whitespace-normal break-words">
                      {value}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">Last updated today</p>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Schedule
            </span>
          </div>
        </div>
      </div>

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
                key={`${log.title}-${index}`}
                title={log.title}
                reason={log.reason}
                actor={log.actor}
                time={log.time}
              />
            ))
          )}
        </div>

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

      <Dialog
        open={closedDateToReopen !== null}
        onOpenChange={(open) => {
          if (!open && !isReopening) setClosedDateToReopen(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Reopen Closed Date
            </DialogTitle>
            <DialogDescription>
              Reopening this schedule makes it available for new bookings.
              Continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setClosedDateToReopen(null)}
              disabled={isReopening}
            >
              Keep Closed
            </Button>
            <Button
              type="button"
              onClick={handleRemoveClosedDate}
              disabled={isReopening}
            >
              {isReopening ? "Reopening..." : "Reopen Date"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
