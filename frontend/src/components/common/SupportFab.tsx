"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  Clock,
  CheckCircle,
  Send,
  X,
  Loader2,
} from "lucide-react";
import { SupportChatSheet } from "@/components/common/SupportChatSheet";
import { SupportChatBubble } from "@/components/common/SupportChatBubble";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getMyTickets,
  createTicket,
  cancelTicket,
  getMessages,
  sendMessage,
  type SupportTicket,
  type SupportMessage,
} from "@/services/customer/support.api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FabState = "idle" | "submitting" | "waiting" | "active" | "resolved";
type SheetTab = "ticketing" | "history";

const CONCERN_CATEGORIES = [
  { value: "appointment_rescheduling", label: "Appointment Rescheduling" },
  { value: "cancellation", label: "Cancellation Request" },
  { value: "service_feedback", label: "Service Feedback" },
  { value: "billing", label: "Billing / Pricing" },
  { value: "general_inquiry", label: "General Inquiry" },
];

const statusIcons: Record<string, typeof MessageCircle> = {
  waiting: Clock,
  active: MessageCircle,
  resolved: CheckCircle,
  cancelled: X,
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

export function SupportFab() {
  const { user } = useAuth();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [fabState, setFabState] = useState<FabState>("idle");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<SheetTab>("ticketing");
  const [newMessage, setNewMessage] = useState("");
  const [concernCategory, setConcernCategory] = useState("");
  const [concernText, setConcernText] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const [historyTickets, setHistoryTickets] = useState<SupportTicket[]>([]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const fetchTicketState = useCallback(async () => {
    try {
      const tickets = await getMyTickets();
      const activeOrWaiting = tickets.find(
        (t) => t.status === "active" || t.status === "waiting",
      );
      const lastResolved = tickets.find((t) => t.status === "resolved");

      if (activeOrWaiting) {
        setTicket(activeOrWaiting);
        if (activeOrWaiting.status === "waiting") {
          setFabState("waiting");
        } else {
          setFabState("active");
        }
      } else if (lastResolved) {
        setTicket(lastResolved);
        setFabState("resolved");
      } else {
        setTicket(null);
        setFabState("idle");
      }
    } catch {
      setFabState("idle");
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchTicketState();

    const interval = setInterval(fetchTicketState, 5000);
    return () => clearInterval(interval);
  }, [user, fetchTicketState]);

  const fetchMessages = useCallback(async () => {
    if (!ticket || ticket.status !== "active") return;

    try {
      const data = await getMessages(ticket.id);
      setMessages(data);
    } catch {}
  }, [ticket]);

  useEffect(() => {
    if (ticket?.status === "active") {
      fetchMessages();
      pollRef.current = setInterval(fetchMessages, 3000);
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    } else {
      if (pollRef.current) clearInterval(pollRef.current);
      setMessages([]);
    }
  }, [ticket?.status, ticket?.id, fetchMessages]);

  const fetchHistoryTickets = useCallback(async () => {
    try {
      const tickets = await getMyTickets();
      setHistoryTickets(tickets);
    } catch {}
  }, []);

  const handleSubmitTicket = async () => {
    if (!concernCategory || !concernText.trim()) return;

    try {
      setFabState("submitting");
      const newTicket = await createTicket({
        category: concernCategory,
        message: concernText.trim(),
      });
      setTicket(newTicket);
      setConcernCategory("");
      setConcernText("");

      if (newTicket.status === "waiting") {
        setFabState("waiting");
      } else {
        setFabState("active");
        const msgs = await getMessages(newTicket.id);
        setMessages(msgs);
      }

      toast.success("Ticket created successfully");
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || "Failed to create ticket");
      setFabState("idle");
    }
  };

  const handleCancelTicket = async () => {
    if (!ticket) return;

    try {
      await cancelTicket(ticket.id);
      setTicket(null);
      setFabState("idle");
      setIsSheetOpen(false);
      toast.success("Ticket cancelled");
    } catch {
      toast.error("Failed to cancel ticket");
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticket || sending) return;

    try {
      setSending(true);
      const msg = await sendMessage(ticket.id, newMessage.trim());
      setMessages((prev) => [...prev, msg]);
      setNewMessage("");
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

  const handleFabClick = () => {
    setSheetTab("ticketing");
    if (fabState === "idle") {
      setIsSheetOpen(true);
    } else if (ticket) {
      if (ticket.status === "active") {
        fetchMessages().then(() => {
          setIsSheetOpen(true);
        });
      } else {
        setIsSheetOpen(true);
      }
    }
    fetchHistoryTickets();
  };

  const FabIcon = MessageCircle;

  const fabColors = {
    idle: "bg-blue-500 hover:bg-blue-600",
    submitting: "bg-blue-500 hover:bg-blue-600",
    waiting: "bg-amber-500 hover:bg-amber-600",
    active: "bg-green-500 hover:bg-green-600",
    resolved: "bg-gray-500 hover:bg-gray-600",
  }[fabState];

  const sheetTitle = {
    idle: "Customer Service",
    submitting: "Customer Service",
    waiting: "Customer Service",
    active: "Customer Service",
    resolved: "Customer Service",
  }[fabState];

  const hasActiveConversation = ticket?.status === "active";

  return (
    <>
      <button
        type="button"
        onClick={handleFabClick}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95",
          fabColors,
          fabState === "active" && "animate-pulse",
        )}
        aria-label="Customer Service"
      >
        <FabIcon className="w-6 h-6 text-white" />
      </button>

      <SupportChatSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={sheetTitle}
      >
        <div className="flex flex-1 flex-col min-h-0">
          <div className="flex border-b border-gray-100 shrink-0">
            <button
              type="button"
              onClick={() => setSheetTab("ticketing")}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors relative",
                sheetTab === "ticketing"
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              Ticketing
              {sheetTab === "ticketing" && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setSheetTab("history");
                fetchHistoryTickets();
              }}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium transition-colors relative",
                sheetTab === "history"
                  ? "text-blue-600"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              History
              {sheetTab === "history" && (
                <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-blue-500 rounded-full" />
              )}
            </button>
          </div>

          {sheetTab === "ticketing" && (
            <>
              {(fabState === "idle" || fabState === "resolved") && (
                <div className="flex flex-1 flex-col p-4 gap-3 overflow-y-auto">
                  <p className="text-sm text-gray-600">
                    Select a concern type and describe your issue.
                  </p>
                  <Select
                    value={concernCategory}
                    onValueChange={setConcernCategory}
                  >
                    <SelectTrigger className="border-gray-200 bg-gray-50 text-sm">
                      <SelectValue placeholder="Select concern type" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONCERN_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Textarea
                    value={concernText}
                    onChange={(e) => setConcernText(e.target.value)}
                    placeholder="Tell us what you need help with..."
                    className="flex-1 min-h-[120px] resize-none border-gray-200 bg-gray-50 text-sm focus-visible:ring-blue-500/20"
                  />
                  <Button
                    type="button"
                    onClick={handleSubmitTicket}
                    disabled={!concernCategory || !concernText.trim()}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit Ticket
                  </Button>
                </div>
              )}

              {fabState === "waiting" && ticket && (
                <div className="flex flex-1 flex-col items-center justify-center p-6 gap-4 text-center">
                  <Clock className="w-12 h-12 text-amber-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      In Queue
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Your ticket is in the queue.
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      A representative will be with you shortly. You cannot send
                      messages until your ticket is active.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelTicket}
                    className="mt-2 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel Ticket
                  </Button>
                </div>
              )}

              {fabState === "active" && (
                <div className="flex flex-1 flex-col min-h-0">
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.length === 0 && (
                      <p className="text-center text-gray-400 text-sm py-8">
                        No messages yet. Start the conversation.
                      </p>
                    )}

                    {messages.map((msg) => (
                      <SupportChatBubble
                        key={msg.id}
                        message={msg.message}
                        isOwn={msg.sender_id === user?.id}
                        senderName={msg.sender.fullname}
                        createdAt={msg.created_at}
                      />
                    ))}

                    <div ref={messagesEndRef} />
                  </div>

                  {hasActiveConversation && (
                    <div className="border-t border-gray-200 p-3 flex gap-2 shrink-0">
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        className="min-h-[40px] max-h-[100px] resize-none border-gray-200 bg-gray-50 text-sm focus-visible:ring-blue-500/20"
                        rows={1}
                      />
                      <Button
                        type="button"
                        size="icon"
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim() || sending}
                        className="shrink-0 bg-blue-500 hover:bg-blue-600 text-white h-10 w-10"
                      >
                        {sending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

            </>
          )}

          {sheetTab === "history" && (
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {historyTickets.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-400">
                    No support tickets yet.
                  </p>
                </div>
              ) : (
                historyTickets.map((t) => {
                  const StatusIcon =
                    statusIcons[t.status as keyof typeof statusIcons] ||
                    MessageCircle;
                  const categoryLabel = CONCERN_CATEGORIES.find(
                    (c) => c.value === t.category,
                  )?.label || t.category;

                  return (
                    <div
                      key={t.id}
                      className="bg-white rounded-xl border border-gray-100 shadow-sm p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center shrink-0">
                          <StatusIcon className="w-4 h-4 text-gray-500" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                            {categoryLabel}
                          </p>
                          <p className="text-xs text-gray-400">
                            {formatDate(t.created_at)}
                          </p>
                          {t.status === "cancelled" && t.cancel_reason && (
                            <p className="text-xs text-red-400 mt-1">
                              Reason: {t.cancel_reason}
                            </p>
                          )}
                        </div>

                        <span
                          className={cn(
                            "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize shrink-0",
                            t.status === "waiting" &&
                              "bg-amber-100 text-amber-700",
                            t.status === "active" &&
                              "bg-green-100 text-green-700",
                            t.status === "resolved" &&
                              "bg-blue-100 text-blue-700",
                            t.status === "cancelled" &&
                              "bg-gray-100 text-gray-600",
                          )}
                        >
                          {statusLabels[t.status] || t.status}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </SupportChatSheet>
    </>
  );
}
