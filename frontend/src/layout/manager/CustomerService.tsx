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
import dynamic from "next/dynamic";
const ResolveTicketDialog = dynamic(
  () =>
    import("@/layout/manager/ResolveTicketDialog").then(
      (mod) => mod.ResolveTicketDialog
    ),
  { ssr: false }
);
const CancelTicketDialog = dynamic(
  () =>
    import("@/layout/manager/CancelTicketDialog").then(
      (mod) => mod.CancelTicketDialog
    ),
  { ssr: false }
);
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { startPolling } from "@/lib/polling";
import { formatTicketId } from "@/lib/booking";
import {
  mergeSupportMessages,
  mergeSupportTickets,
  SUPPORT_TEXT_MAX_LENGTH,
} from "@/lib/support";
import {
  getLiveQueue,
  getQueueHistory,
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

function isTerminalTicketCurrent(
  terminalTicket: SupportTicket,
  liveTicket: SupportTicket,
): boolean {
  return (
    new Date(terminalTicket.updated_at).getTime() >=
    new Date(liveTicket.updated_at).getTime()
  );
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
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMyActiveTicketRef = useRef<number | null>(null);
  const messageTicketIdRef = useRef<number | null>(null);
  const lastMessageIdRef = useRef(0);
  const historyControllerRef = useRef<AbortController | null>(null);
  const queueMutationVersionRef = useRef(0);
  const queueMutationPendingRef = useRef(false);
  const queueRef = useRef<QueueResponse | null>(null);
  const liveTicketIdsRef = useRef(new Set<number>());
  const tabViewRef = useRef<TabView>("queue");
  const refreshHistoryRef = useRef<(() => void) | null>(null);
  const historyCheckedAtRef = useRef<string | null>(null);
  const historyRequestVersionRef = useRef(0);

  const fetchQueue = useCallback(async (
    signal?: AbortSignal,
    allowDuringMutation = false,
  ) => {
    if (queueMutationPendingRef.current && !allowDuringMutation) return;
    const mutationVersion = queueMutationVersionRef.current;

    try {
      const data = await getLiveQueue(signal);
      if (
        (queueMutationPendingRef.current && !allowDuringMutation) ||
        mutationVersion !== queueMutationVersionRef.current
      ) {
        return;
      }

      const currentQueue = queueRef.current;
      const terminalTickets = new Map(
        [
          ...(currentQueue?.resolved ?? []),
          ...(currentQueue?.cancelled ?? []),
        ].map((ticket) => [ticket.id, ticket]),
      );
      const waiting = data.waiting.filter((ticket) => {
        const terminalTicket = terminalTickets.get(ticket.id);
        return !terminalTicket || !isTerminalTicketCurrent(terminalTicket, ticket);
      });
      const active = data.active.filter((ticket) => {
        const terminalTicket = terminalTickets.get(ticket.id);
        return !terminalTicket || !isTerminalTicketCurrent(terminalTicket, ticket);
      });
      const liveTickets = new Map(
        [...waiting, ...active].map((ticket) => [ticket.id, ticket]),
      );
      const resolved = (currentQueue?.resolved ?? []).filter((ticket) => {
        const liveTicket = liveTickets.get(ticket.id);
        return !liveTicket || isTerminalTicketCurrent(ticket, liveTicket);
      });
      const cancelled = (currentQueue?.cancelled ?? []).filter((ticket) => {
        const liveTicket = liveTickets.get(ticket.id);
        return !liveTicket || isTerminalTicketCurrent(ticket, liveTicket);
      });
      const nextQueue = { waiting, active, resolved, cancelled };
      queueRef.current = nextQueue;
      setQueue(nextQueue);

      const nextLiveTicketIds = new Set(liveTickets.keys());
      const removedLiveTicket = Array.from(liveTicketIdsRef.current).some(
        (ticketId) => !nextLiveTicketIds.has(ticketId),
      );
      liveTicketIdsRef.current = nextLiveTicketIds;

      if (removedLiveTicket && tabViewRef.current === "history") {
        refreshHistoryRef.current?.();
      }

      const myTicket = active.find(
        (t) => t.assigned_to_id === authUser?.id,
      );
      setMyActiveTicket((current) => {
        if (!myTicket) return null;
        return current?.id === myTicket.id ? current : myTicket;
      });
    } catch (error) {
      if (signal && !allowDuringMutation) throw error;
    } finally {
      setLoading(false);
    }
  }, [authUser?.id]);

  useEffect(() => {
    return startPolling(fetchQueue, 10000);
  }, [fetchQueue]);

  useEffect(() => {
    if (myActiveTicket && prevMyActiveTicketRef.current === null) {
      tabViewRef.current = "chat";
      setTabView("chat");
    }
    prevMyActiveTicketRef.current = myActiveTicket?.id ?? null;
  }, [myActiveTicket]);

  const activeTicketId = myActiveTicket?.id ?? null;

  const fetchMessages = useCallback(async (signal?: AbortSignal) => {
    if (!activeTicketId) {
      setMessages([]);
      return;
    }

    const isNewTicket = messageTicketIdRef.current !== activeTicketId;
    if (isNewTicket) {
      messageTicketIdRef.current = activeTicketId;
      lastMessageIdRef.current = 0;
      setMessages([]);
    }

    try {
      const data = await getTicketMessages(activeTicketId, {
        afterId:
          lastMessageIdRef.current > 0
            ? lastMessageIdRef.current
            : undefined,
        signal,
      });
      if (messageTicketIdRef.current !== activeTicketId) return;

      setMessages((current) => mergeSupportMessages(current, data));
      if (data.length > 0) {
        lastMessageIdRef.current = Math.max(
          lastMessageIdRef.current,
          ...data.map((message) => message.id),
        );
      }
    } catch (error) {
      if (signal?.aborted) return;
      throw error;
    }
  }, [activeTicketId]);

  useEffect(() => {
    const shouldPollMessages = activeTicketId !== null && tabView === "chat";

    if (shouldPollMessages) {
      return startPolling(fetchMessages, 3000);
    }

    if (activeTicketId === null) {
      setMessages([]);
      messageTicketIdRef.current = null;
      lastMessageIdRef.current = 0;
    }
  }, [activeTicketId, fetchMessages, tabView]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleAccept = async (ticketId: number) => {
    if (queueMutationPendingRef.current) return;
    queueMutationPendingRef.current = true;
    queueMutationVersionRef.current += 1;

    try {
      await acceptTicket(ticketId);
      await fetchQueue(undefined, true);
      toast.success("Ticket accepted");
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || "Failed to accept ticket");
    } finally {
      queueMutationPendingRef.current = false;
    }
  };

  const handleSendMessage = async () => {
    const messageText = chatInput.trim();
    if (!messageText || !myActiveTicket || sending) return;
    if (messageText.length > SUPPORT_TEXT_MAX_LENGTH) {
      toast.error(`Messages must not exceed ${SUPPORT_TEXT_MAX_LENGTH} characters.`);
      return;
    }

    try {
      setSending(true);
      const message = await sendMessageAsStaff(myActiveTicket.id, messageText);
      setMessages((current) => mergeSupportMessages(current, [message]));
      setChatInput("");
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
    if (!myActiveTicket || queueMutationPendingRef.current) return;
    queueMutationPendingRef.current = true;
    queueMutationVersionRef.current += 1;

    try {
      await resolveTicketFromDialog(myActiveTicket.id, data);
      setShowResolveDialog(false);
      await fetchQueue(undefined, true);
      toast.success("Ticket resolved");
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || "Failed to resolve ticket");
    } finally {
      queueMutationPendingRef.current = false;
    }
  };

  const handleCancel = async (reason: string) => {
    if (!myActiveTicket || queueMutationPendingRef.current) return;

    setIsCancelling(true);
    queueMutationPendingRef.current = true;
    queueMutationVersionRef.current += 1;
    try {
      await cancelTicketAsStaff(myActiveTicket.id, reason);
      setShowCancelDialog(false);
      await fetchQueue(undefined, true);
      toast.success("Ticket cancelled");
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || "Failed to cancel ticket");
    } finally {
      queueMutationPendingRef.current = false;
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

  const fetchHistory = useCallback(async (
    signal?: AbortSignal,
    updatedAfter?: string,
    page = 1,
  ) => {
    const requestVersion = historyRequestVersionRef.current + 1;
    historyRequestVersionRef.current = requestVersion;

    if (!updatedAfter && page === 1) {
      setHistoryLoading(true);
    } else if (!updatedAfter) {
      setHistoryLoadingMore(true);
    }

    try {
      const data = await getQueueHistory({ signal, updatedAfter, page });
      if (requestVersion !== historyRequestVersionRef.current) return;

      const currentQueue = queueRef.current;
      const liveTickets = new Map(
        [
          ...(currentQueue?.waiting ?? []),
          ...(currentQueue?.active ?? []),
        ].map((ticket) => [ticket.id, ticket]),
      );
      const resolvedTickets = updatedAfter || page > 1
        ? mergeSupportTickets(currentQueue?.resolved ?? [], data.resolved)
        : data.resolved;
      const cancelledTickets = updatedAfter || page > 1
        ? mergeSupportTickets(currentQueue?.cancelled ?? [], data.cancelled)
        : data.cancelled;
      const terminalTickets = new Map(
        [...resolvedTickets, ...cancelledTickets].map((ticket) => [ticket.id, ticket]),
      );
      const waiting = (currentQueue?.waiting ?? []).filter((ticket) => {
        const terminalTicket = terminalTickets.get(ticket.id);
        return !terminalTicket || !isTerminalTicketCurrent(terminalTicket, ticket);
      });
      const active = (currentQueue?.active ?? []).filter((ticket) => {
        const terminalTicket = terminalTickets.get(ticket.id);
        return !terminalTicket || !isTerminalTicketCurrent(terminalTicket, ticket);
      });
      const resolved = resolvedTickets.filter((ticket) => {
        const liveTicket = liveTickets.get(ticket.id);
        return !liveTicket || isTerminalTicketCurrent(ticket, liveTicket);
      });
      const cancelled = cancelledTickets.filter((ticket) => {
        const liveTicket = liveTickets.get(ticket.id);
        return !liveTicket || isTerminalTicketCurrent(ticket, liveTicket);
      });
      const nextQueue = { waiting, active, resolved, cancelled };
      queueRef.current = nextQueue;
      setQueue(nextQueue);
      if (!updatedAfter) {
        setHistoryPage(data.history_page ?? page);
        setHistoryHasMore(Boolean(data.history_has_more));
      }
      if (
        data.checked_at &&
        (!historyCheckedAtRef.current ||
          new Date(data.checked_at).getTime() >
            new Date(historyCheckedAtRef.current).getTime())
      ) {
        historyCheckedAtRef.current = data.checked_at;
      }
    } catch (error) {
      if (updatedAfter) throw error;
    } finally {
      if (!updatedAfter && page === 1 && !signal?.aborted) {
        setHistoryLoading(false);
      } else if (!updatedAfter && !signal?.aborted) {
        setHistoryLoadingMore(false);
      }
    }
  }, []);

  const refreshHistory = useCallback(() => {
    historyControllerRef.current?.abort();
    const controller = new AbortController();
    historyControllerRef.current = controller;
    setHistoryPage(1);
    void fetchHistory(controller.signal);
  }, [fetchHistory]);

  const loadMoreHistory = () => {
    if (historyLoadingMore || !historyHasMore) return;

    historyControllerRef.current?.abort();
    const controller = new AbortController();
    historyControllerRef.current = controller;
    void fetchHistory(controller.signal, undefined, historyPage + 1);
  };

  useEffect(() => {
    refreshHistoryRef.current = refreshHistory;
    return () => {
      refreshHistoryRef.current = null;
    };
  }, [refreshHistory]);

  useEffect(() => {
    if (tabView !== "history") return;

    return startPolling(async (signal) => {
      const updatedAfter = historyCheckedAtRef.current;
      if (!updatedAfter) return;
      await fetchHistory(signal, updatedAfter);
    }, 60000);
  }, [fetchHistory, tabView]);

  const handleTabChange = (tab: TabView) => {
    tabViewRef.current = tab;
    setTabView(tab);
    if (tab !== "history") {
      historyControllerRef.current?.abort();
      historyControllerRef.current = null;
      return;
    }

    refreshHistory();
  };

  useEffect(() => {
    return () => historyControllerRef.current?.abort();
  }, []);

  const historyTickets = queue
    ? [...queue.resolved, ...queue.cancelled]
    : [];

  const filteredHistory = historyTickets.filter((t) => {
    if (historyFilter !== "all" && t.status !== historyFilter) return false;
    if (historySearch) {
      const q = historySearch.toLowerCase();
      const name = t.customer?.fullname?.toLowerCase() || "";
      const category = t.category
        ? (CONCERN_CATEGORIES[t.category] ?? t.category).toLowerCase()
        : "";
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
        <p className="text-gray-500 mt-1">
          Manage customer support tickets and conversations
        </p>
      </div>

      <div className="px-4 sm:px-6 pb-0 flex gap-1">
        {(["queue", "chat", "history"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => handleTabChange(tab)}
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
                      maxLength={SUPPORT_TEXT_MAX_LENGTH}
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
                    {historyLoading ? (
                      <div className="flex justify-center p-8">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                      </div>
                    ) : filteredHistory.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-sm">
                        No {historyFilter !== "all" ? historyFilter : ""} tickets found.
                      </div>
                    ) : (
                      <>
                        {filteredHistory.map((ticket) => {
                        const categoryLabel = ticket.category
                          ? (CONCERN_CATEGORIES[ticket.category] ?? ticket.category)
                          : "General";

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
                        })}
                        {historyHasMore && (
                          <div className="p-4 text-center">
                            <button
                              type="button"
                              onClick={loadMoreHistory}
                              disabled={historyLoadingMore}
                              className="rounded-md border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {historyLoadingMore ? "Loading..." : "Load older tickets"}
                            </button>
                          </div>
                        )}
                      </>
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
