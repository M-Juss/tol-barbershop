"use client";

import { useEffect, useState } from "react";
import {
  disableBrowserPush,
  enableBrowserPush,
  getBrowserPushSubscription,
  isIOSWithoutInstalledApp,
  isPushSupported,
  syncBrowserPush,
} from "@/services/shared/push.api";

export type PushNotificationStatus =
  | "loading"
  | "disabled"
  | "enabled"
  | "blocked"
  | "unsupported"
  | "ios-install-required"
  | "error";

export function usePushNotifications() {
  const [status, setStatus] = useState<PushNotificationStatus>("loading");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadStatus = async () => {
      if (!isPushSupported()) {
        setStatus("unsupported");
        return;
      }

      if (isIOSWithoutInstalledApp()) {
        setStatus("ios-install-required");
        return;
      }

      if (Notification.permission === "denied") {
        setStatus("blocked");
        return;
      }

      try {
        const subscription = await getBrowserPushSubscription();
        if (subscription) {
          if (!cancelled) setStatus("enabled");
          syncBrowserPush().catch(() => {});
          return;
        }

        if (Notification.permission === "granted") {
          const restored = await enableBrowserPush();
          if (!cancelled) setStatus(restored ? "enabled" : "error");
          return;
        }

        if (!cancelled) setStatus("disabled");
      } catch {
        if (!cancelled) setStatus("error");
      }
    };

    loadStatus();

    return () => {
      cancelled = true;
    };
  }, []);

  const enable = async () => {
    setIsUpdating(true);
    try {
      const enabled = await enableBrowserPush();
      setStatus(
        enabled
          ? "enabled"
          : Notification.permission === "denied"
            ? "blocked"
            : "disabled",
      );
      return enabled;
    } catch {
      setStatus("error");
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const disable = async () => {
    setIsUpdating(true);
    try {
      await disableBrowserPush();
      setStatus("disabled");
      return true;
    } catch {
      setStatus("error");
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  return { status, isUpdating, enable, disable };
}
