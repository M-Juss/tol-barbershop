"use client";

import { Bell, BellOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const statusCopy = {
  loading: "Checking notification status...",
  disabled: "Receive appointment and support updates on this device.",
  enabled: "Notification is enabled on this device.",
  blocked: "Notifications are blocked in your browser settings.",
  unsupported: "This browser does not support push notifications.",
  "ios-install-required":
    "On iPhone or iPad, install TOL Barbershop to your Home Screen first.",
  error: "Notification status could not be updated. Please try again.",
};

const statusLabel = {
  loading: "...",
  disabled: "Off",
  enabled: "On",
  blocked: "Blocked",
  unsupported: "Unavailable",
  "ios-install-required": "Setup",
  error: "Check",
};

export function PushNotificationControl() {
  const [open, setOpen] = useState(false);
  const { status, isUpdating, enable, disable } = usePushNotifications();
  const isEnabled = status === "enabled";
  const canEnable = status === "disabled" || status === "error";

  const handleEnable = async () => {
    if (await enable()) {
      toast.success("Notification enabled");
    } else {
      toast.error("Notification was not enabled");
    }
  };

  const handleDisable = async () => {
    if (await disable()) {
      toast.success("Notification disabled");
    } else {
      toast.error("Could not disable notification");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-gray-300 transition-colors hover:bg-slate-800 hover:text-white"
      >
        {isEnabled ? (
          <Bell className="size-5 shrink-0" />
        ) : (
          <BellOff className="size-5 shrink-0" />
        )}
        <span className="flex-1 text-left">Notification</span>
        <span className="text-xs text-gray-400">
          {statusLabel[status]}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Notification</DialogTitle>
            <DialogDescription>{statusCopy[status]}</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This is optional. You can change this setting at any time without
            affecting in-app notifications.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            {isEnabled ? (
              <Button type="button" variant="destructive" disabled={isUpdating} onClick={handleDisable}>
                {isUpdating ? "Disabling..." : "Disable"}
              </Button>
            ) : (
              <Button type="button" disabled={!canEnable || isUpdating} onClick={handleEnable}>
                {isUpdating ? "Enabling..." : "Enable"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
