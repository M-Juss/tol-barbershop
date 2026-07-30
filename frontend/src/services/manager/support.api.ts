import { authFetch } from "@/lib/api";
import type {
  SupportTicket,
  SupportMessage,
  SupportTicketPage,
} from "@/services/customer/support.api";

export interface QueueResponse {
  waiting: SupportTicket[];
  active: SupportTicket[];
  resolved: SupportTicket[];
  cancelled: SupportTicket[];
  checked_at?: string;
  history_page?: number;
  history_has_more?: boolean;
}

export const getQueue = async (): Promise<QueueResponse> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/support/queue`,
  );
  return response.data;
};

export const getLiveQueue = async (
  signal?: AbortSignal,
): Promise<QueueResponse> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/support/queue?view=live`,
    { signal },
  );
  return response.data;
};

export const getQueueHistory = async (
  options: {
    updatedAfter?: string;
    page?: number;
    perPage?: number;
    signal?: AbortSignal;
  } = {},
): Promise<QueueResponse> => {
  const params = new URLSearchParams({ view: "history" });
  if (options.updatedAfter) {
    params.set("updated_after", options.updatedAfter);
  }
  if (options.page) params.set("history_page", options.page.toString());
  if (options.perPage) params.set("per_page", options.perPage.toString());
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/support/queue?${params.toString()}`,
    { signal: options.signal },
  );
  return response.data;
};

export const getWaitingCount = async (
  signal?: AbortSignal,
): Promise<number> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/support/queue/count`,
    { signal },
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
  options: { afterId?: number; signal?: AbortSignal } = {},
): Promise<SupportMessage[]> => {
  const query =
    options.afterId === undefined ? "" : `?after_id=${options.afterId}`;
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/support/tickets/${ticketId}/messages${query}`,
    { signal: options.signal },
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
  page = 1,
): Promise<SupportTicketPage> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/support/customer/${customerId}?page=${page}&per_page=20`,
  );
  return response.data;
};
