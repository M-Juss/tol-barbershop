import { authFetch } from "@/lib/api";
import type {
  SupportTicket,
  SupportMessage,
} from "@/services/customer/support.api";

export interface QueueResponse {
  waiting: SupportTicket[];
  active: SupportTicket[];
  resolved: SupportTicket[];
  cancelled: SupportTicket[];
}

export const getQueue = async (): Promise<QueueResponse> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/support/queue`,
  );
  return response.data;
};

export const getWaitingCount = async (): Promise<number> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/support/queue/count`,
  );
  return response.data.count;
};

export const acceptTicket = async (id: number): Promise<SupportTicket> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/support/tickets/${id}/accept`,
    { method: "POST" },
  );
  return response.data;
};

export const cancelTicketAsStaff = async (
  id: number,
  cancel_reason: string,
): Promise<void> => {
  await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/support/tickets/${id}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({ cancel_reason }),
    },
  );
};

export interface ResolveTicketData {
  resolution_notes?: string | null;
}

export const resolveTicket = async (
  id: number,
  data: ResolveTicketData,
): Promise<SupportTicket> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/support/tickets/${id}/resolve`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
  return response.data;
};

export const sendMessageAsStaff = async (
  ticketId: number,
  message: string,
): Promise<SupportMessage> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/support/tickets/${ticketId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ message }),
    },
  );
  return response.data;
};

export const getTicketMessages = async (
  ticketId: number,
): Promise<SupportMessage[]> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/support/tickets/${ticketId}/messages`,
  );
  return response.data;
};

export const getTicketDetail = async (
  id: number,
): Promise<SupportTicket> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/support/tickets/${id}`,
  );
  return response.data;
};

export const getCustomerTickets = async (
  customerId: number,
): Promise<SupportTicket[]> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/support/customer/${customerId}`,
  );
  return response.data;
};
