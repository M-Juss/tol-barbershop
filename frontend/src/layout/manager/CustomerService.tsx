"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  CheckCircle,
  XCircle,
  Send,
  Loader2,
  User,
  X,
  ChevronRight,
  Search,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SupportChatBubble } from "@/components/common/SupportChatBubble";
import { ResolveTicketDialog } from "@/layout/manager/ResolveTicketDialog";
import { CancelTicketDialog } from "@/layout/manager/CancelTicketDialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatTicketId } from "@/lib/booking";
import {
  getQueue,
  acceptTicket,
  sendMessageAsStaff,
  getTicketMessages,
  cancelTicketAsStaff,
  type QueueResponse,
  type ResolveTicketData,
} from "@/services/manager/support.api";
import type { SupportTicket, SupportMessage } from "@/services/customer/support.api";

type TabView = "queue" | "chat" | "history";

const CONCERN_CATEGORIES: Record<string, string> = {
  appointment_rescheduling: "Appointment Rescheduling",
  cancellation: "Cancellation Request",
  service_feedback: "Service Feedback",
  billing: "Billing / Pricing",
  general_inquiry: "General Inquiry",
};

function formatDateShort(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return formatDateShort(dateString);
}

export function CustomerService() {
  const { user: authUser } = useAuth();
  const [queue, setQueue] = useState<QueueResponse | null>(null);
  const [myActiveTicket, setMyActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [historyFilter, setHistoryFilter] = useState("resolved");
  const [historySearch, setHistorySearch] = useState("");
  const [historyDetailTicket, setHistoryDetailTicket] = useState<SupportTicket | null>(null);
  const [historyDetailMessages, setHistoryDetailMessages] = useState<SupportMessage[]>([]);
  const [historyDetailLoading, setHistoryDetailLoading] = useState(false);
  const [tabView, setTabView] = useState<TabView>("queue");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const prevMyActiveTicketRef = useRef<number | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      const data = await getQueue();
      setQueue(data);

      const myTicket = data.active.find(
        (t) => t.assigned_to_id === authUser?.id,
      );
      setMyActiveTicket(myTicket || null);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [authUser?.id]);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  useEffect(() => {
    if (myActiveTicket && prevMyActiveTicketRef.current === null) {
      setTabView("chat");
    }
    prevMyActiveTicketRef.current = myActiveTicket?.id ?? null;
  }, [myActiveTicket]);

  const fetchMessages = useCallback(async () => {
    if (!myActiveTicket) {
      setMessages([]);
      return;
    }

    try {
      const data = await getTicketMessages(myActiveTicket.id);
      setMessages(data);
    } catch {}
  }, [myActiveTicket]);

  useEffect(() => {
    if (myActiveTicket) {
      fetchMessages();
      pollRef.current = setInterval(fetchMessages, 3000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
      setMessages([]);
    }
  }, [myActiveTicket, fetchMessages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleAccept = async (ticketId: number) => {
    try {
      await acceptTicket(ticketId);
      await fetchQueue();
      toast.success("Ticket accepted");
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || "Failed to accept ticket");
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !myActiveTicket || sending) return;

    try {
      setSending(true);
      await sendMessageAsStaff(myActiveTicket.id, chatInput.trim());
      setChatInput("");
      await fetchMessages();
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResolve = async (data: ResolveTicketData) => {
    if (!myActiveTicket) return;

    try {
      await resolveTicketFromDialog(myActiveTicket.id, data);
      setShowResolveDialog(false);
      await fetchQueue();
      toast.success("Ticket resolved");
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || "Failed to resolve ticket");
    }
  };

  const handleCancel = async (reason: string) => {
    if (!myActiveTicket) return;

    setIsCancelling(true);
    try {
      await cancelTicketAsStaff(myActiveTicket.id, reason);
      setShowCancelDialog(false);
      await fetchQueue();
      toast.success("Ticket cancelled");
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || "Failed to cancel ticket");
    } finally {
      setIsCancelling(false);
    }
  };

  const [isResolving, setIsResolving] = useState(false);

  const resolveTicketFromDialog = async (
    id: number,
    data: ResolveTicketData,
  ) => {
    setIsResolving(true);
    try {
      const { resolveTicket } = await import("@/services/manager/support.api");
      await resolveTicket(id, data);
    } finally {
      setIsResolving(false);
    }
  };

  const [isCancelling, setIsCancelling] = useState(false);

  const historyTickets = queue
    ? [...queue.resolved, ...queue.cancelled]
    : [];

  const filteredHistory = historyTickets.filter((t) => {
    if (historyFilter !== "all" && t.status !== historyFilter) return false;
    if (historySearch) {
      const q = historySearch.toLowerCase();
      const name = t.customer?.fullname?.toLowerCase() || "";
      const category = CONCERN_CATEGORIES[t.category]?.toLowerCase() || t.category?.toLowerCase() || "";
      if (!name.includes(q) && !category.includes(q)) return false;
    }
    return true;
  });

  const handleViewTicketDetail = async (ticket: SupportTicket) => {
    setHistoryDetailTicket(ticket);
    setHistoryDetailLoading(true);
    try {
      const msgs = await getTicketMessages(ticket.id);
      setHistoryDetailMessages(msgs);
    } catch {
      setHistoryDetailMessages([]);
    } finally {
      setHistoryDetailLoading(false);
    }
  };

  const handleBackToHistoryList = () => {
    setHistoryDetailTicket(null);
    setHistoryDetailMessages([]);
  };

  const waitingCount = queue?.waiting.length || 0;

  if (loading) {
    return (
      <div className="w-full h-full bg-slate-100 p-4 sm:p-6 font-sans flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-slate-100 font-sans flex flex-col">
      <div className="p-4 sm:p-6 pb-0">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Customer Service
        </h1>
      </div>

      <div className="px-4 sm:px-6 pb-0 flex gap-1">
        {(["queue", "chat", "history"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setTabView(tab)}
            className={cn(
              "py-2 px-4 text-sm font-medium rounded-t-lg capitalize transition-colors",
              tabView === tab
                ? "bg-white text-gray-900 border border-b-0 border-gray-200"
                : "text-gray-500 hover:text-gray-700 bg-slate-100 border border-transparent",
            )}
          >
            {tab === "queue" && `Queue (${waitingCount})`}
            {tab === "chat" && "Chat"}
            {tab === "history" && "History"}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 sm:px-6 pb-4 sm:pb-6 overflow-hidden">
        <div className="h-full bg-white rounded-b-xl rounded-tr-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          {tabView === "queue" && (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-900">
                  Waiting Queue ({waitingCount})
                </h2>
              </div>

              {queue?.waiting.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  No waiting tickets.
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {queue?.waiting.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {ticket.customer_name_snapshot ?? ticket.customer?.fullname ?? "Unknown"}
                          <span className="ml-2 inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-gray-500">
                            {formatTicketId(ticket.id)}
                          </span>
                        </p>
                        <p className="text-xs text-gray-400">
                          {timeAgo(ticket.created_at)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={!!myActiveTicket}
                        onClick={() => handleAccept(ticket.id)}
                        className={cn(
                          "shrink-0 text-xs h-7 px-3",
                          myActiveTicket
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-blue-500 hover:bg-blue-600 text-white",
                        )}
                        title={
                          myActiveTicket
                            ? "Resolve your current ticket first"
                            : "Accept ticket"
                        }
                      >
                        Accept
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="p-4 border-b border-gray-100 mt-2">
                <h2 className="text-sm font-semibold text-gray-900">
                  Active ({queue?.active.length || 0})
                </h2>
              </div>

              {queue?.active.length === 0 ? (
                <div className="p-6 text-center text-gray-400 text-sm">
                  No active tickets.
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {queue?.active.map((ticket) => (
                    <div
                      key={ticket.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full shrink-0",
                          ticket.assigned_to_id === authUser?.id
                            ? "bg-green-500"
                            : "bg-blue-400",
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {ticket.customer_name_snapshot ?? ticket.customer?.fullname ?? "Unknown"}
                          <span className="ml-2 inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-gray-500">
                            {formatTicketId(ticket.id)}
                          </span>
                        </p>
                        <p className="text-xs text-gray-400">
                          {ticket.assigned_to_id === authUser?.id
                            ? "You"
                            : ticket.assigned_to?.fullname || "Unassigned"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tabView === "chat" && (
            <>
              {myActiveTicket ? (
                <>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-sm font-medium text-gray-900">
                        {myActiveTicket.customer?.fullname || "Customer"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setShowCancelDialog(true)}
                        className="text-xs h-7 border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="w-3.5 h-3.5 mr-1" />
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setShowResolveDialog(true)}
                        className="text-xs h-7 border-green-200 text-green-600 hover:bg-green-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Resolve
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 && (
                      <p className="text-center text-gray-400 text-sm py-8">
                        No messages yet.
                      </p>
                    )}

                    {messages.map((msg) => (
                      <SupportChatBubble
                        key={msg.id}
                        message={msg.message}
                        isOwn={msg.sender_id === authUser?.id}
                        senderName={msg.sender_name_snapshot ?? msg.sender.fullname}
                        createdAt={msg.created_at}
                      />
                    ))}

                    <div ref={messagesEndRef} />
                  </div>

                  <div className="border-t border-gray-200 p-3 flex gap-2 shrink-0">
                    <Textarea
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a reply..."
                      className="min-h-[40px] max-h-[100px] resize-none border-gray-200 bg-gray-50 text-sm focus-visible:ring-blue-500/20"
                      rows={1}
                    />
                    <Button
                      type="button"
                      size="icon"
                      onClick={handleSendMessage}
                      disabled={!chatInput.trim() || sending}
                      className="shrink-0 bg-blue-500 hover:bg-blue-600 text-white h-10 w-10"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                  <div className="text-center p-6">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>Accept a ticket from the waiting queue to start chatting.</p>
                  </div>
                </div>
              )}
            </>
          )}

          {tabView === "history" && (
            <>
              {historyDetailTicket ? (
                <div className="flex flex-col min-h-0">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
                    <button
                      type="button"
                      onClick={handleBackToHistoryList}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back
                    </button>
                    <span className="text-sm font-semibold text-gray-900 ml-2">
                      {historyDetailTicket.customer?.fullname || "Unknown"}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-gray-500">
                      {formatTicketId(historyDetailTicket.id)}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
                        historyDetailTicket.status === "resolved" &&
                          "bg-blue-100 text-blue-700",
                        historyDetailTicket.status === "cancelled" &&
                          "bg-gray-100 text-gray-600",
                      )}
                    >
                      {historyDetailTicket.status}
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {(historyDetailTicket.status === "resolved" || historyDetailTicket.status === "cancelled") && historyDetailTicket.resolved_at && (
                      <div className="flex items-center justify-between text-xs">
                        <p className={historyDetailTicket.status === "resolved" ? "text-green-600 font-medium" : "text-gray-500"}>
                          {historyDetailTicket.status === "resolved" ? "Resolved" : "Cancelled"} {formatDateShort(historyDetailTicket.resolved_at)}
                        </p>
                        <p className="text-gray-500">
                          by {historyDetailTicket.assigned_to?.fullname ?? historyDetailTicket.customer_name_snapshot ?? historyDetailTicket.customer?.fullname ?? "Unknown"}
                        </p>
                      </div>
                    )}
                    {historyDetailTicket.cancel_reason && (
                      <p className="text-xs text-gray-500">
                        Reason: {historyDetailTicket.cancel_reason}
                      </p>
                    )}
                    {historyDetailTicket.resolution_notes && (
                      <p className="text-xs text-gray-500">
                        Notes: {historyDetailTicket.resolution_notes}
                      </p>
                    )}

                    {historyDetailLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      </div>
                    ) : historyDetailMessages.length === 0 ? (
                      <p className="text-center text-gray-400 text-sm py-8">
                        No messages in this conversation.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {historyDetailMessages.map((msg) => (
                          <SupportChatBubble
                            key={msg.id}
                            message={msg.message}
                            isOwn={msg.sender_id === authUser?.id}
                            senderName={msg.sender_name_snapshot ?? msg.sender.fullname}
                            createdAt={msg.created_at}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col min-h-0">
                  <div className="p-4 border-b border-gray-100 space-y-3">
                    <h2 className="text-sm font-semibold text-gray-900">
                      Conversation History
                    </h2>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                        <Input
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          placeholder="Search by name or category..."
                          className="pl-8 h-8 text-xs border-gray-200"
                        />
                      </div>
                      <div className="w-full sm:w-36">
                        <Select value={historyFilter} onValueChange={setHistoryFilter}>
                          <SelectTrigger className="w-full h-8 text-xs border-gray-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="all">All</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
                    {filteredHistory.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-sm">
                        No {historyFilter !== "all" ? historyFilter : ""} tickets found.
                      </div>
                    ) : (
                      filteredHistory.map((ticket) => {
                        const categoryLabel = CONCERN_CATEGORIES[ticket.category] || ticket.category || "General";

                        return (
                          <button
                            key={ticket.id}
                            type="button"
                            onClick={() => handleViewTicketDetail(ticket)}
                            className="w-full flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                          >
                            {ticket.status === "resolved" ? (
                              <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                            ) : (
                              <X className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {ticket.customer_name_snapshot ?? ticket.customer?.fullname ?? "Unknown"}
                                <span className="ml-2 inline-flex items-center rounded-md bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-gray-500">
                                  {formatTicketId(ticket.id)}
                                </span>
                              </p>
                              <p className="text-[10px] text-gray-500 truncate">
                                {categoryLabel}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize shrink-0",
                                ticket.status === "resolved" &&
                                  "bg-blue-100 text-blue-700",
                                ticket.status === "cancelled" &&
                                  "bg-gray-100 text-gray-600",
                              )}
                            >
                              {ticket.status}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <ResolveTicketDialog
        open={showResolveDialog}
        onOpenChange={setShowResolveDialog}
        onResolve={handleResolve}
        isResolving={isResolving}
        customerName={myActiveTicket?.customer?.fullname || "Customer"}
      />

      <CancelTicketDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        onCancel={handleCancel}
        isCancelling={isCancelling}
        customerName={myActiveTicket?.customer?.fullname || "Customer"}
      />
    </div>
  );
}
