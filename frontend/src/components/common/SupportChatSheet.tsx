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

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="mobile-modal-surface relative z-10 mb-6 flex h-[85dvh] w-full flex-col rounded-2xl bg-white shadow-xl animate-in slide-in-from-bottom duration-300 md:mb-0 md:h-[600px] md:max-w-md"
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close support chat"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
