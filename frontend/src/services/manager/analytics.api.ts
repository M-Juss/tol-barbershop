import { authFetch } from "@/lib/api";

export interface AnalyticsKPI {
  total_revenue: number;
  completed_appointments: number;
  average_rating: number;
  total_customers: number;
  completion_rate: number;
  walkin_count: number;
  cancelled_count: number;
}

export interface TimeSeriesPoint {
  label: string;
  value: number;
}

export interface AppointmentVolumePoint {
  label: string;
  completed: number;
  cancelled: number;
  no_show: number;
}

export interface ServiceStat {
  service_name: string;
  completed_count: number;
  revenue: number;
}

export interface BarberStat {
  barber_name: string;
  completed_count: number;
  revenue: number;
  total_appointments: number;
}

export interface RatingStat {
  rating: number;
  count: number;
}

export interface PeakHourStat {
  hour: string;
  count: number;
}

export type Period = "daily" | "weekly" | "monthly" | "yearly";

const API = process.env.NEXT_PUBLIC_API_URL;

export const getAnalyticsKPI = async (period: Period): Promise<AnalyticsKPI> => {
  return authFetch(`${API}/analytics/kpi?period=${period}`);
};

export const getAnalyticsRevenue = async (period: Period): Promise<TimeSeriesPoint[]> => {
  return authFetch(`${API}/analytics/revenue?period=${period}`);
};

export const getAnalyticsAppointments = async (period: Period): Promise<AppointmentVolumePoint[]> => {
  return authFetch(`${API}/analytics/appointments?period=${period}`);
};

export const getAnalyticsServices = async (period: Period): Promise<ServiceStat[]> => {
  return authFetch(`${API}/analytics/services?period=${period}`);
};

export const getAnalyticsBarbers = async (period: Period): Promise<BarberStat[]> => {
  return authFetch(`${API}/analytics/barbers?period=${period}`);
};

export const getAnalyticsRatings = async (period: Period): Promise<RatingStat[]> => {
  return authFetch(`${API}/analytics/ratings?period=${period}`);
};

export const getAnalyticsPeakHours = async (period: Period): Promise<PeakHourStat[]> => {
  return authFetch(`${API}/analytics/peak-hours?period=${period}`);
};
