import { ApiError, authFetch, publicFetch } from "@/lib/api";
import { formatBookingId } from "@/lib/booking";
import { getCachedRequest } from "@/lib/request-cache";

const REFERENCE_DATA_STALE_MS = 5 * 60_000;

export interface Barber {
  id: number;
  fullname: string;
  email: string;
  contact_number: string;
  image?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: number;
  name: string;
  description?: string;
  price?: number | string | null;
  duration?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AppointmentStatus =
  | "pending"
  | "approved"
  | "completed"
  | "cancelled"
  | "no_show"
  | "rejected";

export interface Appointment {
  id: number;
  customer: {
    id: number | null;
    fullname: string | null;
    email: string | null;
    contact_number: string | null;
  };
  barber: {
    id: number | null;
    fullname: string | null;
    email: string | null;
    contact_number: string | null;
  };
  service: {
    id: number | null;
    name: string | null;
  };
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number | null;
  price: number | string;
  status: AppointmentStatus;
  is_walkin: boolean;
  batch_id: string | null;
  customer_name: string | null;
  customer_name_snapshot: string | null;
  service_name_snapshot: string | null;
  barber_name_snapshot: string | null;
  notes: string | null;
  cancellation_reason: string | null;
  feedback?: {
    rating: number;
    comment: string | null;
    submitted_at: string | null;
  } | null;
  approved_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AppointmentHistoryMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface AppointmentHistoryFilters {
  search?: string;
  status?: AppointmentStatus;
  is_walkin?: boolean;
  page?: number;
  per_page?: number;
}

export interface AppointmentHistoryResponse {
  appointments: Appointment[];
  meta: AppointmentHistoryMeta;
}

export interface CreateAppointmentData {
  user_id?: number;
  service_id: number;
  barber_user_id: number;
  appointment_date?: string;
  appointment_time?: string;
  duration_minutes?: number;
  price: number;
  status?: AppointmentStatus;
  notes?: string | null;
  is_walkin?: boolean;
  walkin_customer_name?: string;
  walkin_customer_contact_number?: string;
}

export interface UpdateAppointmentData {
  user_id: number;
  service_id: number;
  barber_user_id: number;
  appointment_date: string;
  appointment_time: string;
  duration_minutes?: number | null;
  price: number;
  status?: AppointmentStatus;
  notes?: string | null;
  cancellation_reason?: string | null;
}

export interface BatchAppointmentSlot {
  customer_name: string | null;
  service_id: number;
  appointment_time: string;
  duration_minutes?: number;
  price: number;
}

export interface CreateBatchAppointmentData {
  barber_user_id: number;
  appointment_date: string;
  notes?: string | null;
  appointments: BatchAppointmentSlot[];
}

export interface BookingSettings {
  opening_time: string;
  closing_time: string;
  slot_interval_minutes: number;
  max_slots_per_booking: number;
}

export type OccupiedAppointmentSlot = {
  appointment_time: string;
  duration_minutes: number;
};

export const getActiveBarbers = async (): Promise<Barber[]> => {
  return getCachedRequest("barbers:active", async () => {
    const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/barber`);
    return response.data?.data ?? response.data;
  }, REFERENCE_DATA_STALE_MS);
};

export const getActiveServices = async (): Promise<Service[]> => {
  return getCachedRequest("services:active", async () => {
    const response = await authFetch(
      `${process.env.NEXT_PUBLIC_API_URL}/services`,
    );
    return response.data.services;
  }, REFERENCE_DATA_STALE_MS);
};

export const getAppointments = async (
  signal?: AbortSignal,
): Promise<Appointment[]> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/appointments`,
    { signal },
  );
  return response.data;
};

export const getAppointmentHistory = async (
  filters: AppointmentHistoryFilters = {},
  signal?: AbortSignal,
): Promise<AppointmentHistoryResponse> => {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.is_walkin !== undefined) {
    params.set("is_walkin", filters.is_walkin ? "1" : "0");
  }
  if (filters.page) params.set("page", String(filters.page));
  if (filters.per_page) params.set("per_page", String(filters.per_page));

  const query = params.toString();
  try {
    const response = await authFetch(
      `${process.env.NEXT_PUBLIC_API_URL}/appointments/history${query ? `?${query}` : ""}`,
      { signal },
    );

    return response.data as AppointmentHistoryResponse;
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 404) throw error;

    const allAppointments = await getAppointments(signal);
    const search = filters.search?.trim().toLowerCase();
    const filtered = allAppointments
      .filter((appointment) => {
        if (filters.status && appointment.status !== filters.status) return false;
        if (
          filters.is_walkin !== undefined &&
          appointment.is_walkin !== filters.is_walkin
        ) {
          return false;
        }
        if (!search) return true;

        return [
          String(appointment.id),
          formatBookingId(appointment.id),
          appointment.customer.fullname,
          appointment.customer_name,
          appointment.customer_name_snapshot,
          appointment.service.name,
          appointment.service_name_snapshot,
          appointment.barber.fullname,
          appointment.barber_name_snapshot,
        ].some((value) => value?.toLowerCase().includes(search));
      })
      .sort((first, second) => {
        const firstUpdated = new Date(first.updated_at).getTime();
        const secondUpdated = new Date(second.updated_at).getTime();
        return secondUpdated - firstUpdated || second.id - first.id;
      });
    const perPage = filters.per_page ?? 10;
    const page = filters.page ?? 1;
    const start = (page - 1) * perPage;

    return {
      appointments: filtered.slice(start, start + perPage),
      meta: {
        current_page: page,
        last_page: Math.max(1, Math.ceil(filtered.length / perPage)),
        per_page: perPage,
        total: filtered.length,
      },
    };
  }
};

export const createAppointment = async (
  data: CreateAppointmentData,
): Promise<Appointment> => {
  const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/appointments`, {
    method: "POST",
    body: JSON.stringify(data),
  });

  return response.data;
};

export const updateAppointment = async (
  id: number,
  data: UpdateAppointmentData,
): Promise<Appointment> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/appointments/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(data),
    },
  );

  return response.data;
};

export const createBatchAppointment = async (
  data: CreateBatchAppointmentData,
): Promise<Appointment[]> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/appointments/batch`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  return response.data;
};

export const updateBatchAppointmentStatus = async (
  batchId: string,
  status: "approved" | "rejected",
  cancellationReason?: string | null,
): Promise<Appointment[]> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/appointments/batch/${encodeURIComponent(batchId)}/status`,
    {
      method: "PUT",
      body: JSON.stringify({
        status,
        cancellation_reason: cancellationReason ?? null,
      }),
    },
  );

  return response.data;
};

export const getUnavailableSlots = async (
  barberId: number,
  date: string,
  ignoreAppointmentId?: number,
): Promise<OccupiedAppointmentSlot[]> => {
  const params = new URLSearchParams({
    barber_id: barberId.toString(),
    date,
  });
  if (ignoreAppointmentId) {
    params.set("ignore_appointment_id", ignoreAppointmentId.toString());
  }

  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/appointments/available-slots?${params.toString()}`,
  );
  return response.data;
};

export const getBookingSettings = async (): Promise<BookingSettings> => {
  return getCachedRequest("settings:booking", async () => {
    const response = await publicFetch(
      `${process.env.NEXT_PUBLIC_API_URL}/public-booking-settings`,
      { cache: "force-cache" },
    );

    return response.data;
  }, REFERENCE_DATA_STALE_MS);
};
