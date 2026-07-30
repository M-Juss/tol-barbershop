"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  disableBrowserPush,
  enableBrowserPush,
  forgetBrowserPushEnabledForUser,
  getBrowserPushSubscription,
  isBrowserPushEnabledForUser,
  isIOSWithoutInstalledApp,
  isPushSupported,
  rememberBrowserPushEnabledForUser,
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
  const { user } = useAuth();
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
          if (user && isBrowserPushEnabledForUser(user.id)) {
            await syncBrowserPush();
          }
          if (!cancelled) setStatus("enabled");
          return;
        }

        if (
          Notification.permission === "granted" &&
          user &&
          isBrowserPushEnabledForUser(user.id)
        ) {
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

    const handleSubscriptionChange = () => {
      loadStatus();
    };

    window.addEventListener("push-subscription-changed", handleSubscriptionChange);

    return () => {
      cancelled = true;
      window.removeEventListener("push-subscription-changed", handleSubscriptionChange);
    };
  }, [user]);

  const enable = async () => {
    setIsUpdating(true);
    try {
      const enabled = await enableBrowserPush();
      if (enabled && user) {
        rememberBrowserPushEnabledForUser(user.id);
      }
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
      if (user) {
        forgetBrowserPushEnabledForUser(user.id);
      }
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
