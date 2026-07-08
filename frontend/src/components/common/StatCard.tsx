import { cn } from "@/lib/utils";
import type { ElementType, ReactNode } from "react";

type StatCardProps = {
  label: ReactNode;
  value: ReactNode;
  icon: ElementType;
  iconContainerClassName?: string;
  iconClassName?: string;
  className?: string;
  size?: "sm" | "md" | "default";
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconContainerClassName = "bg-green-100",
  iconClassName = "text-green-500",
  className = "",
  size = "default",
}: StatCardProps) {
  const isSm = size === "sm";
  const isMd = size === "md";
  return (
    <div
      className={cn(
        "bg-white rounded-xl flex items-center justify-between gap-2 sm:gap-3 shadow-sm border border-gray-100",
        isSm ? "p-2.5 sm:p-3" : isMd ? "p-3" : "p-3 sm:p-5",
        className,
      )}
    >
      <div className="min-w-0">
        <p className={cn("text-gray-500 mb-0.5", isSm ? "text-[11px] sm:text-xs" : "text-xs sm:text-sm")}>{label}</p>
        <p className={cn("font-bold text-gray-900", isSm ? "text-sm sm:text-base" : isMd ? "text-base sm:text-xl" : "text-xl sm:text-3xl")}>{value}</p>
      </div>
      <div className={cn("rounded-xl shrink-0", isSm ? "p-1.5" : isMd ? "p-1.5 sm:p-2" : "p-2 sm:p-3", iconContainerClassName)}>
        <Icon className={cn(isSm ? "w-4 h-4 sm:w-4 sm:h-4" : isMd ? "w-4 h-4 sm:w-5 sm:h-5" : "w-5 h-5 sm:w-7 sm:h-7", iconClassName)} strokeWidth={2} />
      </div>
    </div>
  );
}
