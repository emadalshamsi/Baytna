import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useCallback, useEffect, useRef } from "react";

export function useNotifications() {
  const { user } = useAuth();
  const subscribed = useRef(false);

  const { data: unreadCounts = { count: 0, home: 0, groceries: 0, logistics: 0, housekeeping: 0 } } = useQuery({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
    refetchInterval: 15000,
    select: (data: any) => ({
      count: data?.count ?? 0,
      home: data?.home ?? 0,
      groceries: data?.groceries ?? 0,
      logistics: data?.logistics ?? 0,
      housekeeping: data?.housekeeping ?? 0,
    }),
  });

  const unreadCount = unreadCounts.count;

  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    enabled: !!user,
    refetchInterval: 30000,
  });

  const subscribeToPush = useCallback(async () => {
    if (!user || subscribed.current) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    try {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        await apiRequest("POST", "/api/push-subscribe", existing.toJSON());
        subscribed.current = true;
        return;
      }

      const res = await fetch("/api/vapid-public-key");
      const { publicKey } = await res.json();
      if (!publicKey) return;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await apiRequest("POST", "/api/push-subscribe", sub.toJSON());
      subscribed.current = true;
    } catch {}
  }, [user]);

  useEffect(() => {
    if (user) {
      subscribeToPush();
    }
  }, [user, subscribeToPush]);

  useEffect(() => {
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: "SET_BADGE",
        count: unreadCount,
      });
    }
    if ("setAppBadge" in navigator && unreadCount > 0) {
      (navigator as any).setAppBadge(unreadCount).catch(() => {});
    } else if ("clearAppBadge" in navigator && unreadCount === 0) {
      (navigator as any).clearAppBadge().catch(() => {});
    }
  }, [unreadCount]);

  const markRead = useCallback(async (id: number) => {
    await apiRequest("PATCH", `/api/notifications/${id}/read`);
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
  }, []);

  const markAllRead = useCallback(async () => {
    await apiRequest("POST", "/api/notifications/mark-all-read");
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return "denied";
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      await subscribeToPush();
    }
    return perm;
  }, [subscribeToPush]);

  return {
    unreadCount,
    unreadCounts,
    notifications,
    markRead,
    markAllRead,
    requestPermission,
    permissionState: typeof Notification !== "undefined" ? Notification.permission : "denied",
  };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
