"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCheck,
  Clock,
  Scissors,
  Users,
} from "lucide-react";
import { formatBookingId, formatTicketId } from "@/lib/booking";
import { sanitizeText } from "@/lib/sanitizer";
import { toast } from "sonner";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationItem,
} from "@/services/shared/notification.api";
import { formatTime12 } from "@/lib/time-slots";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type AppointmentNotificationPayload = {
  appointment_id: number | string;
  status?: string;
  service_name?: string;
  barber_name?: string;
  appointment_date?: string;
  appointment_time?: string;
  price?: number | string;
  cancellation_reason?: string | null;
  next_step?: string;
};

type GroupAppointmentItem = {
  appointment_id: number;
  booking_id?: string;
  customer_name?: string;
  service_name?: string;
  appointment_time?: string;
  price?: number | string;
};

type GroupAppointmentNotificationPayload = {
  batch_id: string;
  status?: string;
  appointment_count?: number;
  appointment_date?: string;
  barber_name?: string;
  total_price?: number | string;
  cancellation_reason?: string | null;
  next_step?: string;
  appointments?: GroupAppointmentItem[];
};

function isAppointmentNotificationPayload(
  payload: Record<string, unknown> | null | undefined,
): payload is AppointmentNotificationPayload {
  if (!payload) return false;
  return typeof payload.appointment_id === "number" || typeof payload.appointment_id === "string";
}

function isGroupAppointmentNotificationPayload(
  payload: Record<string, unknown> | null | undefined,
): payload is GroupAppointmentNotificationPayload {
  return Boolean(payload && typeof payload.batch_id === "string");
}

function formatAppointmentDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPayloadNumber(
  payload: Record<string, unknown> | null | undefined,
  key: string,
): number | null {
  const value = payload?.[key];
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getTicketId(item: NotificationItem): number | null {
  return getPayloadNumber(item.payload, "ticket_id");
}

function getAppointmentId(item: NotificationItem): number | null {
  return item.appointment_id ?? getPayloadNumber(item.payload, "appointment_id");
}

function getPayloadString(
  payload: Record<string, unknown> | null | undefined,
  key: string,
): string | null {
  const value = payload?.[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function getAppointmentStatus(
  item: NotificationItem,
  payload: AppointmentNotificationPayload,
): string {
  if (payload.status) return payload.status;
  if (item.type === "appointment_completed") return "completed";
  if (item.type === "appointment_rescheduled") return "rescheduled";
  return "updated";
}

function getStatusClasses(status: string): string {
  if (status === "pending") return "bg-amber-100 text-amber-800";
  if (status === "approved") return "bg-blue-100 text-blue-800";
  if (status === "completed") return "bg-green-100 text-green-800";
  if (status === "rejected") return "bg-orange-100 text-orange-800";
  if (status === "cancelled") return "bg-red-100 text-red-800";
  if (status === "rescheduled") return "bg-purple-100 text-purple-800";
  return "bg-gray-100 text-gray-700";
}

function getStatusLabel(status: string): string {
  if (status === "no_show") return "No-show";
  return status.charAt(0).toUpperCase() + status.slice(1).replaceAll("_", " ");
}

function getFallbackNextStep(status: string): string | null {
  if (status === "pending") return "We will notify you after the barbershop reviews your request.";
  if (status === "approved") return "Please arrive about 5 minutes early so your visit can start on time.";
  if (status === "rejected") return "You can choose another available date or time and submit a new request.";
  if (status === "cancelled") return "You can create another booking whenever you are ready.";
  if (status === "completed") return "We would appreciate your feedback about your visit.";
  if (status === "no_show") return "If you believe this is incorrect, please contact the barbershop.";
  if (status === "rescheduled") return "Please review the updated schedule and arrive about 5 minutes early.";
  return null;
}

function getDisplayMessage(item: NotificationItem): string {
  const appointmentId = getAppointmentId(item);
  const ticketId = getTicketId(item);
  let message = item.message;

  if (appointmentId) {
    const displayAppointmentId = formatBookingId(appointmentId);
    message = message.replaceAll(`#${appointmentId}`, displayAppointmentId);

    if (item.type === "appointment_status" && !message.includes(displayAppointmentId)) {
      message = message.replace(
        "Your booking is now",
        `Your appointment ${displayAppointmentId} is now`,
      );
    }
  }

  if (!ticketId) return message;

  const displayTicketId = formatTicketId(ticketId);
  if (!displayTicketId || message.includes(displayTicketId)) return message;

  return message
    .replace("Your support ticket has", `Your support ticket ${displayTicketId} has`)
    .replace("Your support ticket was", `Your support ticket ${displayTicketId} was`)
    .replace("Your ticket has", `Your ticket ${displayTicketId} has`)
    .replace("A support ticket was", `Support ticket ${displayTicketId} was`)
    .replace("has submitted a support request.", `has submitted support ticket ${displayTicketId}.`);
}

function AppointmentNotificationDetails({
  item,
  payload,
}: {
  item: NotificationItem;
  payload: AppointmentNotificationPayload;
}) {
  const appointmentId = Number(payload.appointment_id);
  const status = getAppointmentStatus(item, payload);
  const serviceName = payload.service_name ?? item.service_name ?? "Barbershop Service";
  const barberName = payload.barber_name ?? item.barber_name;
  const appointmentDate = payload.appointment_date ?? item.appointment_date;
  const appointmentTime = payload.appointment_time ?? item.appointment_time;
  const price = payload.price ?? item.price;
  const reason = payload.cancellation_reason
    ? sanitizeText(payload.cancellation_reason)
    : null;
  const nextStep = payload.next_step ?? getFallbackNextStep(status);

  return (
    <>
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="shrink-0 rounded-xl bg-blue-100 p-2.5">
              <Scissors className="h-5 w-5 text-blue-500" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-gray-900">
                {serviceName}
              </p>
              <p className="mt-0.5 font-mono text-sm text-gray-500">
                {Number.isFinite(appointmentId) ? formatBookingId(appointmentId) : "Appointment"}
              </p>
            </div>
          </div>
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", getStatusClasses(status))}>
            {getStatusLabel(status)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-gray-500">Barber</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">
              {barberName ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Date</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">
              {appointmentDate ? formatAppointmentDate(appointmentDate) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Time</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">
              {appointmentTime ? formatTime12(appointmentTime) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Price</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900">
              {price != null && Number.isFinite(Number(price))
                ? `₱${Number(price).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-gray-50 p-3">
        <p className="mb-0.5 text-xs text-gray-500">Update</p>
        <p className="text-sm leading-6 text-gray-700">{getDisplayMessage(item)}</p>
      </div>

      {reason && (
        <div className="flex gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-orange-900">
              {status === "rejected" ? "Reason for rejection" : "Reason for cancellation"}
            </p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-orange-800">
              {reason}
            </p>
          </div>
        </div>
      )}

      {nextStep && (
        <div className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <div>
            <p className="text-sm font-semibold text-blue-900">What happens next</p>
            <p className="mt-1 text-sm leading-5 text-blue-800">{nextStep}</p>
          </div>
        </div>
      )}
    </>
  );
}

function GroupAppointmentNotificationDetails({
  item,
  payload,
}: {
  item: NotificationItem;
  payload: GroupAppointmentNotificationPayload;
}) {
  const status = payload.status ?? "updated";
  const appointments = Array.isArray(payload.appointments) ? payload.appointments : [];
  const appointmentCount = payload.appointment_count ?? appointments.length;
  const reason = payload.cancellation_reason
    ? sanitizeText(payload.cancellation_reason)
    : null;
  const nextStep = payload.next_step ?? getFallbackNextStep(status);

  return (
    <>
      <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="shrink-0 rounded-xl bg-purple-100 p-2.5">
              <Users className="h-5 w-5 text-purple-600" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-gray-900">Group booking</p>
              <p className="mt-0.5 text-sm text-gray-500">
                {appointmentCount} appointment{appointmentCount === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", getStatusClasses(status))}>
            {getStatusLabel(status)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-gray-500">Date</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">
              {payload.appointment_date ? formatAppointmentDate(payload.appointment_date) : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Barber</p>
            <p className="mt-0.5 text-sm font-medium text-gray-900">
              {payload.barber_name ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className="mt-0.5 text-sm font-semibold text-gray-900">
              {payload.total_price != null && Number.isFinite(Number(payload.total_price))
                ? `₱${Number(payload.total_price).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : "—"}
            </p>
          </div>
        </div>

        {appointments.length > 0 && (
          <div className="space-y-2 border-t border-gray-100 pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Appointments</p>
            {appointments.map((appointment) => (
              <div key={appointment.appointment_id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {appointment.customer_name ?? "Customer"}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {appointment.service_name ?? "Barbershop service"}
                    </p>
                  </div>
                  <p className="shrink-0 font-mono text-xs font-medium text-blue-700">
                    {appointment.booking_id ?? formatBookingId(appointment.appointment_id)}
                  </p>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                  <span>{appointment.appointment_time ? formatTime12(appointment.appointment_time) : "—"}</span>
                  <span className="font-semibold text-gray-900">
                    {appointment.price != null && Number.isFinite(Number(appointment.price))
                      ? `₱${Number(appointment.price).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg bg-gray-50 p-3">
        <p className="mb-0.5 text-xs text-gray-500">Update</p>
        <p className="text-sm leading-6 text-gray-700">{getDisplayMessage(item)}</p>
      </div>

      {reason && (
        <div className="flex gap-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-orange-900">Reason for rejection</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-orange-800">
              {reason}
            </p>
          </div>
        </div>
      )}

      {nextStep && (
        <div className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <div>
            <p className="text-sm font-semibold text-blue-900">What happens next</p>
            <p className="mt-1 text-sm leading-5 text-blue-800">{nextStep}</p>
          </div>
        </div>
      )}
    </>
  );
}

export function Notification() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationItem | null>(null);
  const [loading, setLoading] = useState(true);
  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications],
  );

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("notifications:unread-updated", {
        detail: { unreadCount },
      }),
    );
  }, [unreadCount]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [notificationData] = await Promise.all([
        getNotifications(page),
      ]);

      setNotifications(notificationData.notifications);
      setTotalPages(notificationData.pagination.last_page);
    } catch (error) {
      console.error("Failed to load notifications:", error);
      toast.error("Could not load notifications. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openDetail = async (notification: NotificationItem) => {
    setSelectedNotification(notification);

    if (!notification.is_read) {
      try {
        await markNotificationAsRead(notification.id);
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notification.id
              ? {
                  ...item,
                  is_read: true,
                }
              : item,
          ),
        );
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    openDetail(item);
  };

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === notificationId
            ? {
                ...item,
                is_read: true,
              }
            : item,
        ),
      );
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
      toast.error("Could not mark notification as read.");
    }
  };

  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("Could not mark all notifications as read.");
    }
  };

  return (
    <div className="w-full h-fit bg-slate-100 p-4 sm:p-6 font-sans">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Notifications
          </h1>
          <p className="text-gray-500 mt-1">Your updates in one inbox</p>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={unreadCount === 0 || loading}
          onClick={handleMarkAllAsRead}
          className="gap-2"
        >
          <CheckCheck className="w-4 h-4" /> Mark all as read
        </Button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">


        {loading ? (
          <div className="p-4 text-sm text-gray-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No notifications yet.</div>
        ) : (
          <div className="space-y-3 p-3">
            {notifications.map((item) => {
              const isUnread = !item.is_read;
              const ticketId = getTicketId(item);
              const appointmentStatus =
                (getAppointmentId(item) || isGroupAppointmentNotificationPayload(item.payload))
                  ? getPayloadString(item.payload, "status")
                  : null;

              return (
                <div
                  key={item.id}
                  className={cn(
                    "relative overflow-hidden rounded-xl border transition-shadow hover:shadow-sm",
                    isUnread ? "bg-amber-50 border-amber-200" : "bg-white border-gray-200",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleNotificationClick(item)}
                    className="block w-full px-4 pb-10 pt-4 text-left"
                  >
                    <p
                      className={cn(
                        "pr-28 text-sm font-semibold",
                        isUnread ? "text-gray-900" : "text-gray-700",
                      )}
                    >
                      {item.title}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      {getDisplayMessage(item)}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 pr-36">
                      {item.appointment_id && (
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 font-mono text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
                          {formatBookingId(item.appointment_id)}
                        </span>
                      )}
                      {appointmentStatus && (
                        <span className={cn("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium", getStatusClasses(appointmentStatus))}>
                          {getStatusLabel(appointmentStatus)}
                        </span>
                      )}
                      {(item.type === "new_support_ticket" ||
                        item.type === "ticket_cancelled" ||
                        item.type === "ticket_promoted" ||
                        item.type === "ticket_resolved") &&
                        ticketId && (
                          <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 font-mono text-xs font-medium text-purple-700 ring-1 ring-inset ring-purple-200">
                            {formatTicketId(ticketId)}
                          </span>
                        )}
                    </div>
                  </button>

                  <div className="absolute right-3 top-3 z-10">
                    {isUnread ? (
                      <button
                        type="button"
                        onClick={() => handleMarkAsRead(item.id)}
                        className="rounded-full border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-700 shadow-sm transition-colors hover:bg-amber-100"
                      >
                        Mark as read
                      </button>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                        Read
                      </span>
                    )}
                  </div>

                  <p className="pointer-events-none absolute bottom-3 right-4 flex items-center gap-1.5 whitespace-nowrap text-xs text-gray-500">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDateTime(item.created_at)}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-500">
              Page {page} of {totalPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        )}

      </div>
      <div className="h-25" />

      <Dialog
        open={Boolean(selectedNotification)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedNotification(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              Notification Details
            </DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              {isGroupAppointmentNotificationPayload(selectedNotification.payload) ? (
                <GroupAppointmentNotificationDetails
                  item={selectedNotification}
                  payload={selectedNotification.payload}
                />
              ) : isAppointmentNotificationPayload(selectedNotification.payload) ? (
                <AppointmentNotificationDetails
                  item={selectedNotification}
                  payload={selectedNotification.payload}
                />
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Title</p>
                    <p className="text-sm font-medium text-gray-900">{selectedNotification.title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Message</p>
                    <p className="text-sm text-gray-700">{getDisplayMessage(selectedNotification)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Received</p>
                    <p className="text-sm text-gray-900">
                      {formatDateTime(selectedNotification.created_at)}
                    </p>
                  </div>

                </div>
              )}

              <div className="border-t border-gray-100 pt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedNotification(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
