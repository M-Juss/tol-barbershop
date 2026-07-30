import { authFetch } from "@/lib/api";

export const NOTIFICATION_PROMPT_DISMISSED_KEY =
  "notification_prompt_dismissed";
const BROWSER_PUSH_PREFERENCE_PREFIX = "browser_push_enabled_user:";

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

function browserPushPreferenceKey(userId: number): string {
  return `${BROWSER_PUSH_PREFERENCE_PREFIX}${userId}`;
}

export function isBrowserPushEnabledForUser(userId: number): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(browserPushPreferenceKey(userId)) === "1";
}

export function rememberBrowserPushEnabledForUser(userId: number): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(browserPushPreferenceKey(userId), "1");
}

export function forgetBrowserPushEnabledForUser(userId: number): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(browserPushPreferenceKey(userId));
}

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export function isIOSWithoutInstalledApp(): boolean {
  if (typeof window === "undefined") return false;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (!isIOS) return false;

  return !(navigator as Navigator & { standalone?: boolean }).standalone;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms),
    ),
  ]);
}

export async function subscribePush(subscription: PushSubscriptionData): Promise<void> {
  await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/push/subscribe`, {
    method: "POST",
    body: JSON.stringify(subscription),
  });
}

export async function unsubscribePush(endpoint: string): Promise<void> {
  await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/push/unsubscribe`, {
    method: "POST",
    body: JSON.stringify({ endpoint }),
  });
}

export async function unsubscribeAllPush(): Promise<void> {
  await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/push/unsubscribe-all`, {
    method: "POST",
  });
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData.split("").map((char) => char.charCodeAt(0)));
}

function getVapidPublicKey(): string {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
}

function serializePushSubscription(
  subscription: PushSubscription,
): PushSubscriptionData {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: arrayBufferToBase64(subscription.getKey("p256dh")),
      auth: arrayBufferToBase64(subscription.getKey("auth")),
    },
  };
}

export async function getBrowserPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const registrations = await navigator.serviceWorker.getRegistrations();

  for (const registration of registrations) {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) return subscription;
  }

  return null;
}

export async function syncBrowserPush(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== "granted") {
    return false;
  }

  const subscription = await getBrowserPushSubscription();
  if (!subscription) return false;

  await subscribePush(serializePushSubscription(subscription));
  return true;
}

export async function enableBrowserPush(): Promise<boolean> {
  if (!isPushSupported() || isIOSWithoutInstalledApp()) {
    return false;
  }

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
  if (permission !== "granted") {
    return false;
  }

  await navigator.serviceWorker.register("/sw.js");

  let registration: ServiceWorkerRegistration;
  try {
    registration = await withTimeout(navigator.serviceWorker.ready, 5_000);
  } catch {
    return false;
  }

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const vapidKey = getVapidPublicKey();
    if (!vapidKey) return false;

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as PushSubscriptionOptionsInit["applicationServerKey"],
    });
  }

  await subscribePush(serializePushSubscription(subscription));

  return true;
}

export async function disableBrowserPush(): Promise<void> {
  if (!isPushSupported()) return;

  const subscription = await getBrowserPushSubscription();
  if (!subscription) return;

  try {
    await unsubscribePush(subscription.endpoint);
  } catch {}

  await subscription.unsubscribe();
}

export async function unsubscribeBrowserPushLocally(): Promise<void> {
  if (!isPushSupported()) return;

  const subscription = await getBrowserPushSubscription();
  if (subscription) {
    await subscription.unsubscribe();
  }
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
