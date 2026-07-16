"use client";

import { useState } from "react";
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

type ResolveTicketDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (data: { resolution_notes?: string | null }) => void;
  isResolving: boolean;
  customerName: string;
}

export function ResolveTicketDialog({
  open,
  onOpenChange,
  onResolve,
  isResolving,
  customerName,
}: ResolveTicketDialogProps) {
  const [resolutionNotes, setResolutionNotes] = useState("");

  const handleResolve = () => {
    onResolve({
      resolution_notes: resolutionNotes.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resolve Ticket</DialogTitle>
          <DialogDescription>
            Are you sure you want to resolve the ticket with {customerName}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <TextAreaWithLabel
              id="resolve-notes"
              label="Resolution Notes (optional)"
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              placeholder="Any additional notes about how the issue was resolved..."
              className="min-h-[100px] resize-none border-gray-200"
              maxLength={5000}
            />
            <p className="text-xs text-gray-400">
              {resolutionNotes.length}/5000
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isResolving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleResolve}
            disabled={isResolving}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isResolving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Resolving...
              </>
            ) : (
              "Resolve"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
