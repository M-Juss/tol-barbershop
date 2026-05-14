import { CalendarDays } from "lucide-react";

export type AppointmentStatus =
  | "Approved"
  | "Pending"
  | "Completed"
  | "Cancelled"
  | "No-show";

interface AppointmentCardProps {
  service: string;
  barber: string;
  price: number;
  status: AppointmentStatus;
  date: string;
  time: string;
  customer: string;
  cancellation_reason?: string | null;
  className?: string;
}

const statusBadge: Record<AppointmentStatus, string> = {
  Approved: "bg-blue-100 text-blue-500",
  Pending: "bg-yellow-100 text-yellow-600",
  Completed: "bg-green-100 text-green-600",
  Cancelled: "bg-red-100 text-red-500",
  "No-show": "bg-gray-200 text-gray-600",
};

export function AppointmentCard({
  service,
  barber,
  price,
  status,
  date,
  time,
  customer,
  cancellation_reason,
  className = "",
}: AppointmentCardProps) {
  return (
    <div
      className={`bg-white rounded-xl p-5 shadow-sm border border-gray-100 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 rounded-xl p-2.5 shrink-0">
            <CalendarDays className="text-blue-500 w-5 h-5" strokeWidth={2} />
          </div>
          <div>
            <p className="font-bold text-gray-900 text-base">{service}</p>
            <p className="text-gray-500 text-sm">Barber: {barber}</p>
            <p className="text-gray-500 text-sm">Customer: {customer}</p>
            <p className="text-gray-500 text-sm">
              Date & time: {date} at {time}
            </p>
            {status === "Cancelled" && cancellation_reason && (
              <p className="text-red-400 text-sm font-medium">
                Reason: {cancellation_reason}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <p className="font-bold text-gray-900 text-lg">₱{price}</p>
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full ${statusBadge[status]}`}
          >
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}
