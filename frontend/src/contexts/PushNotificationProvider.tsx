"use client";

import { useAuth } from "@/contexts/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export function PushNotificationProvider() {
  const { user } = useAuth();
  usePushNotifications(Boolean(user));
  return null;
}
