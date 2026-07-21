import { authFetch } from "@/lib/api";

export interface NotificationItem {
  id: number;
  user_id: number;
  type:
    | "appointment_status"
    | "appointment_completed"
    | "appointment_rescheduled"
    | "appointment_feedback_request"
    | "closed_date"
    | "new_pending_appointment"
    | "reschedule_suggestion"
    | "new_support_ticket"
    | "ticket_cancelled"
    | "ticket_promoted"
    | "ticket_resolved"
    | string;
  title: string;
  message: string;
  payload?: Record<string, unknown> | null;
  appointment_id: number | null;
  service_name: string | null;
  barber_name: string | null;
  appointment_date: string | null;
  appointment_time: string | null;
  price: number | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface NotificationPayload {
  unread_count: number;
  notifications: NotificationItem[];
  pagination: PaginationMeta;
}

export const getNotifications = async (
  page: number = 1,
  signal?: AbortSignal,
): Promise<NotificationPayload> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/notifications?page=${page}`,
    { signal },
  );
  return response.data;
};

export const markNotificationAsRead = async (id: number): Promise<void> => {
  await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/notifications/${id}/read`,
    {
      method: "PATCH",
    },
  );
};

export const markAllNotificationsAsRead = async (): Promise<void> => {
  await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/notifications/read-all`,
    {
      method: "PATCH",
    },
  );
};
