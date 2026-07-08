"use client";

import { type ReactNode } from "react";
import { X } from "lucide-react";

type SupportChatSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function SupportChatSheet({
  isOpen,
  onClose,
  title,
  children,
}: SupportChatSheetProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
      <div
        className="fixed inset-0 bg-black/30 transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 flex h-[85vh] w-full flex-col rounded-t-2xl bg-white shadow-xl md:h-[600px] md:max-w-md md:rounded-2xl md:mb-0 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
