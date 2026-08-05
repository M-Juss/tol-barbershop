"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  Headset,
  Clock,
  CheckCircle,
  Send,
  X,
  Loader2,
} from "lucide-react";
import { SupportChatSheet } from "@/components/common/SupportChatSheet";
import { SupportChatBubble } from "@/components/common/SupportChatBubble";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatTicketId } from "@/lib/booking";
import {
  getMyTickets,
  createTicket,
  cancelTicket,
  getMessages,
  sendMessage,
  type SupportTicket,
  type SupportTicketState,
  type SupportMessage,
} from "@/services/customer/support.api";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeEvent } from "@/contexts/RealtimeContext";
import { toast } from "sonner";
import { startPolling } from "@/lib/polling";
import { cn } from "@/lib/utils";
import {
  mergeSupportMessages,
  SUPPORT_CATEGORY_MAX_LENGTH,
  SUPPORT_TEXT_MAX_LENGTH,
} from "@/lib/support";
import { getNavigationSummary } from "@/services/shared/navigation.api";

type FabState = "idle" | "submitting" | "waiting" | "active" | "resolved";
type SheetTab = "ticketing" | "history";
type MobileFabPosition = {
  x: number;
  y: number;
};
type FabDragState = {
  pointerId: number;
  startPointerX: number;
  startPointerY: number;
  startPositionX: number;
  startPositionY: number;
  moved: boolean;
};

const MOBILE_BREAKPOINT = 768;
const FAB_SIZE = 56;
const MOBILE_VIEWPORT_PADDING = 16;
const MOBILE_NAV_CLEARANCE = 112;

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

function clampMobileFabPosition(
  position: MobileFabPosition,
): MobileFabPosition {
  const viewportWidth =
    window.visualViewport?.width ?? document.documentElement.clientWidth;
  const viewportHeight =
    window.visualViewport?.height ?? document.documentElement.clientHeight;
  const maxX = Math.max(
    MOBILE_VIEWPORT_PADDING,
    viewportWidth - FAB_SIZE - MOBILE_VIEWPORT_PADDING,
  );
  const maxY = Math.max(
    MOBILE_VIEWPORT_PADDING,
    viewportHeight - FAB_SIZE - MOBILE_NAV_CLEARANCE,
  );

  return {
    x: Math.min(Math.max(position.x, MOBILE_VIEWPORT_PADDING), maxX),
    y: Math.min(Math.max(position.y, MOBILE_VIEWPORT_PADDING), maxY),
  };
}

function getInitialMobileFabPosition(): MobileFabPosition {
  const viewportWidth =
    window.visualViewport?.width ?? document.documentElement.clientWidth;
  const viewportHeight =
    window.visualViewport?.height ?? document.documentElement.clientHeight;

  return clampMobileFabPosition({
    x: viewportWidth - FAB_SIZE - MOBILE_VIEWPORT_PADDING,
    y: viewportHeight * 0.58 - FAB_SIZE / 2,
  });
}

function snapMobileFabPositionToSide(
  position: MobileFabPosition,
): MobileFabPosition {
  const clampedPosition = clampMobileFabPosition(position);
  const viewportWidth =
    window.visualViewport?.width ?? document.documentElement.clientWidth;
  const maxX = Math.max(
    MOBILE_VIEWPORT_PADDING,
    viewportWidth - FAB_SIZE - MOBILE_VIEWPORT_PADDING,
  );
  const isCloserToLeft =
    clampedPosition.x + FAB_SIZE / 2 < viewportWidth / 2;

  return {
    x: isCloserToLeft ? MOBILE_VIEWPORT_PADDING : maxX,
    y: clampedPosition.y,
  };
}

