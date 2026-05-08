import { useState, useEffect, useRef } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import type { ConfirmationResult } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Loader2, AlertCircle, Phone } from "lucide-react";

interface FirebaseOTPProps {
  phone: string;
  onVerified: () => void;
  onError?: (msg: string) => void;
}

declare global {
  interface Window { recaptchaVerifier: RecaptchaVerifier; }
}

export default function FirebaseOTP({ phone, onVerified, onError }: FirebaseOTPProps) {
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [confirmed, setConfirmed] = useState<ConfirmationResult | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);


  // Auto-verify when all 6 digits are entered
  useEffect(() => {
    if (otpInput.length === 6 && confirmed && !verifying) {
      verifyOTP();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpInput]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const setupRecaptcha = () => {
    // Clear any existing verifier first
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch {}
      // @ts-ignore
      window.recaptchaVerifier = null;
    }
    window.recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
      callback: () => {},
      "expired-callback": () => {
        // @ts-ignore
        window.recaptchaVerifier = null;
      },
    });
    return window.recaptchaVerifier;
  };

  const sendOTP = async () => {
    setError("");
    if (!phone || phone.length !== 10) {
      setError("Please enter a valid 10-digit mobile number first.");
      onError?.("Please enter a valid 10-digit mobile number.");
      return;
    }
    setSending(true);
    try {
      const verifier = setupRecaptcha();
      const result = await signInWithPhoneNumber(auth, `+91${phone}`, verifier);
      setConfirmed(result);
      setOtpSent(true);
      setCountdown(30);
    } catch (err: any) {
      console.error("Firebase OTP error:", err);
      const msg = err.code === "auth/too-many-requests"
        ? "Too many attempts. Please try again in a few minutes."
        : err.code === "auth/invalid-phone-number"
        ? "Invalid phone number. Please check and try again."
        : "Failed to send OTP. Please try again.";
      setError(msg);
      onError?.(msg);
      // Reset recaptcha on error
      window.recaptchaVerifier?.clear();
      // @ts-ignore
      window.recaptchaVerifier = null;
    } finally {
      setSending(false);
    }
  };

  const verifyOTP = async () => {
    if (!confirmed || !otpInput || otpInput.length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }
    setVerifying(true);
    setError("");
    try {
      await confirmed.confirm(otpInput);
      onVerified();
    } catch (err: any) {
      const msg = err.code === "auth/invalid-verification-code"
        ? "Invalid OTP. Please check and try again."
        : err.code === "auth/code-expired"
        ? "OTP has expired. Please request a new one."
        : "Verification failed. Please try again.";
      setError(msg);
      onError?.(msg);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Invisible recaptcha container - must be in DOM */}
      <div id="recaptcha-container" ref={recaptchaContainerRef} style={{ position: "absolute", bottom: 0, left: 0, zIndex: -1 }} />

      {!otpSent ? (
        <Button
          type="button"
          onClick={sendOTP}
          disabled={sending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {sending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending OTP…</> : "Send OTP"}
        </Button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 shrink-0" />
            OTP sent to +91-{phone} via SMS
          </p>
          <div className="flex gap-2">
            <Input
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              className="flex-1 text-center text-lg tracking-[0.3em] font-bold"
              onKeyDown={(e) => e.key === "Enter" && verifyOTP()}
            />
            <Button
              type="button"
              onClick={verifyOTP}
              disabled={verifying || otpInput.length !== 6}
              className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {verifying
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : "Verify"
              }
            </Button>
          </div>
          {/* Resend */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={sendOTP}
              disabled={countdown > 0 || sending}
              className="text-xs text-blue-600 hover:underline disabled:text-slate-400 disabled:no-underline"
            >
              {countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP"}
            </button>
            {sending && <span className="text-xs text-slate-400">Sending...</span>}
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
