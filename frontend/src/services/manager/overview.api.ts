import { authFetch } from "@/lib/api";

export interface OverviewStats {
  completed_appointments: number;
  pending_appointments: number;
  total_customers: number;
  total_revenue: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
}

export interface ServiceStats {
  service_name: string;
  completed_count: number;
}

export interface TimeSlotAppointment {
  time: string;
  customer: string | null;
  service: string | null;
  barber: string | null;
  status: "completed" | "approved" | "pending" | "no_show" | "available";
}

export interface ExportSummaryResponse {
  stats: OverviewStats;
  daily_revenue: DailyRevenue[];
  service_stats: ServiceStats[];
  appointments: {
    id: number;
    customer_name: string | null;
    customer_email: string | null;
    barber_name: string | null;
    service_name: string | null;
    appointment_date: string | null;
    appointment_time: string | null;
    status: string;
    price: number;
    is_walkin: boolean;
    notes: string | null;
    created_at: string | null;
  }[];
}

export const getOverviewStats = async (): Promise<OverviewStats> => {
  return authFetch(`${process.env.NEXT_PUBLIC_API_URL}/appointments/overview/stats`);
};

export const getMonthlyRevenue = async (): Promise<DailyRevenue[]> => {
  return authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/appointments/overview/monthly-revenue`,
  );
};

export const getServiceStats = async (): Promise<ServiceStats[]> => {
  return authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/appointments/overview/service-stats`,
  );
};

export const getTimeSlotsForDate = async (
  date: Date,
): Promise<TimeSlotAppointment[]> => {
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const encodedDate = encodeURIComponent(dateKey);

  return authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/appointments/overview/time-slots?date=${encodedDate}`,
  );
};

export const getOverviewExportSummary =
  async (): Promise<ExportSummaryResponse> => {
    return authFetch(
      `${process.env.NEXT_PUBLIC_API_URL}/appointments/overview/export-summary`,
    );
  };
