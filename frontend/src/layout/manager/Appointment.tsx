"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Clock,
  User,
  Mail,
  Phone,
  MoreVertical,
  Check,
  X,
  CheckCircle2,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePickerWithLabel } from "@/components/common/DatePickerWithLabel";
import { SelectWithLabel } from "@/components/common/SelectWithLabel";
import { SectionCard } from "@/components/common/SectionCard";
// [RESCHEDULE] import { ReScheduleTable } from "@/components/common/ReScheduleTable";
import {
  getAppointments,
  getActiveBarbers,
  getActiveServices,
  updateAppointment,
  type Appointment,
  type Barber,
  type Service,
} from "@/services/customer/appointment.api";
import { updateAppointmentSchema } from "@/validations/appointment.validation";
import { CancellationForm } from "@/forms/CancellationForm";
import { type CancellationReasonSchemaFormValues } from "@/validations/appointment.validation";
// [RESCHEDULE] import {
// [RESCHEDULE]   createReSchedule,
// [RESCHEDULE]   getReSchedules,
// [RESCHEDULE]   type ReScheduleItem,
// [RESCHEDULE] } from "@/services/re.schedule.api";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

type DateGroup = {
  label: string;
  sortKey: string;
  appointments: Appointment[];
};

const timeOptions = [
  { value: "9:00 AM", label: "9:00 AM" },
  { value: "10:00 AM", label: "10:00 AM" },
  { value: "11:00 AM", label: "11:00 AM" },
  { value: "12:00 PM", label: "12:00 PM" },
  { value: "1:00 PM", label: "1:00 PM" },
  { value: "2:00 PM", label: "2:00 PM" },
  { value: "3:00 PM", label: "3:00 PM" },
  { value: "4:00 PM", label: "4:00 PM" },
  { value: "5:00 PM", label: "5:00 PM" },
  { value: "6:00 PM", label: "6:00 PM" },
  { value: "7:00 PM", label: "7:00 PM" },
];

// const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID;
// const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID;
// const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY;

