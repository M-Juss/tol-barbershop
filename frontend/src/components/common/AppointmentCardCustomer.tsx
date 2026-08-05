import { CalendarDays } from "lucide-react";

import { cn } from "@/lib/utils";

type AppointmentCardCustomerProps = {
  service: string;
  barber: string;
  price: number;
  date: string;
  time: string;
  cancellation_reason?: string | null;
  className?: string;
};

export function AppointmentCardCustomer({
  service,
  barber,
  price,
  date,
  time,
  cancellation_reason,
  className = "",
}: AppointmentCardCustomerProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-gray-200 p-4",
        className,
      )}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-4">
        <div className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Date
            </p>
            <div className="flex items-start gap-1.5">
              <CalendarDays className="mt-0.5 size-3.5 shrink-0 text-blue-500" />
              <span className="text-sm font-bold leading-tight text-gray-900">
                {date}
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Time
            </p>
            <p className="text-sm font-bold text-blue-600">{time}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Service
            </p>
            <p className="truncate text-xs text-gray-600">{service}</p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Barber
            </p>
            <p className="truncate pr-2 text-xs text-gray-600">{barber}</p>
          </div>
          {cancellation_reason && (
            <p className="col-span-2 text-xs text-red-500">
              Reason: {cancellation_reason}
            </p>
          )}
        </div>
        <div className="min-w-20 text-right">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              Price
            </p>
            <p className="text-xl font-extrabold leading-tight text-primary">
              ₱{Number(price).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
