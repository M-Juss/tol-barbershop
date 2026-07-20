import { authFetch } from "@/lib/api";

export interface CustomerItem {
  id: number;
  fullname: string;
  email: string;
  contact_number: string;
  is_active: boolean;
  initials: string;
  total_visits: number;
  no_show_count: number;
  cancelled_count: number;
  lifetime_value: number;
  last_visit_date: string | null;
  average_rating: number | null;
  registered_date: string;
}

export interface CustomerMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface CustomerStats {
  total_customers: number;
  new_this_month: number;
  active_count: number;
  inactive_count: number;
}

export interface CustomerListResponse {
  customers: CustomerItem[];
  meta: CustomerMeta;
  stats: CustomerStats;
}

export interface CustomerDetail {
  id: number;
  fullname: string;
  email: string;
  contact_number: string;
  is_active: boolean;
  initials: string;
  completed_count: number;
  no_show_count: number;
  cancelled_count: number;
  lifetime_value: number;
  last_visit_date: string | null;
  average_rating: number | null;
  registered_date: string;
  no_show_rate: number;
  cancellation_rate: number;
  service_preferences: {
    service_name: string;
    count: number;
    percentage: number;
  }[];
  barber_preferences: {
    barber_name: string;
    count: number;
    percentage: number;
  }[];
  recent_appointments: {
    id: number;
    appointment_date: string;
    appointment_time: string;
    service_name: string;
    barber_name: string;
    price: number;
    status: string;
  }[];
}

export interface CustomerFilters {
  search?: string;
  status?: string;
  sort?: string;
  dir?: string;
  page?: number;
  per_page?: number;
}

const API = process.env.NEXT_PUBLIC_API_URL;

export const getCustomerList = async (
  filters: CustomerFilters = {},
  signal?: AbortSignal,
): Promise<CustomerListResponse> => {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.dir) params.set("dir", filters.dir);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.per_page) params.set("per_page", String(filters.per_page));

  const qs = params.toString();
  const response = await authFetch(
    `${API}/customers${qs ? `?${qs}` : ""}`,
    { signal },
  );
  return response.data as CustomerListResponse;
};

export const getCustomerDetail = async (
  id: number,
): Promise<CustomerDetail> => {
  const response = await authFetch(`${API}/customers/${id}`);
  return response.data.customer as CustomerDetail;
};
