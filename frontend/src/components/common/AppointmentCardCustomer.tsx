import { CalendarDays, Clock } from "lucide-react";

export type AppointmentStatus = "Approved" | "Pending" | "Completed" | "Cancelled";

type AppointmentCardCustomerProps = {
  service: string;
  barber: string;
  price: number;
  status: AppointmentStatus;
  date: string;
  time: string;
  className?: string;
};

const statusBadge: Record<AppointmentStatus, string> = {
  Approved: "bg-blue-100 text-blue-500",
  Pending: "bg-yellow-100 text-yellow-600",
  Completed: "bg-green-100 text-green-600",
  Cancelled: "bg-red-100 text-red-500",
};

export function AppointmentCardCustomer({
  service,
  barber,
  price,
  status,
  date,
  time,
  className = "",
}: AppointmentCardCustomerProps) {
  return (
    <div
      className={`border border-gray-200 rounded-xl p-4 flex items-center justify-between ${className}`}
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
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <p className="font-bold text-gray-900 text-lg">₱{price}</p>
        <span
          className={`text-xs font-medium px-3 py-1 rounded-full ${statusBadge[status]}`}
        >
          {status}
        </span>
      </div>
    </div>
  );
}
