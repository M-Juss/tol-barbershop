import { authFetch } from "@/lib/api";

export type ReportSection = "overview" | "revenue" | "appointments" | "services" | "barbers" | "customers";

export type ReportPeriod =
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "7_days"
  | "30_days"
  | "3_months"
  | "6_months"
  | "12_months"
  | "custom";

export type ReportComparison = "none" | "previous" | "previous_year";

export type ReportGranularity = "daily" | "weekly" | "monthly" | "yearly";

export type ReportDatePreset = {
  key: ReportPeriod;
  label: string;
};

export const DATE_PRESETS: ReportDatePreset[] = [
  { key: "7_days", label: "Last 7 Days" },
  { key: "30_days", label: "Last Month" },
  { key: "3_months", label: "Last 3 Months" },
  { key: "6_months", label: "Last 6 Months" },
  { key: "12_months", label: "Last 12 Months" },
];

export const SECTIONS: { key: ReportSection; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "revenue", label: "Revenue" },
  { key: "appointments", label: "Appointments" },
  { key: "services", label: "Services" },
  { key: "barbers", label: "Barbers" },
  { key: "customers", label: "Feedbacks" },
];

export interface ReportMeta {
  section: ReportSection;
  period: ReportPeriod;
  comparison: ReportComparison;
  date_range: { from: string; to: string };
  comparison_range: { from: string; to: string } | null;
  granularity: ReportGranularity;
  earliest_date: string;
  timezone: string;
}

export interface ReportOverview {
  total_revenue: number;
  completed_appointments: number;
  completion_rate: number;
  total_customers: number;
  average_rating: number;
  cancelled_count: number;
  no_show_count: number;
  comparison: ReportOverview | null;
  insights: { label: string; value: string; detail: string }[];
}

export interface ReportRevenue {
  total_revenue: number;
  average_per_appointment: number;
  by_date: { date: string; value: number }[];
  by_service: { service_id: number; service_name: string; revenue: number; count: number }[];
  by_barber: { barber_id: number; barber_name: string; revenue: number; count: number }[];
  online_revenue: number;
  walkin_revenue: number;
  highest_period: { date: string; value: number } | null;
  lowest_period: { date: string; value: number } | null;
  comparison: ReportRevenue | null;
}

export interface ReportAppointments {
  total: number;
  completed: number;
  cancelled: number;
  no_show: number;
  completion_rate: number;
  cancellation_rate: number;
  no_show_rate: number;
  average_per_day: number;
  online_count: number;
  walkin_count: number;
  by_date: { date: string; completed: number; cancelled: number; no_show: number; approved: number; pending: number; total: number }[];
  by_day_of_week: { day: string; day_index: number; completed: number; cancelled: number; no_show: number; total: number }[];
  peak_hours: { hour: string; count: number }[];
  comparison: ReportAppointments | null;
}

export interface ReportService {
  service_id: number;
  service_name: string;
  total_count: number;
  completed_count: number;
  cancelled_count: number;
  no_show_count: number;
  revenue: number;
  average_revenue: number;
  completion_rate: number;
}

export interface ReportServices {
  services: ReportService[];
  most_booked: ReportService | null;
  least_booked: ReportService | null;
  average_revenue_per_service: number;
  comparison: ReportServices | null;
}

export interface ReportBarber {
  barber_id: number;
  barber_name: string;
  completed_count: number;
  cancelled_count: number;
  no_show_count: number;
  total_appointments: number;
  revenue: number;
  average_rating: number | null;
  rating_count: number;
  completion_rate: number;
}

export interface ReportBarbers {
  barbers: ReportBarber[];
  comparison: ReportBarbers | null;
}

export interface ReportCustomers {
  total_customers_served: number;
  new_customers: number;
  returning_customers: number;
  repeat_rate: number;
  average_rating: number;
  rating_distribution: { rating: number; count: number }[];
  average_by_service: { service_id: number; service_name: string; average_rating: number; count: number }[];
  average_by_barber: { barber_id: number; barber_name: string; average_rating: number; count: number }[];
  comparison: ReportCustomers | null;
}

export type ReportData =
  | { section: "overview"; data: ReportOverview }
  | { section: "revenue"; data: ReportRevenue }
  | { section: "appointments"; data: ReportAppointments }
  | { section: "services"; data: ReportServices }
  | { section: "barbers"; data: ReportBarbers }
  | { section: "customers"; data: ReportCustomers };

