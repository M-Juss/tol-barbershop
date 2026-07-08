"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCheck, Clock, Scissors, User } from "lucide-react";
import { formatBookingId, formatTicketId } from "@/lib/booking";
import { toast } from "sonner";
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationItem,
} from "@/services/notification.api";
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

function isAppointmentStatusPayload(
  payload: Record<string, unknown> | null | undefined,
): payload is {
  appointment_id: number;
  status: string;
  service_name?: string;
  barber_name?: string;
  appointment_date?: string;
  appointment_time?: string;
  price?: number;
} {
  if (!payload) return false;
  return (
    typeof payload.appointment_id !== "undefined" &&
    typeof payload.status === "string"
  );
}

function formatAppointmentDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAppointmentTime(value: string): string {
  const [hours, minutes] = value.split(":").map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
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
      toast.error("Failed to load notifications");
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
      toast.error("Failed to mark notification as read");
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
      toast.error("Failed to mark all notifications as read");
    }
  };

  return (
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 pb-24 font-sans">
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

              return (
                <div
                  key={item.id}
                  className={`rounded-xl border transition-shadow hover:shadow-sm ${
                    isUnread
                      ? "bg-amber-50 border-amber-200"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="px-4 py-3">
                    <div className="flex items-stretch justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(item)}
                        className="text-left flex-1"
                      >
                        <p className={`text-sm font-semibold ${isUnread ? "text-gray-900" : "text-gray-700"}`}>
                          {item.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.message}</p>
                        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                          {item.appointment_id && (
                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-mono font-medium text-blue-700 ring-1 ring-inset ring-blue-200">
                              {formatBookingId(item.appointment_id)}
                            </span>
                          )}
                          {(item.type === "new_support_ticket" ||
                            item.type === "ticket_cancelled" ||
                            item.type === "ticket_promoted" ||
                            item.type === "ticket_resolved") &&
                            (item.payload as { ticket_id?: number })?.ticket_id && (
                              <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-mono font-medium text-purple-700 ring-1 ring-inset ring-purple-200">
                                {formatTicketId((item.payload as { ticket_id: number }).ticket_id)}
                              </span>
                            )}
                        </div>
                      </button>

                      <div className="flex flex-col items-end justify-between shrink-0">
                        <div className="flex items-center gap-2">
                          {isUnread ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsRead(item.id)}
                            >
                              Mark read
                            </Button>
                          ) : (
                            <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                              Read
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {formatDateTime(item.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
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

      <Dialog
        open={Boolean(selectedNotification)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedNotification(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              Notification Details
            </DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              {selectedNotification.type === "appointment_status" &&
              isAppointmentStatusPayload(selectedNotification.payload) ? (
                <>
                  <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3 shadow-sm">
                    <div className="flex items-start gap-3 pb-2 border-b border-gray-100">
                      <div className="bg-blue-100 rounded-xl p-2.5 shrink-0">
                        <Scissors className="text-blue-500 w-5 h-5" strokeWidth={2} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-base">
                          {selectedNotification.payload.service_name ?? "Barbershop Service"}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {formatBookingId(selectedNotification.payload.appointment_id)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2.5 text-sm text-gray-700">
                        <User className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="font-medium">Barber:</span>
                        <span>{selectedNotification.payload.barber_name ?? "—"}</span>
                      </div>

                      {selectedNotification.payload.appointment_date && (
                        <div className="flex items-center gap-2.5 text-sm text-gray-700">
                          <CalendarDays className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="font-medium">Date:</span>
                          <span>{formatAppointmentDate(selectedNotification.payload.appointment_date)}</span>
                        </div>
                      )}

                      {selectedNotification.payload.appointment_time && (
                        <div className="flex items-center gap-2.5 text-sm text-gray-700">
                          <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="font-medium">Time:</span>
                          <span>{formatAppointmentTime(selectedNotification.payload.appointment_time)}</span>
                        </div>
                      )}

                      {selectedNotification.payload.price != null && (
                        <div className="flex items-center gap-2.5 text-sm text-gray-700">
                          <span className="w-4 h-4 shrink-0" />
                          <span className="font-medium">Price:</span>
                          <span className="font-semibold text-gray-900">
                            ₱{Number(selectedNotification.payload.price).toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-400 mb-0.5">Message</p>
                    <p className="text-sm text-gray-700">{selectedNotification.message}</p>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Title</p>
                    <p className="text-sm font-medium text-gray-900">{selectedNotification.title}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Message</p>
                    <p className="text-sm text-gray-700">{selectedNotification.message}</p>
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
