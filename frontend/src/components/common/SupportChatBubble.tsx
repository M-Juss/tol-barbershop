import { cn } from "@/lib/utils";

type SupportChatBubbleProps = {
  message: string;
  isOwn: boolean;
  senderName: string;
  createdAt: string;
};

function formatMessageTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SupportChatBubble({
  message,
  isOwn,
  senderName,
  createdAt,
}: SupportChatBubbleProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        isOwn ? "self-end items-end" : "self-start items-start",
      )}
    >
      <span className="text-[10px] text-gray-400 font-medium">
        {senderName}
      </span>
      <div
        className={cn(
          "rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words",
          isOwn
            ? "bg-blue-500 text-white rounded-br-md"
            : "bg-gray-100 text-gray-900 rounded-bl-md",
        )}
      >
        {message}
      </div>
      <span className="text-[10px] text-gray-400">
        {formatMessageTimestamp(createdAt)}
      </span>
    </div>
  );
}