export interface SectionReportResponse {
  meta: ReportMeta;
  data: ReportOverview | ReportRevenue | ReportAppointments | ReportServices | ReportBarbers | ReportCustomers;
}

export type CompleteReportData = {
  overview: ReportOverview;
  revenue: ReportRevenue;
  appointments: ReportAppointments;
  services: ReportServices;
  barbers: ReportBarbers;
  customers: ReportCustomers;
};

export type CompleteReportResponse = {
  meta: Omit<ReportMeta, "section"> & { section: "all" };
  data: CompleteReportData;
};

export type Period = "daily" | "weekly" | "monthly" | "yearly";

const API = process.env.NEXT_PUBLIC_API_URL;

export const getAnalyticsKPI = async (period: Period) => {
  return authFetch(`${API}/analytics/kpi?period=${period}`);
};

export const getSectionReport = async (
  section: ReportSection,
  period: ReportPeriod,
  options?: {
    startDate?: string;
    endDate?: string;
    comparison?: ReportComparison;
    signal?: AbortSignal;
  },
): Promise<SectionReportResponse> => {
  const params = new URLSearchParams({ section, period });

  if (options?.startDate && options?.endDate) {
    params.set("start_date", options.startDate);
    params.set("end_date", options.endDate);
  }
  if (options?.comparison && options.comparison !== "none") {
    params.set("comparison", options.comparison);
  }

  return authFetch(`${API}/analytics/reports?${params.toString()}`, {
    signal: options?.signal,
  });
};

export const getCompleteReport = async (
  period: ReportPeriod,
  options?: {
    startDate?: string;
    endDate?: string;
    signal?: AbortSignal;
  },
): Promise<CompleteReportResponse> => {
  const params = new URLSearchParams({ section: "all", period });

  if (options?.startDate && options?.endDate) {
    params.set("start_date", options.startDate);
    params.set("end_date", options.endDate);
  }

  return authFetch(`${API}/analytics/reports?${params.toString()}`, {
    signal: options?.signal,
  });
};

export const formatReportDateLabel = (from: string, to: string): string => {
  const fmt = (d: string) => {
    const date = new Date(`${d}T00:00:00`);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const fromParsed = new Date(`${from}T00:00:00`);
  const toParsed = new Date(`${to}T00:00:00`);

  if (fromParsed.getFullYear() === toParsed.getFullYear()) {
    if (fromParsed.getMonth() === toParsed.getMonth() && fromParsed.getDate() === toParsed.getDate()) {
      return fmt(from);
    }
    return `${fmt(from).replace(/\s\d{4}$/, "")} – ${fmt(to)}`;
  }

  return `${fmt(from)} – ${fmt(to)}`;
};

// Legacy types re-exported for backward compatibility (Overview.tsx, reportPdf.ts)
export type TimeSeriesPoint = { label: string; value: number; date?: string; revenue?: number };
export type AppointmentVolumePoint = {
  label: string;
  date?: string;
  total?: number;
  completed: number;
  cancelled: number;
  no_show: number;
};
export type ServiceStat = {
  service_name: string;
  name?: string;
  completed_count: number;
  count?: number;
  revenue: number;
};
export type BarberStat = {
  barber_name: string;
  completed_count: number;
  count?: number;
  revenue: number;
  total_appointments: number;
};
export type RatingStat = { rating: number; count: number };
export type PeakHourStat = { hour: string; count: number };
export type DayOfWeekStat = {
  day: string;
  day_index?: number;
  total: number;
  completed: number;
  cancelled: number;
  no_show: number;
};
export type AnalyticsKPI = {
  total_revenue: number;
  completed_appointments: number;
  average_rating: number;
  total_customers: number;
  completion_rate: number;
  walkin_count: number;
  cancelled_count: number;
  date_range: { from: string; to: string };
  total_appointments?: number;
  total_services?: number;
  avg_rating?: number | null;
  total_revenue_change?: number | null;
  total_appointments_change?: number | null;
  total_services_change?: number | null;
  avg_rating_change?: number | null;
  revenue_chart?: { date: string; revenue: number }[];
  appointment_chart?: {
    date: string;
    count: number;
    revenue: number;
  }[];
  top_services?: {
    name: string;
    count: number;
    revenue: number;
    avg_rating: number | null;
  }[];
  peak_hours?: {
    hour: number;
    count: number;
    avg_revenue: number;
  }[];
  barbers?: {
    id: number;
    name: string;
    total_appointments: number;
    avg_rating: number | null;
  }[];
};
