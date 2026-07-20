"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Clock, CheckCircle, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import {
  getMessages,
  getMyTickets,
  type SupportMessage,
  type SupportTicket,
} from "@/services/customer/support.api";
import { SupportChatBubble } from "@/components/common/SupportChatBubble";
import { cn } from "@/lib/utils";
import { formatTicketId } from "@/lib/booking";

const statusIcons = {
  waiting: Clock,
  active: MessageCircle,
  resolved: CheckCircle,
  cancelled: XCircle,
};

const statusColors: Record<string, string> = {
  waiting: "text-amber-500 bg-amber-50 border-amber-200",
  active: "text-green-500 bg-green-50 border-green-200",
  resolved: "text-blue-500 bg-blue-50 border-blue-200",
  cancelled: "text-gray-500 bg-gray-50 border-gray-200",
};

const statusLabels: Record<string, string> = {
  waiting: "Waiting",
  active: "Active",
  resolved: "Resolved",
  cancelled: "Cancelled",
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SupportHistory() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [messagesByTicket, setMessagesByTicket] = useState<Record<number, SupportMessage[]>>({});
  const [messagesLoadingId, setMessagesLoadingId] = useState<number | null>(null);

  const fetchTickets = useCallback(async (page = 1) => {
    if (page > 1) setLoadingMore(true);

    try {
      const data = await getMyTickets(page);
      setTickets((current) =>
        page === 1 ? data.tickets : [...current, ...data.tickets],
      );
      setCurrentPage(data.meta.current_page);
      setHasMore(data.meta.current_page < data.meta.last_page);
    } catch {
    } finally {
      if (page === 1) setLoading(false);
      else setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const toggleExpand = async (id: number) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }

    setExpandedId(id);
    if (messagesByTicket[id]) return;

    setMessagesLoadingId(id);
    try {
      const messages = await getMessages(id);
      setMessagesByTicket((current) => ({ ...current, [id]: messages }));
    } catch {
      setMessagesByTicket((current) => ({ ...current, [id]: [] }));
    } finally {
      setMessagesLoadingId(null);
    }
  };

  return (
    <div className="w-full h-full bg-slate-100 p-4 sm:p-6 pb-24 font-sans">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Support History
        </h1>
        <p className="text-gray-500 mt-1">
          View all your past support conversations.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-100">
          Loading...
        </div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-100">
          <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No support tickets yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {tickets.map((ticket) => {
            const StatusIcon = statusIcons[ticket.status as keyof typeof statusIcons] || MessageCircle;

            return (
              <div
                key={ticket.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => toggleExpand(ticket.id)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center border",
                      statusColors[ticket.status as keyof typeof statusColors] || "text-gray-500 bg-gray-50 border-gray-200",
                    )}
                  >
                    <StatusIcon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {ticket.subject || "No subject"}
                      <span className="ml-2 inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-gray-500">
                        {formatTicketId(ticket.id)}
                      </span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(ticket.created_at)}
                    </p>
                    {ticket.status === "cancelled" && (
                      <>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Cancelled: {formatDate(ticket.updated_at)}{ticket.assigned_to ? ` by ${ticket.assigned_to.fullname}` : " by you"}
                        </p>
                        {ticket.cancel_reason && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Reason: {ticket.cancel_reason}
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <span
                    className={cn(
                      "text-[11px] font-medium px-2 py-0.5 rounded-full capitalize",
                      ticket.status === "waiting" && "bg-amber-100 text-amber-700",
                      ticket.status === "active" && "bg-green-100 text-green-700",
                      ticket.status === "resolved" && "bg-blue-100 text-blue-700",
                      ticket.status === "cancelled" && "bg-gray-100 text-gray-600",
                    )}
                  >
                    {statusLabels[ticket.status as keyof typeof statusLabels] || ticket.status}
                  </span>

                  {expandedId === ticket.id ? (
                    <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                </button>

                {expandedId === ticket.id && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-3 max-h-[400px] overflow-y-auto">
                    {ticket.status === "resolved" && ticket.resolved_at && (
                      <p className="text-xs text-gray-400">
                        Resolved on {formatDate(ticket.resolved_at)}
                        {ticket.assigned_to && <> by {ticket.assigned_to.fullname}</>}
                      </p>
                    )}

                    {messagesLoadingId === ticket.id && (
                      <p className="text-center text-xs text-gray-400">Loading conversation...</p>
                    )}
                    {messagesByTicket[ticket.id]?.map((msg) => (
                      <SupportChatBubble
                        key={msg.id}
                        message={msg.message}
                        isOwn={msg.sender.role === "customer"}
                        senderName={msg.sender.fullname}
                        createdAt={msg.created_at}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {hasMore && (
            <button
              type="button"
              onClick={() => fetchTickets(currentPage + 1)}
              disabled={loadingMore}
              className="w-full rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingMore ? "Loading..." : "Load older tickets"}
            </button>
          )}
        </div>
      )}

      <div className="my-10" />
    </div>
  );
}
