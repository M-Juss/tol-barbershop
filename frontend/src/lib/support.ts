import type {
  SupportMessage,
  SupportTicket,
} from "@/services/customer/support.api";

export function mergeSupportMessages(
  current: SupportMessage[],
  incoming: SupportMessage[],
): SupportMessage[] {
  const messagesById = new Map(
    current.map((message) => [message.id, message]),
  );

  for (const message of incoming) {
    messagesById.set(message.id, message);
  }

  return Array.from(messagesById.values()).sort((a, b) => a.id - b.id);
}

export function mergeSupportTickets(
  current: SupportTicket[],
  incoming: SupportTicket[],
): SupportTicket[] {
  const ticketsById = new Map(
    current.map((ticket) => [ticket.id, ticket]),
  );

  for (const ticket of incoming) {
    ticketsById.set(ticket.id, ticket);
  }

  return Array.from(ticketsById.values()).sort(
    (a, b) =>
      new Date(b.resolved_at ?? b.updated_at).getTime() -
      new Date(a.resolved_at ?? a.updated_at).getTime(),
  );
}
