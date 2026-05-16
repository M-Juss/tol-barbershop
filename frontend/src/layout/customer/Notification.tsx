"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCheck, Clock, Scissors, User } from "lucide-react";
import { toast } from "sonner";
import {
  decideReSchedule,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationItem,
  type ReScheduleItem,
  getReSchedules,
} from "@/services/re.schedule.api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

function getDecisionStyle(decision: ReScheduleItem["decision"]): string {
  if (decision === "accepted") return "bg-green-100 text-green-700 border-green-200";
  if (decision === "declined") return "bg-red-100 text-red-700 border-red-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
}

export function Notification() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [reschedules, setReschedules] = useState<ReScheduleItem[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<ReScheduleItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      const [notificationData, reScheduleData] = await Promise.all([
        getNotifications(),
        getReSchedules(),
      ]);

      setNotifications(notificationData.notifications);
      setReschedules(reScheduleData);
    } catch (error) {
      console.error("Failed to load notifications:", error);
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openSuggestion = async (notification: NotificationItem) => {
    const rescheduleId = Number(notification.payload?.reschedule_id);
    if (!Number.isFinite(rescheduleId)) {
      return;
    }

    const target = reschedules.find((item) => item.id === rescheduleId) ?? null;
    setSelectedSuggestion(target);

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

  const handleDecision = async (decision: "accepted" | "declined") => {
    if (!selectedSuggestion) return;

    try {
      setSaving(true);
      await decideReSchedule(selectedSuggestion.id, decision);
      toast.success(
        decision === "accepted"
          ? "Re-schedule accepted and appointment approved."
          : "Re-schedule declined and appointment cancelled.",
      );
      setSelectedSuggestion(null);
      await loadData();
    } catch (error) {
      console.error("Failed to apply re-schedule decision:", error);
      toast.error("Failed to apply re-schedule decision");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 font-sans">
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

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">


        {loading ? (
          <div className="p-6 text-sm text-gray-500">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-6 text-sm text-gray-500">No notifications yet.</div>
        ) : (
          <div>
            {notifications.map((item, index) => {
              const isReschedule = item.type === "reschedule_suggestion";
              const isUnread = !item.is_read;

              return (
                <div key={item.id}>
                  <div
                    className={`px-4 sm:px-5 py-4 transition-colors ${
                      isUnread
                        ? "bg-amber-50"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          isReschedule ? openSuggestion(item) : handleMarkAsRead(item.id)
                        }
                        className="text-left flex-1"
                      >
                        <p className={`text-sm font-semibold ${isUnread ? "text-gray-900" : "text-gray-700"}`}>
                          {item.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">{item.message}</p>
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {formatDateTime(item.created_at)}
                        </p>
                      </button>

                      <div className="flex items-center gap-2">
                        {isReschedule ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openSuggestion(item)}
                          >
                            View
                          </Button>
                        ) : null}

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
                    </div>
                  </div>
                  {index !== notifications.length - 1 ? (
                    <div className="h-px bg-gray-200" />
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog
        open={Boolean(selectedSuggestion)}
        onOpenChange={(open) => !open && setSelectedSuggestion(null)}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Re-schedule Suggestion</DialogTitle>
            <DialogDescription>Review the proposed appointment update.</DialogDescription>
          </DialogHeader>
          {selectedSuggestion && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-2 text-sm">
              <div className="pb-2">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${getDecisionStyle(selectedSuggestion.decision)}`}
                >
                  {selectedSuggestion.decision === "accepted"
                    ? "Accepted"
                    : selectedSuggestion.decision === "declined"
                      ? "Declined"
                      : "Pending Response"}
                </span>
              </div>
              <p className="flex items-center gap-2"><Scissors className="w-4 h-4 text-gray-500" />Service: {selectedSuggestion.service_name}</p>
              <p className="flex items-center gap-2"><User className="w-4 h-4 text-gray-500" />Barber: {selectedSuggestion.barber_name}</p>
              <p>Suggested date: {selectedSuggestion.appointment_date}</p>
              <p>Suggested time: {selectedSuggestion.appointment_time}</p>
              <p>Reason: {selectedSuggestion.reason || "No reason provided"}</p>
              <p>Notes: {selectedSuggestion.notes || "No notes"}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSuggestion(null)}>
              Close
            </Button>
            <Button
              variant="outline"
              className="border-red-300 bg-red-50 text-red-700 hover:bg-red-100 font-semibold"
              disabled={saving || selectedSuggestion?.decision !== "pending"}
              onClick={() => handleDecision("declined")}
            >
              Decline
            </Button>
            <Button
              className="bg-green-600 text-white hover:bg-green-700 font-semibold"
              disabled={saving || selectedSuggestion?.decision !== "pending"}
              onClick={() => handleDecision("accepted")}
            >
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
