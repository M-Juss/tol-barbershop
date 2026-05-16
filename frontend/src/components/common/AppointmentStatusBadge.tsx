import { type AppointmentStatus } from "@/services/customer/appointment.api";

type AppointmentStatusBadgeProps = {
  status: AppointmentStatus;
};

function getStatusBadgeClass(status: AppointmentStatus): string {
  if (status === "pending") return "bg-yellow-100 text-yellow-700";
  if (status === "approved") return "bg-blue-100 text-blue-700";
  if (status === "completed") return "bg-green-100 text-green-700";
  if (status === "cancelled") return "bg-red-100 text-red-700";
  return "bg-gray-200 text-gray-700";
}

export function AppointmentStatusBadge({ status }: AppointmentStatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${getStatusBadgeClass(status)}`}
    >
      {status.replace("_", "-")}
    </span>
  );
}
