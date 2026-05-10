import { useEffect } from "react";
import { firebaseConfig, getFirebaseMessaging, getToken, onMessage } from "@/lib/firebase";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

export function usePushNotifications(enabled: boolean) {
  const saveFcmToken = trpc.auth.saveFcmToken.useMutation();

  useEffect(() => {
    if (!enabled || !VAPID_KEY || !("Notification" in window) || !("serviceWorker" in navigator)) return;

    async function setup() {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        // Register FCM service worker with Firebase config as query params
        const swUrl = `/firebase-messaging-sw.js?${new URLSearchParams({
          apiKey: firebaseConfig.apiKey || "",
          authDomain: firebaseConfig.authDomain || "",
          projectId: firebaseConfig.projectId || "",
          storageBucket: firebaseConfig.storageBucket || "",
          messagingSenderId: firebaseConfig.messagingSenderId || "",
          appId: firebaseConfig.appId || "",
        }).toString()}`;

        const swReg = await navigator.serviceWorker.register(swUrl, { scope: "/" });

        const messaging = getFirebaseMessaging();
        if (!messaging) return;

        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: swReg,
        });

        if (token) {
          saveFcmToken.mutate({ token });
        }

        // Handle foreground notifications as toasts
        onMessage(messaging, (payload) => {
          const title = payload.notification?.title || "EasyOutstation";
          const body = payload.notification?.body || "";
          toast(title, { description: body, duration: 6000 });
        });
      } catch (err) {
        console.warn("[FCM] Push notification setup failed:", err);
      }
    }

    setup();
  }, [enabled]);
}
