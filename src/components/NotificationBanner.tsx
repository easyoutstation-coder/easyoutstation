import { Bell, X, Smartphone } from "lucide-react";
import type { NotifState } from "@/hooks/usePushNotifications";

interface Props {
  state: NotifState;
  onEnable: () => void;
  onDismiss: () => void;
}

export default function NotificationBanner({ state, onEnable, onDismiss }: Props) {
  if (state === "ios-browser") {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
        <div className="bg-[#1e3a5f] rounded-2xl px-4 py-3 shadow-2xl shadow-black/30 flex items-start gap-3 border border-white/10">
          <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center shrink-0 mt-0.5">
            <Smartphone className="w-4 h-4 text-blue-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold leading-snug">Get booking alerts</p>
            <p className="text-blue-200 text-xs mt-0.5 leading-relaxed">
              Tap <span className="font-semibold">Share →</span> then{" "}
              <span className="font-semibold">Add to Home Screen</span> to enable push notifications on iPhone.
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="text-blue-300 hover:text-white shrink-0 transition-colors mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (state !== "default") return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-sm mx-auto">
      <div className="bg-[#1e3a5f] rounded-2xl px-4 py-3 shadow-2xl shadow-black/30 flex items-center gap-3 border border-white/10">
        <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4 text-blue-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold leading-none">Booking alerts</p>
          <p className="text-blue-200 text-xs mt-0.5">Get notified instantly when your cab is confirmed.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onEnable}
            className="bg-white text-[#1e3a5f] text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-blue-50 transition-colors"
          >
            Enable
          </button>
          <button
            onClick={onDismiss}
            className="text-blue-300 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
