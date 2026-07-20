"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
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
import { isPushSupported, isIOSWithoutInstalledApp, enableBrowserPush } from "@/services/shared/push.api";

const STORAGE_KEY = "notification_prompt_dismissed";

function isEligibleForPrompt(): boolean {
  if (typeof window === "undefined") return false;
  if (!isPushSupported()) return false;
  if (isIOSWithoutInstalledApp()) return false;
  if (Notification.permission !== "default") return false;
  if (localStorage.getItem(STORAGE_KEY)) return false;
  return true;
}

export function NotificationPrompt() {
  const [open, setOpen] = useState(false);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    if (isEligibleForPrompt()) {
      setOpen(true);
    }
  }, []);

  const handleEnable = async () => {
    setEnabling(true);
    try {
      const success = await enableBrowserPush();
      if (success) {
        toast.success("Notifications enabled");
        window.dispatchEvent(new Event("push-subscription-changed"));
      } else {
        toast.error("Could not enable notifications");
      }
    } catch {
      toast.error("Could not enable notifications");
    } finally {
      setEnabling(false);
      localStorage.setItem(STORAGE_KEY, "1");
      setOpen(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleDismiss()}>
      <DialogContent className="sm:max-w-md" onInteractOutside={handleDismiss}>
        <DialogHeader>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Bell className="h-6 w-6 text-blue-600" />
          </div>
          <DialogTitle className="text-center">Stay in the Loop</DialogTitle>
          <DialogDescription className="text-center">
            Get notified about appointment updates, booking confirmations, and
            support messages — even when the app is in the background.
          </DialogDescription>
        </DialogHeader>
        <p className="text-center text-sm text-muted-foreground">
          You can change this setting anytime from the sidebar.
        </p>
        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" variant="outline" onClick={handleDismiss} className="w-full sm:w-auto">
            Maybe Later
          </Button>
          <Button type="button" disabled={enabling} onClick={handleEnable} className="w-full sm:w-auto">
            {enabling ? "Enabling..." : "Enable Notifications"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
