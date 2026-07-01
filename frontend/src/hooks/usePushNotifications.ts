"use client";

import { useEffect, useRef } from "react";
import {
  subscribePush,
  unsubscribeAllPush,
} from "@/services/push.api";

function isIOSNoPWA(): boolean {
  if (typeof window === "undefined") return false;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (!isIOS) return false;
  return !(window.navigator as Navigator & { standalone?: boolean }).standalone;
}

export function usePushNotifications(enabled: boolean) {
  const subscribed = useRef(false);

  useEffect(() => {
    if (!enabled) {
      if (subscribed.current) {
        unsubscribeAllPush().catch(() => {});
        subscribed.current = false;
      }
      return;
    }

    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    if (Notification.permission === "denied") return;
    if (subscribed.current) return;

    if (isIOSNoPWA()) return;

    let cancelled = false;

    const run = async () => {
      try {
        const registration = await navigator.serviceWorker
          .register("/sw.js")
          .catch(() => null);
        if (cancelled || !registration) return;

        const reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((r) => setTimeout(r, 3000)),
        ]);
        if (cancelled || !reg) return;

        if (Notification.permission === "default") {
          Notification.requestPermission().then((permission) => {
            if (cancelled || permission !== "granted") return;
            finish(reg as ServiceWorkerRegistration);
          });
          return;
        }

        finish(reg as ServiceWorkerRegistration);
      } catch {
        /* swallow */
      }
    };

    const finish = async (reg: ServiceWorkerRegistration) => {
      try {
        const existing = await reg.pushManager.getSubscription();
        if (existing) {
          const p256dh = arrayBufferToBase64(existing.getKey("p256dh"));
          const auth = arrayBufferToBase64(existing.getKey("auth"));
          await subscribePush({
            endpoint: existing.endpoint,
            keys: { p256dh, auth },
          });
          subscribed.current = true;
          return;
        }

        const vapidKey =
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
        if (!vapidKey) return;

        const subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as PushSubscriptionOptionsInit["applicationServerKey"],
        });

        const p256dh = arrayBufferToBase64(subscription.getKey("p256dh"));
        const auth = arrayBufferToBase64(subscription.getKey("auth"));

        await subscribePush({
          endpoint: subscription.endpoint,
          keys: { p256dh, auth },
        });
        subscribed.current = true;
      } catch {
        /* silent */
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData.split("").map((char) => char.charCodeAt(0)));
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
