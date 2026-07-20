import { ChevronRight, Mail, Phone, Scissors, User, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type { Appointment } from "@/services/customer/appointment.api";

function formatShortDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(time24: string): string {
  const [hours, minutes] = time24.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

type GroupPendingCardProps = {
  appointments: Appointment[];
  overdue?: boolean;
  onViewDetails: (appts: Appointment[]) => void;
  onApproveAll: (appts: Appointment[]) => void;
  onRejectAll: (appts: Appointment[]) => void;
  disabled?: boolean;
};

export function GroupPendingCard({
  appointments,
  overdue = false,
  onViewDetails,
  onApproveAll,
  onRejectAll,
  disabled = false,
}: GroupPendingCardProps) {
  const first = appointments[0];
  const totalPrice = appointments.reduce(
    (sum, a) => sum + Number(a.price),
    0,
  );

  const sortedAppointments = [...appointments].sort((a, b) =>
    a.appointment_time.localeCompare(b.appointment_time),
  );
  const bookingContact =
    sortedAppointments.find((appointment) => !appointment.customer_name) ?? first;

  return (
    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
      <button
        type="button"
        onClick={() => onViewDetails(appointments)}
        className="group w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        aria-label={`Review group booking with ${appointments.length} appointments`}
      >
        <div className="mb-3 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-amber-600" />
          <span className="font-semibold text-gray-900 text-sm">
            Group Booking ({appointments.length})
          </span>
          {overdue && (
            <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
              Overdue
            </span>
          )}
          <span className={cn("rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700", overdue && "ml-0")}>
            {formatShortDate(first.appointment_date)}
          </span>
          <ChevronRight className="size-4 shrink-0 text-amber-600 transition-transform group-hover:translate-x-0.5" />
        </div>

        <div className="flex items-center gap-1.5 mb-0.5">
          <User className="w-3.5 h-3.5 text-gray-400" />
          <span className="font-semibold text-gray-900 text-sm">
            {bookingContact.customer.fullname ?? "Booking contact"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 mb-0.5">
          <Mail className="w-3.5 h-3.5 text-gray-400" />
          <span className="truncate text-xs text-gray-500">{first.customer.email}</span>
        </div>
        <div className="flex items-center gap-1.5 mb-3">
          <Phone className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-500">{first.customer.contact_number}</span>
        </div>

        <div className="border-t border-yellow-200 mb-3" />

        <div className="space-y-1 text-xs text-gray-600">
          <p className="flex items-center gap-1.5">
            <Scissors className="w-3.5 h-3.5 text-gray-400" />
            <span className="font-medium text-gray-800">Barber:</span>{" "}
            <span className="truncate">{first.barber.fullname}</span>
          </p>
          <p>
            <span className="font-medium text-gray-800">Appointments:</span>{" "}
            {appointments.length}
          </p>
          <p>
            <span className="font-medium text-gray-800">Time:</span>{" "}
            {formatTime(sortedAppointments[0].appointment_time)}
            {sortedAppointments.length > 1
              ? ` - ${formatTime(sortedAppointments[sortedAppointments.length - 1].appointment_time)}`
              : ""}
          </p>
          <p>
            <span className="font-medium text-gray-800">Total:</span>{" "}
            ₱{totalPrice.toLocaleString()}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-lg bg-white/60 px-3 py-2 text-xs font-medium text-amber-700 transition-colors group-hover:bg-white">
          <span>View group details</span>
          <ChevronRight className="size-3.5" />
        </div>
      </button>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button
          onClick={() => onApproveAll(appointments)}
          disabled={disabled || overdue}
          title={overdue ? "Cannot approve an overdue booking" : undefined}
          className={cn(
            "gap-1.5 text-sm h-9",
            overdue
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 text-white",
          )}
        >
          {appointments.length > 1 ? "Approve All" : "Approve"}
        </Button>
        <Button
          onClick={() => onRejectAll(appointments)}
          disabled={disabled}
          className="bg-red-500 hover:bg-red-600 text-white gap-1.5 text-sm h-9"
        >
          {appointments.length > 1 ? "Reject All" : "Reject"}
        </Button>
      </div>
    </div>
  );
}
