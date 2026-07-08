import { authFetch } from "@/lib/api";

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: PushSubscriptionKeys;
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

export async function getVapidPublicKey(): Promise<string> {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
}

export async function createPushSubscription(): Promise<PushSubscriptionData | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return null;
  }

  let registration: ServiceWorkerRegistration;
  try {
    registration = await withTimeout(navigator.serviceWorker.ready, 5_000);
  } catch {
    return null;
  }

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    const p256dh = arrayBufferToBase64(existing.getKey("p256dh"));
    const auth = arrayBufferToBase64(existing.getKey("auth"));
    return {
      endpoint: existing.endpoint,
      keys: { p256dh, auth },
    };
  }

  const vapidKey = await getVapidPublicKey();
  if (!vapidKey) return null;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey) as unknown as PushSubscriptionOptionsInit["applicationServerKey"],
  });

  const p256dh = arrayBufferToBase64(subscription.getKey("p256dh"));
  const auth = arrayBufferToBase64(subscription.getKey("auth"));

  return {
    endpoint: subscription.endpoint,
    keys: { p256dh, auth },
  };
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
