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
      className={cn("border border-gray-200 rounded-xl p-4 flex items-center justify-between", className)}
    >
      <div className="flex items-center gap-4">
        <div className="bg-blue-100 rounded-xl p-2.5">
          <CalendarDays className="text-blue-500 w-5 h-5" strokeWidth={2} />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-base">{service}</p>
          <p className="text-gray-500 text-sm mt-0.5">Barber: {barber}</p>
          <span className="flex items-center gap-1.5 text-gray-500 text-sm mt-0.5">
            Date & Time: {date} at {time}
          </span>
          {(status === "Cancelled" || status === "Rejected") && cancellation_reason && (
            <p className="text-red-500 text-xs mt-1.5">
              Reason: {cancellation_reason}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <p className="font-bold text-gray-900 text-base sm:text-lg">₱{price}</p>
        <span
          className={cn("text-xs font-medium px-3 py-1 rounded-full", statusBadge[status])}
        >
          {status}
        </span>
      </div>
    </div>
  );
}
