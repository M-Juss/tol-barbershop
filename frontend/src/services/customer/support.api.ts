import { authFetch } from "@/lib/api";

export interface SupportTicketSender {
  id: number;
  fullname: string;
  role: string;
  image: string | null;
}

export interface SupportMessage {
  id: number;
  support_ticket_id: number;
  sender_id: number;
  sender_name_snapshot: string | null;
  message: string;
  created_at: string;
  updated_at: string;
  sender: SupportTicketSender;
}

export interface SupportTicketCustomer {
  id: number;
  fullname: string;
  email: string;
  image: string | null;
}

export interface SupportTicketAssignedTo {
  id: number;
  fullname: string;
}

export interface SupportTicket {
  id: number;
  customer_id: number;
  customer_name_snapshot: string | null;
  assigned_to_id: number | null;
  assigned_staff_name_snapshot: string | null;
  status: "waiting" | "active" | "resolved" | "cancelled";
  category: string | null;
  subject: string | null;
  resolution_notes: string | null;
  cancel_reason: string | null;
  last_message_at: string | null;
  queued_at: string | null;
  claimed_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  customer: SupportTicketCustomer;
  assigned_to: SupportTicketAssignedTo | null;
  messages?: SupportMessage[];
  messages_asc?: SupportMessage[];
}

export interface CreateTicketData {
  category: string;
  message: string;
}

export const getMyTickets = async (): Promise<SupportTicket[]> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/support/tickets`,
  );
  return response.data;
};

export const getTicket = async (id: number): Promise<SupportTicket> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/support/tickets/${id}`,
  );
  return response.data;
};

export const createTicket = async (
  data: CreateTicketData,
): Promise<SupportTicket> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/support/tickets`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
  return response.data;
};

export const cancelTicket = async (id: number): Promise<void> => {
  await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/support/tickets/${id}/cancel`,
    { method: "POST" },
  );
};

export const sendMessage = async (
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

export const getMessages = async (
  ticketId: number,
): Promise<SupportMessage[]> => {
  const response = await authFetch(
    `${process.env.NEXT_PUBLIC_API_URL}/support/tickets/${ticketId}/messages`,
  );
  return response.data;
};
