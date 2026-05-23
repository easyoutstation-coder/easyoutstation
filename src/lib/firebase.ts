import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;

if (import.meta.env.VITE_FIREBASE_API_KEY) {
  try {
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    _auth = getAuth(_app);
  } catch (e) {
    console.warn("[Firebase] init failed:", e);
  }
} else {
  console.warn("[Firebase] missing env vars — Firebase features disabled in this environment");
}

export const auth = _auth as Auth;

export function getFirebaseMessaging() {
  if (!_app) return null;
  try {
    return getMessaging(_app);
  } catch {
    return null;
  }
}

export { getToken, onMessage };
