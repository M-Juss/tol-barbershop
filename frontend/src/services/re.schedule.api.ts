import { authFetch } from "@/lib/api";

export type ReScheduleDecision = "pending" | "accepted" | "declined";

export interface ReScheduleItem {
  id: number;
  appointment_id: number;
  customer_user_id: number;
  customer_name: string | null;
  service_id: number;
  service_name: string | null;
  barber_user_id: number;
  barber_name: string | null;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number | null;
  price: number;
  notes: string | null;
  reason: string | null;
  decision: ReScheduleDecision;
  created_by_user_id: number | null;
  created_by_role: "manager" | "admin";
  responded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  type: "appointment_status" | "closed_date" | "reschedule_suggestion" | string;
  title: string;
  message: string;
  payload?: {
    appointment_id?: number;
    reschedule_id?: number;
    closed_date_id?: number;
    [key: string]: unknown;
  } | null;
  is_read: boolean;
  read_at: string | null;
  created_by_user_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReScheduleData {
  appointment_id: number;
  customer_user_id: number;
  service_id: number;
  barber_user_id: number;
  appointment_date: string;
  appointment_time: string;
  duration_minutes?: number | null;
  price: number;
  notes?: string | null;
  reason?: string | null;
  created_by_role?: "manager" | "admin";
}

export const getReSchedules = async (
  decision?: ReScheduleDecision,
): Promise<ReScheduleItem[]> => {
  const query = decision ? `?decision=${decision}` : "";
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/re-schedules${query}`,
  );
  return response.data;
};

export const createReSchedule = async (
  data: CreateReScheduleData,
): Promise<ReScheduleItem> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/re-schedules`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
  return response.data;
};

export const decideReSchedule = async (
  id: number,
  decision: "accepted" | "declined",
): Promise<ReScheduleItem> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/re-schedules/${id}/decision`,
    {
      method: "PATCH",
      body: JSON.stringify({ decision }),
    },
  );
  return response.data;
};

export interface NotificationPayload {
  unread_count: number;
  notifications: NotificationItem[];
}

export const getNotifications = async (): Promise<NotificationPayload> => {
  const response = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications`);
  return response.data;
};

export const markNotificationAsRead = async (id: number): Promise<void> => {
  await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/${id}/read`, {
    method: "PATCH",
  });
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/notifications/read-all`, {
    method: "PATCH",
  });
};
