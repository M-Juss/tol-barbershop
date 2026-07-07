import { authFetch, publicFetch } from "@/lib/api";

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
  notes: string | null;
  cancellation_reason: string | null;
  approved_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
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

// Fetch active barbers
export const getActiveBarbers = async (): Promise<Barber[]> => {
  const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/barber`);
  return response.data?.data ?? response.data;
};

// Fetch active services
export const getActiveServices = async (): Promise<Service[]> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/services`,
  );
  return response.data.services;
};

export const getAppointments = async (): Promise<Appointment[]> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/appointments`,
  );
  return response.data;
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

export const getBookingSettings = async (): Promise<BookingSettings> => {
  const response = await publicFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/public-booking-settings`,
  );

  return response.data;
};