function formatDateLabel(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time24: string): string {
  const [hours, minutes] = normalizeToHHmm(time24).split(":").map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function normalizeToHHmm(time: string): string {
  const match = time.match(/^(\d{2}):(\d{2})/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }

  const date = new Date(`1970-01-01T${time}`);
  if (!Number.isNaN(date.getTime())) {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  return time;
}

function convert12HourTo24Hour(value: string): string {
  const match = value.match(/^(\d{1,2}):([0-5]\d)\s(AM|PM)$/i);
  if (!match) return value;

  const rawHours = Number(match[1]);
  const minutes = match[2];
  const period = match[3].toUpperCase();
  let hours = rawHours % 12;
  if (period === "PM") {
    hours += 12;
  }

  return `${hours.toString().padStart(2, "0")}:${minutes}`;
}

function convert24HourTo12Hour(value: string): string {
  const match = value.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!match) return value;

  const hours24 = Number(match[1]);
  const minutes = match[2];
  const period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${minutes} ${period}`;
}

function formatDateForApi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeApiDate(value: string): string {
  if (!value) return value;
  const base = value.includes("T") ? value.split("T")[0] : value;
  const parsed = new Date(base);
  if (Number.isNaN(parsed.getTime())) return base;
  return formatDateForApi(parsed);
}

// async function sendAppointmentStatusEmail(
//   appt: Appointment,
//   status: "approved" | "cancelled",
//   cancellationReason?: string,
// ) {
//   if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
//     console.warn(
//       "EmailJS env vars are incomplete. Expected NEXT_PUBLIC_EMAILJS_SERVICE_ID, NEXT_PUBLIC_EMAILJS_TEMPLATE_ID, and NEXT_PUBLIC_EMAILJS_PUBLIC_KEY.",
//     );
//     return;
//   }
//
//   const isApproved = status === "approved";
//   const message = isApproved
//     ? "Please arrive 5 minutes before the said time."
//     : cancellationReason?.trim() || appt.cancellation_reason || "Cancelled by the manager.";
//
//   const templateParams = {
//     title: isApproved
//       ? "Appointment Approved"
//       : "Appointment Cancelled",
//     customer_name: appt.customer.fullname || "Customer",
//     service: appt.service.name || "N/A",
//     barber: appt.barber.fullname || "N/A",
//     appointment_date: formatShortDate(appt.appointment_date),
//     appointment_time: formatTime(appt.appointment_time),
//     booking_id: String(appt.id),
//     message,
//     status,
//     email: appt.customer.email || "",
//   };
//
//   const response = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       service_id: EMAILJS_SERVICE_ID,
//       template_id: EMAILJS_TEMPLATE_ID,
//       user_id: EMAILJS_PUBLIC_KEY,
//       template_params: templateParams,
//     }),
//   });
//
//   if (!response.ok) {
//     const errorText = await response.text();
//     throw new Error(`Email send failed: ${errorText}`);
//   }
// }

const todayDate = new Date().toISOString().split("T")[0];

function ActionMenu({
  onSelect,
  onCancel,
  disabled,
}: {
  onSelect: (action: "completed" | "no_show") => void;
  onCancel?: () => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="p-1.5 rounded-lg hover:bg-gray-100 transition text-gray-400"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-10 w-40 bg-white rounded-xl border border-gray-200 shadow-lg py-1 text-sm">
          <button
            onClick={() => {
              if (disabled) return;
              onSelect("completed");
              setOpen(false);
            }}
            disabled={disabled}
            title={
              disabled
                ? "Can only mark as completed on or after the appointment date"
                : undefined
            }
            className={`flex items-center gap-2 w-full px-3 py-2 text-left ${
              disabled
                ? "text-gray-400 cursor-not-allowed"
                : "hover:bg-gray-50 text-gray-700"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-green-500" /> Completed
          </button>
          <button
            onClick={() => {
              if (disabled) return;
              onSelect("no_show");
              setOpen(false);
            }}
            disabled={disabled}
            title={
              disabled
                ? "Can only mark as no-show on or after the appointment date"
                : undefined
            }
            className={`flex items-center gap-2 w-full px-3 py-2 text-left ${
              disabled
                ? "text-gray-400 cursor-not-allowed"
                : "hover:bg-gray-50 text-gray-700"
            }`}
          >
            <UserX className="w-4 h-4 text-red-400" /> No-show
          </button>
          {onCancel && (
            <button
              onClick={() => {
                onCancel();
                setOpen(false);
              }}
              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 text-gray-700"
            >
              <X className="w-4 h-4 text-red-500" /> Cancel
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AppointmentRow({
  appt,
  onStatusChange,
  onCancel,
  className = "",
}: {
  appt: Appointment;
  onStatusChange: (appt: Appointment, status: "completed" | "no_show") => void;
  onCancel?: (appt: Appointment) => void;
  className?: string;
}) {
  const actionDisabled = appt.appointment_date > todayDate;
  return (
    <div className={`flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 ${className}`}>
      <div className="flex flex-col gap-1 min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 shrink-0">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-gray-900 text-sm">
              {formatTime(appt.appointment_time)}
            </span>
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <User className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="font-semibold text-gray-900 text-sm truncate">
              {appt.customer.fullname}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500 truncate">
          Service: {appt.service.name}
          <span className="mx-2 text-gray-300">•</span>
          Barber: {appt.barber.fullname}
        </p>
      </div>
      <ActionMenu
        onSelect={(status) => onStatusChange(appt, status)}
        onCancel={() => onCancel?.(appt)}
        disabled={actionDisabled}
      />
    </div>
  );
}

function PendingCard({
  req,
  onApprove,
  onCancel,
  // [RESCHEDULE] onReschedule,
  disabled = false,
}: {
  req: Appointment;
  onApprove: (appt: Appointment) => void;
  onCancel: (appt: Appointment) => void;
  // [RESCHEDULE] onReschedule: (appt: Appointment) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <User className="w-4 h-4 text-gray-400" />
        <span className="font-semibold text-gray-900 text-sm">
          {req.customer.fullname}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Mail className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-500">{req.customer.email}</span>
      </div>
      <div className="flex items-center gap-1.5 mb-3">
        <Phone className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-500">
          {req.customer.contact_number}
        </span>
      </div>
      <div className="border-t border-yellow-200 mb-3" />
      <div className="text-xs text-gray-600 space-y-0.5 mb-4">
        <p>
          <span className="font-medium text-gray-800">Service:</span>{" "}
          {req.service.name}
        </p>
        <p>
          <span className="font-medium text-gray-800">Barber:</span>{" "}
          {req.barber.fullname}
        </p>
        <p>
          <span className="font-medium text-gray-800">Date:</span>{" "}
          {formatShortDate(req.appointment_date)}
        </p>
        <p>
          <span className="font-medium text-gray-800">Time:</span>{" "}
          {formatTime(req.appointment_time)}
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => onApprove(req)}
            disabled={disabled}
            className="bg-green-600 hover:bg-green-700 text-white gap-1.5 text-sm h-9"
          >
            <Check className="w-4 h-4" /> Approve
          </Button>
          <Button
            onClick={() => onCancel(req)}
            disabled={disabled}
            className="bg-red-500 hover:bg-red-600 text-white gap-1.5 text-sm h-9"
          >
            <X className="w-4 h-4" /> Reject
          </Button>
        </div>
        {/* [RESCHEDULE]
        <Button
          onClick={() => onReschedule(req)}
          disabled={disabled}
          variant="outline"
          className="gap-1.5 text-sm h-9 w-full"
        >
          Re-schedule
        </Button>
        */}
      </div>
    </div>
  );
}

function toDateGroups(appointments: Appointment[]): DateGroup[] {
  const grouped = appointments.reduce<Record<string, Appointment[]>>(
    (acc, appt) => {
      const key = appt.appointment_date;
      if (!acc[key]) acc[key] = [];
      acc[key].push(appt);
      return acc;
    },
    {},
  );

  return Object.entries(grouped)
    .map(([sortKey, appts]) => ({
      label: formatDateLabel(sortKey),
      sortKey,
      appointments: [...appts].sort((a, b) =>
        a.appointment_time.localeCompare(b.appointment_time),
      ),
    }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

export function Appointment() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  // [RESCHEDULE] const [rescheduleSuggestions, setRescheduleSuggestions] = useState<
  // [RESCHEDULE]   ReScheduleItem[]
  // [RESCHEDULE] >([]);
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<number[]>([]);
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  // [RESCHEDULE] const [rescheduleOpen, setRescheduleOpen] = useState(false);
  // [RESCHEDULE] const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  // [RESCHEDULE] const [selectedService, setSelectedService] = useState("");
  // [RESCHEDULE] const [selectedBarber, setSelectedBarber] = useState("");
  // [RESCHEDULE] const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  // [RESCHEDULE] const [selectedTime, setSelectedTime] = useState("");
  // [RESCHEDULE] const [notes, setNotes] = useState("");
  // [RESCHEDULE] const [rescheduleReason, setRescheduleReason] = useState("");
  // [RESCHEDULE] const [unavailableTimes, setUnavailableTimes] = useState<string[]>([]);
  // [RESCHEDULE] const [savingReschedule, setSavingReschedule] = useState(false);
  const [approvedPage, setApprovedPage] = useState(1);
  const [pastDueOpen, setPastDueOpen] = useState(false);
  const approvedPageSize = 10;
  const [confirmActionOpen, setConfirmActionOpen] = useState(false);
  const [confirmActionTarget, setConfirmActionTarget] = useState<{
    appt: Appointment;
    status: "completed" | "no_show";
  } | null>(null);

  const loadAppointments = async () => {
    try {
      const data = await getAppointments();
      setAppointments(data);
    } catch (error) {
      console.error("Failed to load appointments:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMeta = async () => {
    try {
      const [barberData, serviceData] = await Promise.all([
        getActiveBarbers(),
        getActiveServices(),
      ]);
      setBarbers(barberData.filter((b) => b.is_active));
      setServices(serviceData.filter((s) => s.is_active));
    } catch (error) {
      console.error("Failed to load metadata:", error);
    }
  };

  // [RESCHEDULE] const loadReScheduleSuggestions = async () => {
  // [RESCHEDULE]   try {
  // [RESCHEDULE]     const data = await getReSchedules();
  // [RESCHEDULE]     setRescheduleSuggestions(data);
  // [RESCHEDULE]   } catch (error) {
  // [RESCHEDULE]     console.error("Failed to load re-schedule suggestions:", error);
  // [RESCHEDULE]   }
  // [RESCHEDULE] };

  useEffect(() => {
    loadAppointments();
    loadMeta();
    // [RESCHEDULE] loadReScheduleSuggestions();
  }, []);

  useEffect(() => {
    const interval = setInterval(loadAppointments, 30000);
    return () => clearInterval(interval);
  }, []);

  const pending = useMemo(
    () => appointments.filter((a) => a.status === "pending"),
    [appointments],
  );

  const approvedAppointments = useMemo(
    () => appointments.filter((a) => a.status === "approved"),
    [appointments],
  );

  const today = new Date().toISOString().split("T")[0];

  const upcomingApproved = useMemo(
    () => approvedAppointments.filter((a) => a.appointment_date >= today),
    [approvedAppointments, today],
  );

  const pastDueApproved = useMemo(
    () => approvedAppointments.filter((a) => a.appointment_date < today),
    [approvedAppointments, today],
  );

  const upcomingGroups = useMemo(
    () => toDateGroups(upcomingApproved),
    [upcomingApproved],
  );

  const pastDueGroups = useMemo(
    () => toDateGroups(pastDueApproved),
    [pastDueApproved],
  );

  const approvedTotalPages = Math.max(1, Math.ceil(upcomingApproved.length / approvedPageSize));

  const paginatedApprovedGroups = useMemo(() => {
    const start = (approvedPage - 1) * approvedPageSize;
    const paginated = upcomingApproved.slice(start, start + approvedPageSize);
    return toDateGroups(paginated);
  }, [upcomingApproved, approvedPage]);

  // [RESCHEDULE] useEffect(() => {
  // [RESCHEDULE]   const fetchUnavailableTimes = async () => {
  // [RESCHEDULE]     if (!selectedBarber || !selectedDate) {
  // [RESCHEDULE]       setUnavailableTimes([]);
  // [RESCHEDULE]       return;
  // [RESCHEDULE]     }
  // [RESCHEDULE]
  // [RESCHEDULE]     const targetDate = formatDateForApi(selectedDate);
  // [RESCHEDULE]     const targetBarberId = Number(selectedBarber);
  // [RESCHEDULE]     const blocked = appointments
  // [RESCHEDULE]       .filter((appointment) => {
  // [RESCHEDULE]         if (rescheduleTarget && appointment.id === rescheduleTarget.id) {
  // [RESCHEDULE]           return false;
  // [RESCHEDULE]         }
  // [RESCHEDULE]
  // [RESCHEDULE]         return (
  // [RESCHEDULE]           appointment.barber.id === targetBarberId &&
  // [RESCHEDULE]           normalizeApiDate(appointment.appointment_date) === targetDate &&
  // [RESCHEDULE]           (appointment.status === "pending" || appointment.status === "approved")
  // [RESCHEDULE]         );
  // [RESCHEDULE]       })
  // [RESCHEDULE]       .map((appointment) => convert24HourTo12Hour(appointment.appointment_time));
  // [RESCHEDULE]
  // [RESCHEDULE]     setUnavailableTimes(blocked);
  // [RESCHEDULE]   };
  // [RESCHEDULE]
  // [RESCHEDULE]   fetchUnavailableTimes();
  // [RESCHEDULE] }, [appointments, selectedBarber, selectedDate, rescheduleTarget]);

  const runUpdate = async (
    appt: Appointment,
    status: "approved" | "cancelled" | "rejected" | "completed" | "no_show",
    cancellationReason?: string,
  ): Promise<boolean> => {
    try {
      const userId = appt.customer.id;
      const serviceId = appt.service.id;
      const barberUserId = appt.barber.id;

      if (!userId || !serviceId || !barberUserId) {
        toast.error("This appointment is missing required details.");
        return false;
      }

      setUpdatingIds((prev) => [...prev, appt.id]);

      const normalizedCancellationReason =
        (status === "cancelled" || status === "rejected") && cancellationReason?.trim()
          ? cancellationReason.trim()
          : null;

      const payload = {
        user_id: userId,
        service_id: serviceId,
        barber_user_id: barberUserId,
        appointment_date: appt.appointment_date,
        appointment_time: normalizeToHHmm(appt.appointment_time),
        duration_minutes: appt.duration_minutes,
        price: Number(appt.price),
        notes: appt.notes,
        cancellation_reason: normalizedCancellationReason,
        status,
      };

      const validation = updateAppointmentSchema.safeParse(payload);
      if (!validation.success) {
        toast.error("Failed to update appointment");
        return false;
      }

      await updateAppointment(appt.id, validation.data);
      const actionMessages: Record<string, string> = {
        approved: "Appointment approved",
        completed: "Appointment marked as completed",
        cancelled: "Appointment cancelled",
        rejected: "Appointment rejected",
        no_show: "Appointment marked as no-show",
      };
      toast.success(actionMessages[status] ?? "Appointment updated");

      // if (status === "approved" || status === "cancelled") {
      //   try {
      //     await sendAppointmentStatusEmail(
      //       appt,
      //       status,
      //       normalizedCancellationReason ?? undefined,
      //     );
      //   } catch (emailError) {
      //     console.error("Failed to send appointment status email:", emailError);
      //     toast.error("Appointment updated, but email notification failed");
      //   }
      // }

      await loadAppointments();
      window.dispatchEvent(new CustomEvent("appointments:updated"));
      return true;
    } catch (error) {
      console.error("Failed to update appointment:", error);
      toast.error("Failed to update appointment");
      return false;
    } finally {
      setUpdatingIds((prev) => prev.filter((id) => id !== appt.id));
    }
  };

  const handleCancelClick = (appt: Appointment) => {
    setSelectedAppointment(appt);
    setCancellationDialogOpen(true);
  };

  const handleCancellationSubmit = async (
    data: CancellationReasonSchemaFormValues,
  ) => {
    if (selectedAppointment) {
      const targetStatus = selectedAppointment.status === "pending" ? "rejected" : "cancelled";
      const success = await runUpdate(
        selectedAppointment,
        targetStatus,
        data.cancellation_reason,
      );
      if (success) {
        setCancellationDialogOpen(false);
        setSelectedAppointment(null);
      }
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmActionTarget) return;
    const { appt, status } = confirmActionTarget;
    const success = await runUpdate(appt, status);
    if (success) {
      setConfirmActionOpen(false);
      setConfirmActionTarget(null);
    }
  };

  // [RESCHEDULE] const handleOpenReschedule = (appt: Appointment) => {
  // [RESCHEDULE]   setRescheduleTarget(appt);
  // [RESCHEDULE]   setSelectedService(String(appt.service.id ?? ""));
  // [RESCHEDULE]   setSelectedBarber(String(appt.barber.id ?? ""));
  // [RESCHEDULE]   setSelectedDate(new Date(normalizeApiDate(appt.appointment_date)));
  // [RESCHEDULE]   setSelectedTime(convert24HourTo12Hour(appt.appointment_time));
  // [RESCHEDULE]   setNotes(appt.notes ?? "");
  // [RESCHEDULE]   setRescheduleReason("");
  // [RESCHEDULE]   setRescheduleOpen(true);
  // [RESCHEDULE] };
  // [RESCHEDULE]
  // [RESCHEDULE] const isRescheduleValid = Boolean(
  // [RESCHEDULE]   rescheduleTarget &&
  // [RESCHEDULE]     selectedService &&
  // [RESCHEDULE]     selectedBarber &&
  // [RESCHEDULE]     selectedDate &&
  // [RESCHEDULE]     selectedTime &&
  // [RESCHEDULE]     !unavailableTimes.includes(selectedTime),
  // [RESCHEDULE] );
  // [RESCHEDULE]
  // [RESCHEDULE] const handleSaveReschedule = async () => {
  // [RESCHEDULE]   if (!rescheduleTarget || !selectedDate) return;
  // [RESCHEDULE]   if (!isRescheduleValid) {
  // [RESCHEDULE]     toast.error("Please complete all required fields.");
  // [RESCHEDULE]     return;
  // [RESCHEDULE]   }
  // [RESCHEDULE]
  // [RESCHEDULE]   const service = services.find((item) => String(item.id) === selectedService);
  // [RESCHEDULE]   const barber = barbers.find((item) => String(item.id) === selectedBarber);
  // [RESCHEDULE]   const customerId = Number(rescheduleTarget.customer.id);
  // [RESCHEDULE]
  // [RESCHEDULE]   if (!service || !barber || !customerId) {
  // [RESCHEDULE]     toast.error("Missing appointment data for re-schedule.");
  // [RESCHEDULE]     return;
  // [RESCHEDULE]   }
  // [RESCHEDULE]
  // [RESCHEDULE]   setSavingReschedule(true);
  // [RESCHEDULE]   try {
  // [RESCHEDULE]     await createReSchedule({
  // [RESCHEDULE]       appointment_id: rescheduleTarget.id,
  // [RESCHEDULE]       customer_user_id: customerId,
  // [RESCHEDULE]       service_id: service.id,
  // [RESCHEDULE]       barber_user_id: barber.id,
  // [RESCHEDULE]       appointment_date: formatDateForApi(selectedDate),
  // [RESCHEDULE]       appointment_time: convert12HourTo24Hour(selectedTime),
  // [RESCHEDULE]       duration_minutes: service.duration ?? rescheduleTarget.duration_minutes,
  // [RESCHEDULE]       price: Number(service.price ?? rescheduleTarget.price),
  // [RESCHEDULE]       notes: notes || null,
  // [RESCHEDULE]       reason: rescheduleReason || null,
  // [RESCHEDULE]       created_by_role: "manager",
  // [RESCHEDULE]     });
  // [RESCHEDULE]
  // [RESCHEDULE]     loadReScheduleSuggestions();
  // [RESCHEDULE]     setRescheduleOpen(false);
  // [RESCHEDULE]     setRescheduleTarget(null);
  // [RESCHEDULE]     toast.success("Re-schedule suggestion saved.");
  // [RESCHEDULE]   } catch (error) {
  // [RESCHEDULE]     console.error("Failed to save re-schedule suggestion:", error);
  // [RESCHEDULE]     toast.error("Failed to save re-schedule suggestion.");
  // [RESCHEDULE]   } finally {
  // [RESCHEDULE]     setSavingReschedule(false);
  // [RESCHEDULE]   }
  // [RESCHEDULE] };

  return (
    <div className="w-full bg-slate-100 p-4 sm:p-6 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Appointments
        </h1>
        <p className="text-gray-500 mt-1">
          Manage appointment requests and scheduled appointments
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4 items-start">
        <SectionCard
          title="Pending Requests"
          description={`${pending.length} pending`}
          className="xl:order-2"
        >

          {loading ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <p className="text-sm">Loading requests...</p>
            </div>
          ) : pending.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <Check className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">All requests have been handled.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {pending.map((req) => (
                <div
                  key={req.id}
                  className={updatingIds.includes(req.id) ? "opacity-60" : ""}
                >
                  <PendingCard
                    req={req}
                    onApprove={(appt) => runUpdate(appt, "approved")}
                    onCancel={handleCancelClick}
                    // [RESCHEDULE] onReschedule={handleOpenReschedule}
                    disabled={updatingIds.includes(req.id)}
                  />
                </div>
              ))}
            </div>
          )}

        </SectionCard>

        <div className="flex flex-col gap-4 xl:order-1">
          <SectionCard
            title="Approved Appointments"
            description="Scheduled appointments grouped by date"
          >

            {loading ? (
              <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                <p className="text-sm">Loading appointments...</p>
              </div>
            ) : approvedAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                <CalendarDays className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">No appointments scheduled.</p>
              </div>
            ) : (
              <>
                {upcomingApproved.length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="font-semibold text-gray-800 text-sm">Upcoming</h3>
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        {upcomingApproved.length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-6">
                      {paginatedApprovedGroups.map((group) => (
                        <div key={group.sortKey}>
                          <div className="flex items-center gap-3 mb-3">
                            <CalendarDays className="w-5 h-5 text-blue-500" />
                            <span className="font-bold text-gray-900 text-sm">
                              {group.label}
                            </span>
                            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              {group.appointments.length} appointment
                              {group.appointments.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className="flex flex-col gap-2">
                            {group.appointments.map((appt) => (
                              <div
                                key={appt.id}
                                className={
                                  updatingIds.includes(appt.id) ? "opacity-60" : ""
                                }
                              >
                                <AppointmentRow
                                  appt={appt}
                                  onStatusChange={(item, status) => {
                                    setConfirmActionTarget({ appt: item, status });
                                    setConfirmActionOpen(true);
                                  }}
                                  onCancel={handleCancelClick}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {upcomingApproved.length > approvedPageSize ? (
                      <Pagination className="mt-4">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              href="#"
                              onClick={(event) => {
                                event.preventDefault();
                                setApprovedPage((prev) => Math.max(1, prev - 1));
                              }}
                            />
                          </PaginationItem>
                          {Array.from({ length: approvedTotalPages }, (_, i) => i + 1).map((pageNo) => (
                            <PaginationItem key={pageNo}>
                              <PaginationLink
                                href="#"
                                isActive={pageNo === approvedPage}
                                onClick={(event) => {
                                  event.preventDefault();
                                  setApprovedPage(pageNo);
                                }}
                              >
                                {pageNo}
                              </PaginationLink>
                            </PaginationItem>
                          ))}
                          <PaginationItem>
                            <PaginationNext
                              href="#"
                              onClick={(event) => {
                                event.preventDefault();
                                setApprovedPage((prev) => Math.min(approvedTotalPages, prev + 1));
                              }}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    ) : null}
                  </>
                )}

                {pastDueApproved.length > 0 && (
                  <div className="mt-6 border-t border-gray-200 pt-4">
                    <button
                      onClick={() => setPastDueOpen((prev) => !prev)}
                      className="flex items-center gap-2 w-full text-left"
                    >
                      <span className="font-semibold text-gray-800 text-sm">
                        Past Due
                      </span>
                      <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-100 text-red-700">
                        {pastDueApproved.length}
                      </span>
                      <span className="text-gray-400 ml-auto text-xs">
                        {pastDueOpen ? "Hide" : "Show"}
                      </span>
                    </button>
                    {pastDueOpen && (
                      <div className="flex flex-col gap-6 mt-4">
                        {pastDueGroups.map((group) => (
                          <div key={group.sortKey}>
                            <div className="flex items-center gap-3 mb-3">
                              <CalendarDays className="w-5 h-5 text-red-400" />
                              <span className="font-bold text-gray-700 text-sm">
                                {group.label}
                              </span>
                              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-red-50 text-red-600">
                                {group.appointments.length} appointment
                                {group.appointments.length !== 1 ? "s" : ""}
                              </span>
                            </div>
                            <div className="flex flex-col gap-2">
                              {group.appointments.map((appt) => (
                                <AppointmentRow
                                  key={appt.id}
                                  appt={appt}
                                  onStatusChange={(item, status) => {
                                    setConfirmActionTarget({ appt: item, status });
                                    setConfirmActionOpen(true);
                                  }}
                                  onCancel={handleCancelClick}
                                  className={
                                    (updatingIds.includes(appt.id) ? "opacity-60" : "") +
                                    " !border-red-300 !bg-red-50"
                                  }
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </SectionCard>

          {/* [RESCHEDULE]
          <SectionCard
            title="Re-schedule Table"
            description="Suggested re-schedule requests saved by manager/admin"
          >
            <ReScheduleTable
              items={rescheduleSuggestions}
              formatShortDate={formatShortDate}
              formatTime={formatTime}
            />
          </SectionCard>
          */}
        </div>
      </div>

      <Dialog
        open={confirmActionOpen}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmActionOpen(false);
            setConfirmActionTarget(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this appointment as{" "}
              {confirmActionTarget?.status === "completed"
                ? "Completed"
                : "No-show"}
              ?
            </DialogDescription>
          </DialogHeader>
          {confirmActionTarget && (
            <div className="rounded-lg border border-gray-200 p-4 space-y-2 text-sm">
              <p>
                <span className="font-medium">Customer:</span>{" "}
                {confirmActionTarget.appt.customer.fullname}
              </p>
              <p>
                <span className="font-medium">Service:</span>{" "}
                {confirmActionTarget.appt.service.name}
              </p>
              <p>
                <span className="font-medium">Barber:</span>{" "}
                {confirmActionTarget.appt.barber.fullname}
              </p>
              <p>
                <span className="font-medium">Date:</span>{" "}
                {formatShortDate(confirmActionTarget.appt.appointment_date)}
              </p>
              <p>
                <span className="font-medium">Time:</span>{" "}
                {formatTime(confirmActionTarget.appt.appointment_time)}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmActionOpen(false);
                setConfirmActionTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              className={
                confirmActionTarget?.status === "completed"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-500 hover:bg-red-600"
              }
              onClick={handleConfirmAction}
            >
              Yes,{" "}
              {confirmActionTarget?.status === "completed"
                ? "Complete"
                : "Mark No-show"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedAppointment && (
        <CancellationForm
          open={cancellationDialogOpen}
          onClose={() => {
            setCancellationDialogOpen(false);
            setSelectedAppointment(null);
          }}
          onSubmit={handleCancellationSubmit}
          appointment={selectedAppointment}
          mode={selectedAppointment.status === "pending" ? "reject" : "cancel"}
        />
      )}

      {/* [RESCHEDULE]
      <Dialog
        open={rescheduleOpen}
        onOpenChange={(open) => {
          setRescheduleOpen(open);
          if (!open) setRescheduleTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Re-schedule Appointment</DialogTitle>
            <DialogDescription>
              Edit required booking details and save to re-schedule table.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectWithLabel
              id="reschedule-service"
              label="Service"
              placeholder="Select a service"
              value={selectedService}
              onValueChange={setSelectedService}
              options={services.map((service) => ({
                value: String(service.id),
                label: service.name ?? "Service",
              }))}
            />
            <SelectWithLabel
              id="reschedule-barber"
              label="Barber"
              placeholder="Select a barber"
              value={selectedBarber}
              onValueChange={setSelectedBarber}
              options={barbers.map((barber) => ({
                value: String(barber.id),
                label: barber.fullname,
              }))}
            />
            <DatePickerWithLabel
              id="reschedule-date"
              label="Date"
              placeholder="Pick a date"
              date={selectedDate}
              onDateChange={setSelectedDate}
              disablePastDates={true}
              maxDaysAhead={30}
              disableSundays={true}
            />
            <SelectWithLabel
              id="reschedule-time"
              label="Time"
              placeholder="Select time"
              value={selectedTime}
              onValueChange={setSelectedTime}
              options={timeOptions.map((time) => ({
                ...time,
                disabled: unavailableTimes.includes(time.value),
              }))}
            />
            <div className="sm:col-span-2 grid gap-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="reschedule-notes">
                Notes
              </label>
              <textarea
                id="reschedule-notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Optional notes"
              />
            </div>
            <div className="sm:col-span-2 grid gap-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="reschedule-reason">
                Re-schedule Reason
              </label>
              <textarea
                id="reschedule-reason"
                rows={2}
                value={rescheduleReason}
                onChange={(event) => setRescheduleReason(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                placeholder="Why you suggested this re-schedule"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!isRescheduleValid || savingReschedule}
              onClick={handleSaveReschedule}
            >
              {savingReschedule ? "Saving..." : "Save Re-schedule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      */}
    </div>
  );
}
