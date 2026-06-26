import { authFetch } from "@/lib/api";

export interface SubmitAppointmentFeedbackData {
  appointment_id: number;
  rating: number;
  comment?: string | null;
}

export interface AppointmentFeedback {
  id: number;
  appointment_id: number;
  rating: number;
  comment: string | null;
  customer_name: string;
  customer_initials: string;
  service_name: string | null;
  submitted_at: string;
}

export const submitAppointmentFeedback = async (
  data: SubmitAppointmentFeedbackData,
): Promise<AppointmentFeedback> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/appointment-feedback`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );

  return response.data;
};

export interface PendingFeedbackItem {
  appointment_id: number;
  service_name: string | null;
}

export const getPendingFeedback = async (): Promise<PendingFeedbackItem[]> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/pending-feedback`,
  );
  return response.data?.appointments ?? [];
};
