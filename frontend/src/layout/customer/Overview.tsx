"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Settings,
  CalendarPlus,
  Star,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { StatCard } from "@/components/common/StatCard";
import { AppointmentCardCustomer } from "@/components/common/AppointmentCardCustomer";
import {
  getAppointments,
  type Appointment,
} from "@/services/customer/appointment.api";
import {
  getPendingFeedback,
  submitAppointmentFeedback,
  type PendingFeedbackItem,
} from "@/services/customer/feedback.api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type UiAppointment = {
  id: number;
  service: string;
  barber: string;
  price: number;
  status: "Approved";
  date: string;
  time: string;
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function Overview() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const [pendingFeedbackList, setPendingFeedbackList] = useState<
    PendingFeedbackItem[]
  >([]);
  const [currentFeedbackIndex, setCurrentFeedbackIndex] = useState(0);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const currentFeedback = pendingFeedbackList[currentFeedbackIndex] ?? null;

  const handleSubmitFeedback = useCallback(async () => {
    if (!currentFeedback) return;

    if (feedbackRating < 1) {
      toast.error("Please select a rating");
      return;
    }

    try {
      setSubmittingFeedback(true);
      await submitAppointmentFeedback({
        appointment_id: currentFeedback.appointment_id,
        rating: feedbackRating,
        comment: feedbackComment.trim() || null,
      });

      if (currentFeedbackIndex < pendingFeedbackList.length - 1) {
        setCurrentFeedbackIndex((i) => i + 1);
        setFeedbackRating(0);
        setFeedbackComment("");
      } else {
        setPendingFeedbackList([]);
        setCurrentFeedbackIndex(0);
        setFeedbackRating(0);
        setFeedbackComment("");
        toast.success("Thank you for your feedback!");
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      toast.error("Failed to submit feedback");
    } finally {
      setSubmittingFeedback(false);
    }
  }, [currentFeedback, currentFeedbackIndex, pendingFeedbackList.length, feedbackRating, feedbackComment]);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const currentUserId = authUser?.id;
        if (!currentUserId) {
          setAppointments([]);
          return;
        }

        const data = await getAppointments();
        const userAppointments = data.filter(
          (appointment) => appointment.customer.id === currentUserId,
        );

        setAppointments(userAppointments);
      } catch (error) {
        console.error("Failed to load appointments:", error);
        toast.error("Failed to load appointments");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, []);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const currentUserId = authUser?.id;
        if (!currentUserId) {
          setAppointments([]);
          return;
        }
        const data = await getAppointments();
        const userAppointments = data.filter(
          (appointment) => appointment.customer.id === currentUserId,
        );
        setAppointments(userAppointments);
      } catch (error) {
        console.error("Failed to load appointments:", error);
      }
    };

    const interval = setInterval(fetchAppointments, 30000);
    return () => clearInterval(interval);
  }, [authUser?.id]);

  useEffect(() => {
    if (!authUser) return;

    const fetchPending = async () => {
      try {
        const items = await getPendingFeedback();
        setPendingFeedbackList(items);
        if (items.length > 0) {
          setFeedbackRating(0);
          setFeedbackComment("");
        }
      } catch (error) {
        console.error("Failed to load pending feedback:", error);
      }
    };

    fetchPending();
  }, [authUser]);

  const completedCount = useMemo(
    () => appointments.filter((appointment) => appointment.status === "completed").length,
    [appointments],
  );

  const approvedCount = useMemo(
    () => appointments.filter((appointment) => appointment.status === "approved").length,
    [appointments],
  );

  const pendingCount = useMemo(
    () => appointments.filter((appointment) => appointment.status === "pending").length,
    [appointments],
  );

  const totalSpent = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.status === "completed")
        .reduce((sum, appointment) => sum + (Number(appointment.price) || 0), 0),
    [appointments],
  );

  const approvedAppointments: UiAppointment[] = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.status === "approved")
        .map((appointment) => ({
          id: appointment.id,
          service: appointment.service.name ?? "Unknown service",
          barber: appointment.barber.fullname ?? "Unknown barber",
          price: Number(appointment.price) || 0,
          status: "Approved",
          date: formatDate(appointment.appointment_date),
          time: formatTime(appointment.appointment_time),
        })),
    [appointments],
  );

  return (
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 pb-24 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Overview</h1>
        <p className="text-gray-500 mt-1">
          Welcome back! Here&apos;s your appointment summary.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <StatCard
          label="Completed"
          value={String(completedCount)}
          icon={CheckCircle2}
          iconContainerClassName="bg-green-100"
          iconClassName="text-green-500"
        />
        <StatCard
          label="Upcoming"
          value={String(approvedCount)}
          icon={CalendarDays}
          iconContainerClassName="bg-blue-100"
          iconClassName="text-blue-500"
        />
        <StatCard
          label="Pending"
          value={String(pendingCount)}
          icon={Clock}
          iconContainerClassName="bg-yellow-100"
          iconClassName="text-yellow-500"
        />
        <StatCard
          label="Total Spent"
          value={`₱${totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Wallet}
          iconContainerClassName="bg-purple-100"
          iconClassName="text-purple-500"
        />
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-4">
        <h2 className="text-base font-bold text-gray-900">Upcoming Appointments</h2>
        <p className="text-gray-500 text-sm mb-4">Your approved appointments</p>

        {loading ? (
          <div className="rounded-lg p-8 text-center text-gray-400 border border-gray-100">
            Loading appointments...
          </div>
        ) : approvedAppointments.length === 0 ? (
          <div className="rounded-lg p-8 text-center text-gray-400 border border-gray-100">
            No approved appointments right now.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {approvedAppointments.map((appointment) => (
              <AppointmentCardCustomer
                key={appointment.id}
                service={appointment.service}
                barber={appointment.barber}
                price={appointment.price}
                status={appointment.status}
                date={appointment.date}
                time={appointment.time}
              />
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-base font-bold text-gray-900">Quick Actions</h2>
        <p className="text-gray-500 text-sm mb-4">
          Manage your account and appointments
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => router.push("/customer/appointment")}
            className="bg-red-500 hover:bg-red-600 transition-colors rounded-xl px-5 py-4 flex items-center gap-4 text-left"
          >
            <div className="bg-red-400 rounded-lg p-2">
              <CalendarPlus className="text-white w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <p className="text-white font-bold text-sm">New Appointment</p>
              <p className="text-red-100 text-xs mt-0.5">Book your next visit</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => router.push("/customer/profile")}
            className="bg-slate-800 hover:bg-slate-700 transition-colors rounded-xl px-5 py-4 flex items-center gap-4 text-left"
          >
            <div className="bg-slate-600 rounded-lg p-2">
              <Settings className="text-white w-5 h-5" strokeWidth={2} />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Profile Settings</p>
              <p className="text-slate-400 text-xs mt-0.5">Update your information</p>
            </div>
          </button>
        </div>
      </div>

      <Dialog
        open={pendingFeedbackList.length > 0}
        onOpenChange={() => {}}
      >
        <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-3xl p-6 sm:max-w-[560px] sm:p-8" showCloseButton={false}>
          <DialogHeader className="items-center gap-4 text-center">
            <DialogTitle className="text-3xl font-bold text-primary sm:text-4xl">
              Rate your TOLS Barbershop booking
            </DialogTitle>
            <DialogDescription className="max-w-md text-base leading-7 text-gray-600">
              {currentFeedback?.service_name ?? "Your barbershop service"} is completed.
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
              htmlFor="overview-feedback-comment"
              className="text-sm font-medium text-gray-700"
            >
              Your feedback (optional)
            </label>
            <Textarea
              id="overview-feedback-comment"
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
    </div>
  );
}
