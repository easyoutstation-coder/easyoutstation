import { useState, useEffect, useCallback } from "react";
import { firebaseConfig, getFirebaseMessaging, getToken, onMessage } from "@/lib/firebase";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const DISMISSED_KEY = "eo_notif_dismissed";

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isIOSPWA() {
  return isIOS() && window.matchMedia("(display-mode: standalone)").matches;
}

function isSupported() {
  return "Notification" in window && "serviceWorker" in navigator && !!VAPID_KEY;
}

async function registerAndGetToken(saveFcmToken: (t: string) => void) {
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

  const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: swReg });
  if (token) saveFcmToken(token);

  onMessage(messaging, (payload) => {
    const title = payload.notification?.title || "EasyOutstation";
    const body = payload.notification?.body || "";
    toast(title, { description: body, duration: 6000 });
  });
}

export type NotifState = "unsupported" | "ios-browser" | "default" | "granted" | "denied" | "dismissed";

export function usePushNotifications(loggedIn: boolean) {
  const saveFcmTokenMutation = trpc.auth.saveFcmToken.useMutation();
  const saveFcmToken = useCallback((t: string) => saveFcmTokenMutation.mutate({ token: t }), [saveFcmTokenMutation]);

  const [state, setState] = useState<NotifState>("unsupported");

  useEffect(() => {
    if (!loggedIn) return;

    if (!isSupported()) { setState("unsupported"); return; }

    // iOS browser (not PWA) — web push not supported; show install prompt instead
    if (isIOS() && !isIOSPWA()) { setState("ios-browser"); return; }

    if (localStorage.getItem(DISMISSED_KEY)) { setState("dismissed"); return; }

    const perm = Notification.permission;
    if (perm === "granted") {
      setState("granted");
      registerAndGetToken(saveFcmToken).catch(() => {});
    } else if (perm === "denied") {
      setState("denied");
    } else {
      setState("default");
    }
  }, [loggedIn]);

  // Called when user taps "Enable" — must be inside a user gesture handler
  const enable = useCallback(async () => {
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted") {
        setState("granted");
        await registerAndGetToken(saveFcmToken);
      } else {
        setState("denied");
      }
    } catch (e) {
      console.warn("[FCM] Permission request failed:", e);
    }
  }, [saveFcmToken]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setState("dismissed");
  }, []);

  return { state, enable, dismiss };
}
