import { cn } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

export type AppointmentStatus =
  | "Approved"
  | "Pending"
  | "Completed"
  | "Cancelled"
  | "Rejected"
  | "No-show";

type AppointmentCardCustomerProps = {
  service: string;
  barber: string;
  price: number;
  status: AppointmentStatus;
  date: string;
  time: string;
  cancellation_reason?: string | null;
  className?: string;
};

const statusBadge: Record<AppointmentStatus, string> = {
  Approved: "bg-blue-100 text-blue-500",
  Pending: "bg-yellow-100 text-yellow-600",
  Completed: "bg-green-100 text-green-600",
  Cancelled: "bg-red-100 text-red-500",
  Rejected: "bg-orange-100 text-orange-600",
  "No-show": "bg-gray-200 text-gray-600",
};

export function AppointmentCardCustomer({
  service,
  barber,
  price,
  status,
  date,
  time,
  cancellation_reason,
  className = "",
}: AppointmentCardCustomerProps) {
  return (
    <div
      className={cn("border border-gray-200 rounded-xl p-4", className)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center gap-5">
            <div className="shrink-0 w-28">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Date</p>
              <div className="flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="font-bold text-gray-900 text-sm">{date}</span>
              </div>
            </div>
            <div className="shrink-0 w-24">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Time</p>
              <p className="font-bold text-blue-600 text-sm">{time}</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="shrink-0 w-28">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Service</p>
              <p className="text-xs text-gray-600 truncate">{service}</p>
            </div>
            <div className="shrink-0 w-24">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Barber</p>
              <p className="text-xs text-gray-600 truncate">{barber}</p>
            </div>
            <div className="shrink-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Price</p>
              <p className="text-xs font-medium text-gray-700">₱{Number(price).toLocaleString()}</p>
            </div>
          </div>
          {(status === "Cancelled" || status === "Rejected") && cancellation_reason && (
            <p className="text-red-500 text-xs">
              Reason: {cancellation_reason}
            </p>
          )}
        </div>
        <span
          className={cn("text-xs font-medium px-3 py-1 rounded-full shrink-0", statusBadge[status])}
        >
          {status}
        </span>
      </div>
    </div>
  );
}
