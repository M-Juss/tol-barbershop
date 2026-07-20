"use client";

import { useState } from "react";
import { SelectWithLabel } from "@/components/common/SelectWithLabel";
import { TextAreaWithLabel } from "@/components/common/TextAreaWithLabel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { SUPPORT_TEXT_MAX_LENGTH } from "@/lib/support";

const CANCEL_REASONS = [
  { value: "customer_unresponsive", label: "Customer unresponsive" },
  { value: "issue_resolved_elsewhere", label: "Issue resolved elsewhere" },
  { value: "duplicate_ticket", label: "Duplicate ticket" },
  { value: "incorrect_category", label: "Incorrect concern category" },
  { value: "customer_requested", label: "Customer requested cancellation" },
  { value: "other", label: "Other" },
];

type CancelTicketDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: (reason: string) => void;
  isCancelling: boolean;
  customerName: string;
}

export function CancelTicketDialog({
  open,
  onOpenChange,
  onCancel,
  isCancelling,
  customerName,
}: CancelTicketDialogProps) {
  const [reasonKey, setReasonKey] = useState("");
  const [customReason, setCustomReason] = useState("");

  const handleCancel = () => {
    const reason = reasonKey === "other" ? customReason.trim() : CANCEL_REASONS.find((r) => r.value === reasonKey)?.label || "";
    if (!reason) return;
    onCancel(reason);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setReasonKey("");
      setCustomReason("");
    }
    onOpenChange(open);
  };

  const isValid = reasonKey && (reasonKey !== "other" || customReason.trim());

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel Ticket</DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel the ticket with {customerName}? This
            action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <SelectWithLabel
            id="cancel-reason"
            label={
              <>
                Reason <span className="text-red-500">*</span>
              </>
            }
            placeholder="Select reason"
            options={CANCEL_REASONS}
            value={reasonKey}
            onValueChange={setReasonKey}
            triggerClassName="border-gray-200 bg-gray-50"
          />

          {reasonKey === "other" && (
            <div className="space-y-2">
              <TextAreaWithLabel
                id="cancel-custom-reason"
                label={
                  <>
                    Specify reason <span className="text-red-500">*</span>
                  </>
                }
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Describe why this ticket is being cancelled..."
                className="min-h-[100px] resize-none border-gray-200"
                maxLength={SUPPORT_TEXT_MAX_LENGTH}
              />
              <p className="text-xs text-gray-400">
                {customReason.length}/{SUPPORT_TEXT_MAX_LENGTH}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isCancelling}
          >
            Keep Ticket
          </Button>
          <Button
            type="button"
            onClick={handleCancel}
            disabled={!isValid || isCancelling}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isCancelling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Cancelling...
              </>
            ) : (
              "Cancel Ticket"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
