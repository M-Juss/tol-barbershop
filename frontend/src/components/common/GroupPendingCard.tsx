import { User, Users, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

type GroupPendingCardProps = {
  appointments: Appointment[];
  onApproveAll: (appts: Appointment[]) => void;
  onRejectAll: (appts: Appointment[]) => void;
  disabled?: boolean;
};

export function GroupPendingCard({
  appointments,
  onApproveAll,
  onRejectAll,
  disabled = false,
}: GroupPendingCardProps) {
  const first = appointments[0];
  const totalPrice = appointments.reduce(
    (sum, a) => sum + Number(a.price),
    0,
  );

  const slots = appointments
    .map((a) => ({
      id: a.id,
      name: a.customer_name ?? a.customer.fullname ?? "Unknown",
      service: a.service.name ?? "Unknown",
      time: formatTime(a.appointment_time),
      price: Number(a.price),
    }))
    .sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
      <div className="flex items-center gap-1.5 mb-3">
        <Users className="w-4 h-4 text-amber-600" />
        <span className="font-semibold text-gray-900 text-sm">
          Group Booking ({appointments.length})
        </span>
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 ml-auto">
          {formatShortDate(first.appointment_date)}
        </span>
      </div>

      <div className="flex items-center gap-1.5 mb-0.5">
        <User className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-semibold text-gray-900 text-sm">
          {first.customer.fullname}
        </span>
      </div>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Mail className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-500">{first.customer.email}</span>
      </div>
      <div className="flex items-center gap-1.5 mb-3">
        <Phone className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-500">
          {first.customer.contact_number}
        </span>
      </div>

      <div className="border-t border-yellow-200 mb-3" />

      <p className="text-xs text-gray-600 mb-2">
        <span className="font-medium text-gray-800">Barber:</span>{" "}
        {first.barber.fullname}
      </p>

      <div className="space-y-1 mb-3">
        <div className="grid grid-cols-[1fr_1.5fr_1fr_auto] gap-2 text-xs font-medium text-gray-500 px-2">
          <span>Person</span>
          <span>Service</span>
          <span>Time</span>
          <span>Price</span>
        </div>
        {slots.map((slot, i) => (
          <div
            key={slot.id}
            className="grid grid-cols-[1fr_1.5fr_1fr_auto] gap-2 text-xs text-gray-700 bg-white/60 rounded-lg px-2 py-1.5"
          >
            <span className="font-medium truncate">{i + 1}. {slot.name}</span>
            <span className="truncate">{slot.service}</span>
            <span>{slot.time}</span>
            <span className="font-medium text-right">₱{slot.price.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="border-t border-yellow-200 mb-3" />

      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-gray-800">Total</span>
        <span className="text-sm font-bold text-amber-700">
          ₱{totalPrice.toLocaleString()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => onApproveAll(appointments)}
          disabled={disabled}
          className="bg-green-600 hover:bg-green-700 text-white gap-1.5 text-sm h-9"
        >
          Approve All
        </Button>
        <Button
          onClick={() => onRejectAll(appointments)}
          disabled={disabled}
          className="bg-red-500 hover:bg-red-600 text-white gap-1.5 text-sm h-9"
        >
          Reject All
        </Button>
      </div>
    </div>
  );
}
