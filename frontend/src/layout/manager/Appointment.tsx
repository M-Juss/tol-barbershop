"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  getAppointments,
  updateAppointment,
  type Appointment,
} from "@/services/customer/appointment.api";
import { updateAppointmentSchema } from "@/validations/appointment.validation";
import { CancellationForm } from "@/forms/CancellationForm";
import { type CancellationReasonSchemaFormValues } from "@/validations/appointment.validation";
import { toast } from "sonner";

type DateGroup = {
  label: string;
  sortKey: string;
  appointments: Appointment[];
};

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

function ActionMenu({
  onSelect,
}: {
  onSelect: (action: "completed" | "no_show") => void;
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
              onSelect("completed");
              setOpen(false);
            }}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 text-gray-700"
          >
            <CheckCircle2 className="w-4 h-4 text-green-500" /> Completed
          </button>
          <button
            onClick={() => {
              onSelect("no_show");
              setOpen(false);
            }}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-gray-50 text-gray-700"
          >
            <UserX className="w-4 h-4 text-red-400" /> No-show
          </button>
        </div>
      )}
    </div>
  );
}

function AppointmentRow({
  appt,
  onStatusChange,
}: {
  appt: Appointment;
  onStatusChange: (appt: Appointment, status: "completed" | "no_show") => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="font-semibold text-gray-900 text-sm">
              {formatTime(appt.appointment_time)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-gray-900 text-sm">
              {appt.customer.fullname}
            </span>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Service: {appt.service.name}
          <span className="mx-2 text-gray-300">•</span>
          Barber: {appt.barber.fullname}
        </p>
      </div>
      <ActionMenu onSelect={(status) => onStatusChange(appt, status)} />
    </div>
  );
}

function PendingCard({
  req,
  onApprove,
  onCancel,
}: {
  req: Appointment;
  onApprove: (appt: Appointment) => void;
  onCancel: (appt: Appointment) => void;
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
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => onApprove(req)}
          className="bg-green-600 hover:bg-green-700 text-white gap-1.5 text-sm h-9"
        >
          <Check className="w-4 h-4" /> Approve
        </Button>
        <Button
          onClick={() => onCancel(req)}
          className="bg-red-500 hover:bg-red-600 text-white gap-1.5 text-sm h-9"
        >
          <X className="w-4 h-4" /> Cancel
        </Button>
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
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<number[]>([]);
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

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

  useEffect(() => {
    loadAppointments();
  }, []);

  const pending = useMemo(
    () => appointments.filter((a) => a.status === "pending"),
    [appointments],
  );

  const approvedGroups = useMemo(
    () => toDateGroups(appointments.filter((a) => a.status === "approved")),
    [appointments],
  );

  const runUpdate = async (
    appt: Appointment,
    status: "approved" | "cancelled" | "completed" | "no_show",
    cancellationReason?: string,
  ) => {
    try {
      setUpdatingIds((prev) => [...prev, appt.id]);

      const normalizedCancellationReason =
        status === "cancelled" && cancellationReason?.trim()
          ? cancellationReason.trim()
          : null;

      const payload = {
        user_id: appt.customer.id as number,
        service_id: appt.service.id as number,
        barber_user_id: appt.barber.id as number,
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
        return;
      }

      await updateAppointment(appt.id, validation.data);
      toast.success("Appointment updated successfully");

      await loadAppointments();
    } catch (error) {
      console.error("Failed to update appointment:", error);
      toast.error("Failed to update appointment");
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
      await runUpdate(
        selectedAppointment,
        "cancelled",
        data.cancellation_reason,
      );
      setCancellationDialogOpen(false);
      setSelectedAppointment(null);
    }
  };

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
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900">
            Approved Appointments
          </h2>
          <p className="text-sm text-gray-400 mb-5">
            Scheduled appointments grouped by date
          </p>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <p className="text-sm">Loading appointments...</p>
            </div>
          ) : approvedGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-gray-400">
              <CalendarDays className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm">No appointments scheduled.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {approvedGroups.map((group) => (
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
                          onStatusChange={(item, status) =>
                            runUpdate(item, status)
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-base font-bold text-gray-900">
            Pending Requests
          </h2>
          <p className="text-sm text-gray-400 mb-4">{pending.length} pending</p>

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
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedAppointment && (
        <CancellationForm
          open={cancellationDialogOpen}
          onClose={() => {
            setCancellationDialogOpen(false);
            setSelectedAppointment(null);
          }}
          onSubmit={handleCancellationSubmit}
          appointment={selectedAppointment}
        />
      )}
    </div>
  );
}
