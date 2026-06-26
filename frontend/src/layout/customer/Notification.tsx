"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCheck, Clock, Scissors, Star, User } from "lucide-react";
import { formatBookingId } from "@/lib/booking";
import { toast } from "sonner";
import {
  // [RESCHEDULE] decideReSchedule,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  type NotificationItem,
  // [RESCHEDULE] type ReScheduleItem,
  // [RESCHEDULE] getReSchedules,
} from "@/services/re.schedule.api";
import { submitAppointmentFeedback } from "@/services/customer/feedback.api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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

// [RESCHEDULE] function getDecisionStyle(decision: ReScheduleItem["decision"]): string {
// [RESCHEDULE]   if (decision === "accepted") return "bg-green-100 text-green-700 border-green-200";
// [RESCHEDULE]   if (decision === "declined") return "bg-red-100 text-red-700 border-red-200";
// [RESCHEDULE]   return "bg-amber-100 text-amber-700 border-amber-200";
// [RESCHEDULE] }

function getPayloadNumber(
  notification: NotificationItem | null,
  key: string,
): number | null {
  const value = notification?.payload?.[key];
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function getPayloadString(
  notification: NotificationItem | null,
  key: string,
): string | null {
  const value = notification?.payload?.[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

function getStatusStyle(status: string): string {
  const s = status.toLowerCase();
  if (s === "approved") return "bg-blue-100 text-blue-700 border-blue-200";
  if (s === "pending") return "bg-yellow-100 text-yellow-700 border-yellow-200";
  if (s === "completed") return "bg-green-100 text-green-700 border-green-200";
  if (s === "cancelled") return "bg-red-100 text-red-700 border-red-200";
  if (s === "no_show") return "bg-gray-200 text-gray-700 border-gray-300";
  return "bg-gray-100 text-gray-600 border-gray-200";
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
  // [RESCHEDULE] const [reschedules, setReschedules] = useState<ReScheduleItem[]>([]);
  // [RESCHEDULE] const [selectedSuggestion, setSelectedSuggestion] =
  // [RESCHEDULE]   useState<ReScheduleItem | null>(null);
  const [selectedFeedbackNotification, setSelectedFeedbackNotification] =
    useState<NotificationItem | null>(null);
  const [selectedNotification, setSelectedNotification] =
    useState<NotificationItem | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [loading, setLoading] = useState(true);
  // [RESCHEDULE] const [saving, setSaving] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

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
        // [RESCHEDULE] getReSchedules(),
      ]);

      setNotifications(notificationData.notifications);
      setTotalPages(notificationData.pagination.last_page);
      // [RESCHEDULE] setReschedules(reScheduleData);
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

  // [RESCHEDULE] const openSuggestion = async (notification: NotificationItem) => {
  // [RESCHEDULE]   const rescheduleId = Number(notification.payload?.reschedule_id);
  // [RESCHEDULE]   if (!Number.isFinite(rescheduleId)) {
  // [RESCHEDULE]     return;
  // [RESCHEDULE]   }
  // [RESCHEDULE]
  // [RESCHEDULE]   const target = reschedules.find((item) => item.id === rescheduleId) ?? null;
  // [RESCHEDULE]   setSelectedSuggestion(target);
  // [RESCHEDULE]
  // [RESCHEDULE]   if (!notification.is_read) {
  // [RESCHEDULE]     try {
  // [RESCHEDULE]       await markNotificationAsRead(notification.id);
  // [RESCHEDULE]       setNotifications((prev) =>
  // [RESCHEDULE]         prev.map((item) =>
  // [RESCHEDULE]           item.id === notification.id
  // [RESCHEDULE]             ? {
  // [RESCHEDULE]                 ...item,
  // [RESCHEDULE]                 is_read: true,
  // [RESCHEDULE]               }
  // [RESCHEDULE]             : item,
  // [RESCHEDULE]         ),
  // [RESCHEDULE]       );
  // [RESCHEDULE]     } catch (error) {
  // [RESCHEDULE]       console.error("Failed to mark notification as read:", error);
  // [RESCHEDULE]     }
  // [RESCHEDULE]   }
  // [RESCHEDULE] };

  const openFeedback = async (notification: NotificationItem) => {
    setSelectedFeedbackNotification(notification);
    setFeedbackRating(0);
    setFeedbackComment("");

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

  // [RESCHEDULE] const handleDecision = async (decision: "accepted" | "declined") => {
  // [RESCHEDULE]   if (!selectedSuggestion) return;
  // [RESCHEDULE]
  // [RESCHEDULE]   try {
  // [RESCHEDULE]     setSaving(true);
  // [RESCHEDULE]     await decideReSchedule(selectedSuggestion.id, decision);
  // [RESCHEDULE]     toast.success(
  // [RESCHEDULE]       decision === "accepted"
  // [RESCHEDULE]         ? "Re-schedule accepted and appointment approved."
  // [RESCHEDULE]         : "Re-schedule declined and appointment cancelled.",
  // [RESCHEDULE]     );
  // [RESCHEDULE]     setSelectedSuggestion(null);
  // [RESCHEDULE]     await loadData();
  // [RESCHEDULE]   } catch (error) {
  // [RESCHEDULE]     console.error("Failed to apply re-schedule decision:", error);
  // [RESCHEDULE]     toast.error("Failed to apply re-schedule decision");
  // [RESCHEDULE]   } finally {
  // [RESCHEDULE]     setSaving(false);
  // [RESCHEDULE]   }
  // [RESCHEDULE] };

  const handleSubmitFeedback = async () => {
    const appointmentId = getPayloadNumber(
      selectedFeedbackNotification,
      "appointment_id",
    );

    if (!appointmentId) {
      toast.error("Missing appointment details for this feedback request");
      return;
    }

    if (feedbackRating < 1) {
      toast.error("Please select a rating");
      return;
    }

    try {
      setSubmittingFeedback(true);
      await submitAppointmentFeedback({
        appointment_id: appointmentId,
        rating: feedbackRating,
        comment: feedbackComment.trim() || null,
      });
      toast.success("Thank you for your feedback");
      setSelectedFeedbackNotification(null);
      setFeedbackRating(0);
      setFeedbackComment("");
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      toast.error("Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const selectedFeedbackService = getPayloadString(
    selectedFeedbackNotification,
    "service_name",
  );

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
              // [RESCHEDULE] const isReschedule = item.type === "reschedule_suggestion";
              const isFeedbackRequest = item.type === "appointment_feedback_request";
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
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => handleNotificationClick(item)}
                        className="text-left flex-1"
                      >
                        <p className={`text-sm font-semibold ${isUnread ? "text-gray-900" : "text-gray-700"}`}>
                          {item.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.message}</p>
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {formatDateTime(item.created_at)}
                        </p>
                      </button>

                      <div className="flex items-center gap-2">
                        {/* [RESCHEDULE]
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
                        */}

                        {isFeedbackRequest ? (
                          <Button
                            type="button"
                            size="sm"
                            className="bg-primary text-white hover:bg-primary/90"
                            onClick={() => openFeedback(item)}
                          >
                            Feedback
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

      {/* [RESCHEDULE]
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
      */}

      <Dialog
        open={Boolean(selectedFeedbackNotification)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedFeedbackNotification(null);
          }
        }}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl p-6 sm:max-w-[560px] sm:p-8">
          <DialogHeader className="items-center gap-4 text-center">
            <DialogTitle className="text-3xl font-bold text-primary sm:text-4xl">
              Rate your TOLS Barbershop booking
            </DialogTitle>
            <DialogDescription className="max-w-md text-base leading-7 text-gray-600">
              Your {selectedFeedbackService ?? "barbershop service"} is completed.
              Please rate your satisfaction and leave feedback below.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-center gap-3 py-5">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                className="rounded-full p-1 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                onClick={() => setFeedbackRating(rating)}
                aria-label={`Rate ${rating} star${rating === 1 ? "" : "s"}`}
              >
                <Star
                  className={`size-9 sm:size-11 ${
                    rating <= feedbackRating
                      ? "fill-accent text-accent"
                      : "fill-white text-gray-300"
                  }`}
                  strokeWidth={1.8}
                />
              </button>
            ))}
          </div>

          <div className="h-px bg-gray-200" />

          <div className="space-y-2 pt-2">
            <label
              htmlFor="appointment-feedback-comment"
              className="text-sm font-medium text-gray-700"
            >
              Your feedback (optional)
            </label>
            <Textarea
              id="appointment-feedback-comment"
              value={feedbackComment}
              onChange={(event) => setFeedbackComment(event.target.value)}
              maxLength={300}
              placeholder="Tell us about your barber service experience"
              className="min-h-32 resize-none border-gray-100 bg-gray-50 text-base shadow-none focus-visible:ring-primary/20"
            />
            <p className="text-xs text-gray-400">
              Max 300 characters - {feedbackComment.length}/300
            </p>
          </div>

          <div className="space-y-4 pt-4">
            <Button
              type="button"
              size="lg"
              className="h-12 w-full bg-primary text-base font-bold uppercase tracking-wide text-white hover:bg-primary/90"
              disabled={submittingFeedback || feedbackRating === 0}
              onClick={handleSubmitFeedback}
            >
              {submittingFeedback ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Type</p>
                      <p className="text-sm capitalize text-gray-900">
                        {selectedNotification.type.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <p className="text-sm text-gray-900">
                        {selectedNotification.is_read ? "Read" : "Unread"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">Received</p>
                      <p className="text-sm text-gray-900">
                        {formatDateTime(selectedNotification.created_at)}
                      </p>
                    </div>
                  </div>


                </div>
              )}

              <div className="border-t border-gray-100 pt-3 flex gap-2">
                {/* [RESCHEDULE]
                {selectedNotification.type === "reschedule_suggestion" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      openSuggestion(selectedNotification);
                    }}
                  >
                    View Suggestion
                  </Button>
                )}
                */}
                {selectedNotification.type === "appointment_feedback_request" && (
                  <Button
                    size="sm"
                    className="flex-1 bg-primary text-white hover:bg-primary/90"
                    onClick={() => {
                      openFeedback(selectedNotification);
                    }}
                  >
                    Give Feedback
                  </Button>
                )}
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