export function SupportFab() {
  const { user } = useAuth();
  const [ticket, setTicket] = useState<SupportTicketState | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [fabState, setFabState] = useState<FabState>("idle");
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState<SheetTab>("ticketing");
  const [newMessage, setNewMessage] = useState("");
  const [concernCategory, setConcernCategory] = useState("");
  const [concernText, setConcernText] = useState("");
  const [sending, setSending] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageTicketIdRef = useRef<number | null>(null);
  const lastMessageIdRef = useRef(0);
  const ticketMutationVersionRef = useRef(0);
  const ticketMutationPendingRef = useRef(false);
  const [mobilePosition, setMobilePosition] =
    useState<MobileFabPosition | null>(null);
  const dragStateRef = useRef<FabDragState | null>(null);
  const suppressClickRef = useRef(false);

  const [historyTickets, setHistoryTickets] = useState<SupportTicket[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);

  useEffect(() => {
    const updateMobilePosition = () => {
      if (window.innerWidth >= MOBILE_BREAKPOINT) {
        setMobilePosition(null);
        dragStateRef.current = null;
        return;
      }

      setMobilePosition((current) =>
        current
          ? snapMobileFabPositionToSide(current)
          : getInitialMobileFabPosition(),
      );
    };

    updateMobilePosition();
    window.addEventListener("resize", updateMobilePosition);
    window.visualViewport?.addEventListener("resize", updateMobilePosition);

    return () => {
      window.removeEventListener("resize", updateMobilePosition);
      window.visualViewport?.removeEventListener(
        "resize",
        updateMobilePosition,
      );
    };
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const fetchTicketState = useCallback(async (signal?: AbortSignal, force = false) => {
    if (ticketMutationPendingRef.current) return;
    const mutationVersion = ticketMutationVersionRef.current;

    try {
      const summary = await getNavigationSummary(signal, force);
      const currentTicket = summary.support_ticket;
      if (
        ticketMutationPendingRef.current ||
        mutationVersion !== ticketMutationVersionRef.current
      ) {
        return;
      }

      if (currentTicket) {
        setTicket((ticket) =>
          ticket?.id === currentTicket.id &&
          ticket.status === currentTicket.status
            ? ticket
            : currentTicket,
        );
        if (currentTicket.status === "waiting") {
          setFabState("waiting");
        } else if (currentTicket.status === "active") {
          setFabState("active");
        } else {
          setFabState("resolved");
        }
      } else {
        setTicket((ticket) => (ticket === null ? ticket : null));
        setFabState("idle");
      }
    } catch (error) {
      const isAbortError =
        error instanceof DOMException && error.name === "AbortError";
      if (!isAbortError) {
        setFabState("idle");
      }
      throw error;
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();
    void fetchTicketState(controller.signal);

    return () => controller.abort();
  }, [user, fetchTicketState]);

  useRealtimeEvent(
    "support_tickets",
    (signal) => fetchTicketState(signal, true),
    Boolean(user),
  );

  const fetchMessages = useCallback(async (signal?: AbortSignal) => {
    if (!ticket || ticket.status !== "active") return;

    const ticketId = ticket.id;
    const isNewTicket = messageTicketIdRef.current !== ticketId;
    if (isNewTicket) {
      messageTicketIdRef.current = ticketId;
      lastMessageIdRef.current = 0;
      setMessages([]);
    }

    try {
      const data = await getMessages(ticketId, {
        afterId:
          lastMessageIdRef.current > 0
            ? lastMessageIdRef.current
            : undefined,
        signal,
      });
      if (messageTicketIdRef.current !== ticketId) return;

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
  }, [ticket]);

  useEffect(() => {
    const shouldPollMessages =
      ticket?.status === "active" &&
      isSheetOpen &&
      sheetTab === "ticketing";

    if (shouldPollMessages) {
      return startPolling(fetchMessages, 5000);
    }

    if (ticket?.status !== "active") {
      setMessages([]);
      messageTicketIdRef.current = ticket?.id ?? null;
      lastMessageIdRef.current = 0;
    }
  }, [
    fetchMessages,
    isSheetOpen,
    sheetTab,
    ticket?.id,
    ticket?.status,
  ]);

  const fetchHistoryTickets = useCallback(async (page = 1) => {
    if (page > 1) setHistoryLoadingMore(true);

    try {
      const result = await getMyTickets(page);
      setHistoryTickets((current) =>
        page === 1 ? result.tickets : [...current, ...result.tickets],
      );
      setHistoryPage(result.meta.current_page);
      setHistoryHasMore(result.meta.current_page < result.meta.last_page);
    } catch {
    } finally {
      if (page > 1) setHistoryLoadingMore(false);
    }
  }, []);

  const handleSubmitTicket = async () => {
    const message = concernText.trim();
    if (!concernCategory || !message) return;
    if (
      concernCategory.length > SUPPORT_CATEGORY_MAX_LENGTH ||
      message.length > SUPPORT_TEXT_MAX_LENGTH
    ) {
      toast.error("Your support request is too long.");
      return;
    }

    ticketMutationPendingRef.current = true;
    ticketMutationVersionRef.current += 1;

    try {
      setFabState("submitting");
      const newTicket = await createTicket({
        category: concernCategory,
        message,
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
        messageTicketIdRef.current = newTicket.id;
        lastMessageIdRef.current = Math.max(
          0,
          ...msgs.map((message) => message.id),
        );
      }

      toast.success("Ticket created successfully");
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast.error(err?.message || "Failed to create ticket");
      setFabState("idle");
    } finally {
      ticketMutationPendingRef.current = false;
    }
  };

  const handleCancelTicket = async () => {
    if (!ticket || cancelling || ticketMutationPendingRef.current) return;

    setCancelling(true);
    ticketMutationPendingRef.current = true;
    ticketMutationVersionRef.current += 1;

    try {
      await cancelTicket(ticket.id);
      setTicket(null);
      setFabState("idle");
      setCancelConfirmOpen(false);
      setIsSheetOpen(false);
      toast.success("Ticket cancelled");
    } catch {
      toast.error("Failed to cancel ticket");
    } finally {
      ticketMutationPendingRef.current = false;
      setCancelling(false);
    }
  };

  const handleSendMessage = async () => {
    const message = newMessage.trim();
    if (!message || !ticket || sending) return;
    if (message.length > SUPPORT_TEXT_MAX_LENGTH) {
      toast.error(`Messages must not exceed ${SUPPORT_TEXT_MAX_LENGTH} characters.`);
      return;
    }

    try {
      setSending(true);
      const msg = await sendMessage(ticket.id, message);
      setMessages((current) => mergeSupportMessages(current, [msg]));
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
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }

    setSheetTab("ticketing");
    if (fabState === "idle") {
      setIsSheetOpen(true);
    } else if (ticket) {
      setIsSheetOpen(true);
    }
    fetchHistoryTickets();
  };

  const handleFabPointerDown = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (window.innerWidth >= MOBILE_BREAKPOINT || !mobilePosition) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startPointerX: event.clientX,
      startPointerY: event.clientY,
      startPositionX: mobilePosition.x,
      startPositionY: mobilePosition.y,
      moved: false,
    };
  };

  const handleFabPointerMove = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startPointerX;
    const deltaY = event.clientY - dragState.startPointerY;

    if (!dragState.moved && Math.hypot(deltaX, deltaY) < 6) return;

    dragState.moved = true;
    event.preventDefault();
    setMobilePosition(
      clampMobileFabPosition({
        x: dragState.startPositionX + deltaX,
        y: dragState.startPositionY + deltaY,
      }),
    );
  };

  const handleFabPointerUp = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (dragState.moved) {
      setMobilePosition((current) =>
        current ? snapMobileFabPositionToSide(current) : current,
      );
    }
    suppressClickRef.current = dragState.moved;
    dragStateRef.current = null;
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
  };

  const handleFabPointerCancel = (
    event: React.PointerEvent<HTMLButtonElement>,
  ) => {
    if (dragStateRef.current?.pointerId !== event.pointerId) return;

    dragStateRef.current = null;
    suppressClickRef.current = false;
  };

  const FabIcon = Headset;

  const fabColors = {
    idle: "bg-accent hover:bg-red-700",
    submitting: "bg-accent hover:bg-red-700",
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
        onPointerDown={handleFabPointerDown}
        onPointerMove={handleFabPointerMove}
        onPointerUp={handleFabPointerUp}
        onPointerCancel={handleFabPointerCancel}
        style={
          mobilePosition
            ? {
                left: `${mobilePosition.x}px`,
                top: `${mobilePosition.y}px`,
                right: "auto",
                bottom: "auto",
              }
            : undefined
        }
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-14 w-14 touch-none cursor-grab items-center justify-center rounded-full shadow-lg transition-[background-color,box-shadow,transform] hover:scale-105 active:cursor-grabbing active:scale-95 md:touch-auto md:cursor-pointer",
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
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:pb-4">
                  <p className="text-sm text-gray-600">
                    Select a concern type and describe your issue.
                  </p>
                  <Select
                    value={concernCategory}
                    onValueChange={setConcernCategory}
                  >
                    <SelectTrigger className="w-full border-gray-200 bg-gray-50 text-sm">
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
                    maxLength={SUPPORT_TEXT_MAX_LENGTH}
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
                      Your ticket {formatTicketId(ticket.id)} is in the queue.
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      A representative will be with you shortly. You cannot send
                      messages until your ticket is active.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCancelConfirmOpen(true)}
                    disabled={cancelling}
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
                    <div className="flex shrink-0 gap-2 border-t border-gray-200 p-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:pb-3">
                      <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type a message..."
                        maxLength={SUPPORT_TEXT_MAX_LENGTH}
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
                <>
                  {historyTickets.map((t) => {
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
                          {t.status === "cancelled" && (
                            <>
                              <p className="text-xs text-gray-400 mt-1">
                                {t.assigned_to ? `by ${t.assigned_to.fullname}` : "by you"}
                              </p>
                              {t.cancel_reason && (
                                <p className="text-xs text-gray-500">
                                  Reason: {t.cancel_reason}
                                </p>
                              )}
                            </>
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
                  })}
                  {historyHasMore && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={historyLoadingMore}
                      onClick={() => fetchHistoryTickets(historyPage + 1)}
                    >
                      {historyLoadingMore ? "Loading..." : "Load older tickets"}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </SupportChatSheet>

      <Dialog
        open={cancelConfirmOpen}
        onOpenChange={(open) => {
          if (!cancelling) setCancelConfirmOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel Support Ticket</DialogTitle>
            <DialogDescription>
              Remove this ticket from the queue? You will need to submit a new
              ticket if you still need help.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelConfirmOpen(false)}
              disabled={cancelling}
            >
              Keep Ticket
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancelTicket}
              disabled={cancelling}
            >
              {cancelling ? "Cancelling..." : "Cancel Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
