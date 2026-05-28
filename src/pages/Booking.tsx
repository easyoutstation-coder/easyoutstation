import { useSeo } from "@/hooks/useSeo";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { saveBookingDraft, clearBookingDraft } from "@/hooks/useBookingDraft";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FirebaseOTP from "@/components/FirebaseOTP";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import MapPreview from "@/components/MapPreview";
import { useDistanceCalculator } from "@/hooks/useDistanceCalculator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  User, CreditCard, Check, ArrowRight, ArrowLeft,
  MapPin, CalendarDays, Mail, Users, Shield, Clock,
  Route, Loader2, AlertCircle, LogIn, MessageCircle, ShieldCheck,
} from "lucide-react";

function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

const steps = [
  { id: 1, label: "Trip Details", icon: MapPin },
  { id: 2, label: "Personal Info", icon: User },
  { id: 3, label: "Review & Pay", icon: CreditCard },
];

export default function BookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading: authLoading, user, refresh } = useAuth();
  const [authTimedOut, setAuthTimedOut] = useState(false);

  useSeo({ title: "Book Your Ride | EasyOutstation", description: "Complete your outstation ride booking.", noindex: true });

  // Lazy-load Razorpay only on the booking page so it doesn't block every other page
  useEffect(() => {
    if (document.querySelector('script[src*="razorpay"]')) return;
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    document.head.appendChild(s);
  }, []);

  // Never block the page more than 2 seconds waiting for auth on initial load
  useEffect(() => {
    const timer = setTimeout(() => setAuthTimedOut(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Read ALL URL params first before any useState
  const carId = parseInt(searchParams.get("carId") || "0");
  const fromCity = searchParams.get("from") || "Delhi";
  const toCity = searchParams.get("to") || "";
  const defaultDistance = parseInt(searchParams.get("distance") || "0");
  const paramFromFull = searchParams.get("fromFull") || "";
  const paramToFull = searchParams.get("toFull") || "";
  const paramDate = searchParams.get("date") || "";
  const paramTime = searchParams.get("time") || "";
  const paramReturnDate = searchParams.get("returnDate") || "";
  const paramReturnTime = searchParams.get("returnTime") || "";
  const paramTripType = searchParams.get("tripType") || "one_way";
  const paramFromPincode = searchParams.get("fromPincode") || "";
  const paramToPincode = searchParams.get("toPincode") || "";
  const resumeBookingId = parseInt(searchParams.get("resume") || "0");

  // ALL useState hooks
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [advancePaid, setAdvancePaid] = useState(false);
  const [tripType, setTripType] = useState(paramTripType);
  const [pickupDate, setPickupDate] = useState<Date | undefined>(
    paramDate ? (() => { const d = new Date(paramDate); return isNaN(d.getTime()) ? undefined : d; })() : undefined
  );
  const [pickupTime, setPickupTime] = useState(paramTime || "08:00");
  const [returnTime, setReturnTime] = useState(paramReturnTime || "08:00");
  const [returnDate, setReturnDate] = useState<Date | undefined>(
    paramReturnDate ? (() => { const d = new Date(paramReturnDate); return isNaN(d.getTime()) ? undefined : d; })() : undefined
  );
  const [specialRequests, setSpecialRequests] = useState("");
  const [pickupAddress, setPickupAddress] = useState(paramFromFull);
  const [pickupPincode, setPickupPincode] = useState(paramFromPincode);
  const [pickupLat, setPickupLat] = useState<number>();
  const [pickupLng, setPickupLng] = useState<number>();
  const [dropAddress, setDropAddress] = useState(paramToFull || (toCity ? toCity + ", India" : ""));
  const [dropPincode, setDropPincode] = useState(paramToPincode);
  const [dropLat, setDropLat] = useState<number>();
  const [dropLng, setDropLng] = useState<number>();
  const [customerName, setCustomerName] = useState(user?.name || "");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState(user?.email || "");

  // Update customer info when user data loads
  useEffect(() => {
    if (user?.name && !customerName) setCustomerName(user.name);
    if (user?.email && !customerEmail) setCustomerEmail(user.email);
  }, [user]);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");
  const [formError, setFormError] = useState("");
  const [pickupCalOpen, setPickupCalOpen] = useState(false);
  const [returnCalOpen, setReturnCalOpen] = useState(false);

  // ALL trpc hooks
  const { data: car } = trpc.car.getById.useQuery({ id: carId }, { enabled: carId > 0 });
  const { data: resumeBooking } = trpc.booking.getById.useQuery({ id: resumeBookingId }, { enabled: resumeBookingId > 0 });
  const { distanceKm, durationText, isLoading: isCalcDistance, calculateDistance } = useDistanceCalculator();
  const [manualDistance, setManualDistance] = useState(defaultDistance);
  const sendOtpMutation = trpc.sms.sendOtp.useMutation({
    onSuccess: () => { setOtpSent(true); setOtpError(""); },
    onError: (e) => setOtpError(e.message),
  });
  const verifyOtpMutation = trpc.sms.verifyOtp.useMutation({
    onSuccess: () => { setOtpVerified(true); setOtpError(""); },
    onError: () => setOtpError("Invalid OTP. Please check and try again."),
  });  const createBookingMutation = trpc.booking.create.useMutation();
  const cancelBookingMutation = trpc.booking.cancel.useMutation();
  const notifyAbandonedMutation = trpc.booking.notifyAbandoned.useMutation();
  const createOrderMutation = trpc.payment.createOrder.useMutation();
  const verifyPaymentMutation = trpc.payment.verifyPayment.useMutation();
  const confirmTestBookingMutation = trpc.booking.confirmTestBooking.useMutation();
  const isTestUser = !!(user as any)?.isTestUser;

  // Tracks the booking ID while Razorpay is open — used for mobile abandonment detection
  const pendingPaymentRef = useRef<number | null>(null);

  // ALL useEffects
  useEffect(() => {
    if (pickupLat && pickupLng && dropLat && dropLng) {
      calculateDistance(pickupLat, pickupLng, dropLat, dropLng);
    }
  }, [pickupLat, pickupLng, dropLat, dropLng]);

  // Save draft on every change
  useEffect(() => {
    if (!bookingComplete) {
      saveBookingDraft({
        tripType, pickupTime, specialRequests,
        pickupAddress, pickupPincode, dropAddress, dropPincode,
        currentStep,
        pickupDate: pickupDate ? format(pickupDate, "yyyy-MM-dd") : undefined,
      });
    }
  }, [tripType, pickupDate, pickupTime, pickupAddress, pickupPincode, dropAddress, dropPincode, currentStep, bookingComplete]);

  // Pre-fill form when resuming an abandoned booking
  useEffect(() => {
    if (!resumeBooking) return;
    if (resumeBooking.customerName) setCustomerName(resumeBooking.customerName);
    if (resumeBooking.customerPhone) setCustomerPhone(resumeBooking.customerPhone);
    if (resumeBooking.customerEmail) setCustomerEmail(resumeBooking.customerEmail);
    if (resumeBooking.pickupAddress) setPickupAddress(resumeBooking.pickupAddress);
    if (resumeBooking.pickupDate) {
      const d = new Date(resumeBooking.pickupDate);
      if (!isNaN(d.getTime())) setPickupDate(d);
    }
    // Fall back to booking's stored km if distance is not in the URL params
    if (!defaultDistance && resumeBooking.totalKm) setManualDistance(resumeBooking.totalKm);
    setCurrentStep(3);
  }, [resumeBooking]);

  // Mobile abandonment: on mount, fire notification for any booking interrupted by page unload
  useEffect(() => {
    const stored = localStorage.getItem("eo_pending_booking");
    if (stored) {
      localStorage.removeItem("eo_pending_booking");
      const id = parseInt(stored);
      if (id > 0) notifyAbandonedMutation.mutate({ id });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mobile abandonment: when page is hidden (Android back-button navigation away), save to localStorage
  useEffect(() => {
    const handlePageHide = () => {
      if (pendingPaymentRef.current) {
        localStorage.setItem("eo_pending_booking", String(pendingPaymentRef.current));
      }
    };
    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, []);

  // Mobile abandonment: when page regains focus after Razorpay dismissal without ondismiss firing
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && pendingPaymentRef.current) {
        const id = pendingPaymentRef.current;
        pendingPaymentRef.current = null;
        notifyAbandonedMutation.mutate({ id });
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Inline quick auth state — must be before any conditional returns
  const [quickName, setQuickName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickOtpVerified, setQuickOtpVerified] = useState(false);
  const [quickError, setQuickError] = useState("");

  const quickLoginWithPhoneMutation = trpc.auth.loginWithPhone.useMutation({
    onSuccess: (data) => {
      if (data.token) localStorage.setItem("authToken", data.token);
      refresh();
    },
    onError: (e) => setQuickError(e.message),
  });

  // Auth gate - AFTER all hooks
  // Only show spinner on FIRST load (no cached data), max 2 seconds
  if (authLoading && !user && !authTimedOut) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="pt-20">
          <div className="mx-auto max-w-lg px-4 py-12">
            {/* Car summary at top */}
            {car && (
              <div className="flex items-center gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
                {car.imageUrl && <img src={car.imageUrl} alt={car.name} className="w-16 h-12 object-cover rounded-lg" />}
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{car.name}</div>
                  <div className="text-sm text-slate-500">{fromCity} → {toCity} · ₹{((parseFloat(car?.pricePerKm || "20") * defaultDistance) + 250).toLocaleString("en-IN")}</div>
                </div>
                <button onClick={() => navigate(-1)} className="text-xs text-blue-600 hover:underline">Change</button>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <LogIn className="w-7 h-7 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold font-['DM_Serif_Display'] text-slate-900">Quick Sign Up to Book</h2>
                <p className="text-slate-500 text-sm mt-1">Takes 30 seconds. Verify your number and you're in!</p>
              </div>

              <div className="space-y-4">

                {/* Name */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input value={quickName} onChange={e => setQuickName(e.target.value)}
                      placeholder="Your full name" className="pl-10" disabled={quickOtpVerified}
                      autoComplete="name" />
                  </div>
                </div>

                {/* Phone + OTP */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-700">Mobile Number *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">+91</span>
                    <Input value={quickPhone}
                      onChange={e => { setQuickPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setQuickOtpVerified(false); }}
                      placeholder="10-digit mobile number" className="pl-12"
                      disabled={quickOtpVerified} maxLength={10}
                      type="tel" inputMode="numeric" autoComplete="tel-national" />
                    {quickOtpVerified && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-green-600 text-xs font-medium">
                        <Check className="w-3.5 h-3.5" /> Verified
                      </span>
                    )}
                  </div>
                  {!quickOtpVerified && quickPhone.length === 10 && (
                    <div className="pt-1">
                      <FirebaseOTP
                        phone={quickPhone}
                        onVerified={() => { setQuickOtpVerified(true); setQuickError(""); }}
                        onError={msg => setQuickError(msg)}
                      />
                    </div>
                  )}
                  {!quickOtpVerified && quickPhone.length < 10 && (
                    <p className="text-xs text-slate-400">Enter 10 digits to receive OTP</p>
                  )}
                </div>

                {quickError && (
                  <p className="text-sm text-red-500 flex items-center gap-1.5 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />{quickError}
                  </p>
                )}

                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base font-semibold gap-2"
                  disabled={!quickOtpVerified || quickLoginWithPhoneMutation.isPending}
                  onClick={() => {
                    setQuickError("");
                    if (!quickName.trim()) { setQuickError("Please enter your name."); return; }
                    if (!quickOtpVerified) { setQuickError("Please verify your mobile number first."); return; }
                    quickLoginWithPhoneMutation.mutate({ phone: quickPhone, name: quickName.trim() });
                  }}
                >
                  {quickLoginWithPhoneMutation.isPending
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Setting up your account...</>
                    : <>Continue to Booking <ArrowRight className="w-4 h-4" /></>
                  }
                </Button>

                <p className="text-center text-xs text-slate-400">
                  Already have an account?{" "}
                  <button onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.href)}`)}
                    className="text-blue-600 hover:underline font-medium">
                    Sign in instead
                  </button>
                </p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Derived values - after auth gate, no hooks below this line
  const finalDistance = distanceKm || manualDistance;
  const pricePerKm = parseFloat(car?.pricePerKm || "20");
  const driverChargePerDay = parseFloat(car?.driverCharges || "250");

  const tripDays = tripType === "round_trip" && returnDate && pickupDate
    ? Math.max(1, Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 1;

  const totalKmForTrip = tripType === "round_trip" ? finalDistance * 2 : finalDistance;

  // Minimum km billing rules:
  // • Any trip spanning multiple days: min 250 km/day (all vehicles)
  // • Heavy vehicles (>7 seats): min 100 km even for same-day / local trips
  const MIN_KM_PER_DAY = 250;
  const MIN_KM_HEAVY = 100;
  const isHeavyVehicle = (car?.seats ?? 0) > 7;

  const billedKm = (() => {
    if (tripDays > 1) return Math.max(totalKmForTrip, tripDays * MIN_KM_PER_DAY);
    if (isHeavyVehicle) return Math.max(totalKmForTrip, MIN_KM_HEAVY);
    return totalKmForTrip;
  })();

  const minKmApplies = billedKm > totalKmForTrip;
  const basePrice = pricePerKm * billedKm;
  const totalDriverCharges = driverChargePerDay * tripDays;

  const tollCharges = (() => {
    const route = `${fromCity}-${toCity}`.toLowerCase();
    const tolls: Record<string, number> = {
      "delhi-manali": 850, "delhi-shimla": 650, "delhi-chandigarh": 380,
      "delhi-dehradun": 420, "delhi-rishikesh": 450, "delhi-haridwar": 430,
      "delhi-jaipur": 350, "delhi-agra": 290, "delhi-mathura": 220,
    };
    const key = Object.keys(tolls).find(k =>
      route.includes(k.split("-")[0]) && route.includes(k.split("-")[1])
    );
    const oneway = key ? tolls[key] : Math.round(finalDistance * 1.2);
    return tripType === "round_trip" ? oneway * 2 : oneway;
  })();

  const totalPrice = basePrice + totalDriverCharges + tollCharges;

  const sendOtp = () => {
    if (!customerPhone || customerPhone.length !== 10) {
      setOtpError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setOtpError("");
    sendOtpMutation.mutate({ phone: customerPhone });
  };

  const verifyOtp = () => {
    if (!otpInput || otpInput.length !== 6) {
      setOtpError("Please enter the 6-digit OTP sent to your phone.");
      return;
    }
    setOtpError("");
    verifyOtpMutation.mutate({ phone: customerPhone, otp: otpInput });
  };

  const handleNext = () => {
    setFormError("");
    if (currentStep === 1) {
      if (!pickupDate) {
        setFormError("Please select a pickup date."); return;
      }
      const today = new Date(); today.setHours(0, 0, 0, 0);
      if (pickupDate < today) {
        setFormError("Pickup date cannot be in the past."); return;
      }
      if (!pickupAddress.trim() || pickupAddress.trim().length < 5) {
        setFormError("Please enter a valid pickup address."); return;
      }
      if (!dropAddress.trim() || dropAddress.trim().length < 5) {
        setFormError("Please enter a valid drop-off address."); return;
      }
      if (pickupAddress.trim().toLowerCase() === dropAddress.trim().toLowerCase()) {
        setFormError("Pickup and drop-off addresses cannot be the same."); return;
      }
    }
    if (currentStep === 2) {
      if (!customerName.trim() || customerName.trim().length < 2) {
        setFormError("Please enter your full name."); return;
      }
      if (!customerPhone.trim() || customerPhone.length !== 10) {
        setFormError("Please enter a valid 10-digit mobile number."); return;
      }
      if (!otpVerified) {
        setFormError("Please verify your mobile number with OTP before proceeding."); return;
      }
      if (!customerEmail.trim() || !customerEmail.includes("@")) {
        setFormError("Please enter a valid email address."); return;
      }
    }
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    if (!agreeTerms) { alert("Please agree to the terms and conditions"); return; }
    setIsSubmitting(true);

    try {
      // Step 1: Create booking (or reuse existing if resuming an abandoned booking)
      let bookingId: number;
      if (resumeBookingId > 0) {
        bookingId = resumeBookingId;
      } else {
        const bookingResult = await createBookingMutation.mutateAsync({
          carId,
          fromCity: fromCity || pickupAddress.split(",")[0],
          toCity: toCity || dropAddress.split(",")[0],
          pickupDate: pickupDate ? format(pickupDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
          returnDate: returnDate ? format(returnDate, "yyyy-MM-dd") : undefined,
          returnTime: tripType === "round_trip" ? returnTime : undefined,
          tripType: tripType as "one_way" | "round_trip",
          passengerCount: car ? car.seats - 1 : 4,
          totalKm: billedKm,
          totalPrice,
          customerName,
          customerPhone,
          customerEmail,
          pickupAddress: `${pickupAddress}, Pincode: ${pickupPincode}, Time: ${pickupTime}${pickupLat ? `, GPS: ${pickupLat},${pickupLng}` : ""}`,
          specialRequests: dropAddress ? `Drop: ${dropAddress}${dropPincode ? ` (${dropPincode})` : ""}${specialRequests ? `. Notes: ${specialRequests}` : ""}` : specialRequests || undefined,
        });
        bookingId = bookingResult.bookingId;
      }

      // Helper: cancel the just-created booking and surface an error
      const abortWithError = (msg: string) => {
        cancelBookingMutation.mutate({ id: bookingId });
        setFormError(msg);
        setIsSubmitting(false);
      };

      // Test accounts skip payment entirely
      if (isTestUser) {
        await confirmTestBookingMutation.mutateAsync({ bookingId });
        setAdvancePaid(true);
        setBookingId(bookingId);
        setBookingComplete(true);
        setIsSubmitting(false);
        return;
      }

      // Step 2: Create Razorpay order for 10% advance — payment is required
      let order: Awaited<ReturnType<typeof createOrderMutation.mutateAsync>>;
      try {
        order = await createOrderMutation.mutateAsync({ bookingId, totalPrice });
      } catch {
        abortWithError("Payment setup failed. Please try again or contact us on WhatsApp.");
        return;
      }

      const Razorpay = (window as any).Razorpay;
      if (!Razorpay) {
        abortWithError("Payment system could not load. Please refresh the page and try again.");
        return;
      }

      // Step 3: Open Razorpay — booking only completes after payment is verified
      const razorpayOptions = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "EasyOutstation",
        description: `Booking #${bookingId} — Advance Payment`,
        order_id: order.orderId,
        prefill: {
          name: customerName,
          email: customerEmail,
          contact: `+91${customerPhone}`,
        },
        theme: { color: "#2563EB" },
        handler: async (response: any) => {
          // Payment succeeded — clear pending ref so mobile fallbacks don't misfire
          pendingPaymentRef.current = null;
          localStorage.removeItem("eo_pending_booking");
          // Step 4: Verify payment — only then show success
          try {
            await verifyPaymentMutation.mutateAsync({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              bookingId,
            });
            setAdvancePaid(true);
            setBookingId(bookingId);
            setBookingComplete(true);
            setIsSubmitting(false);
          } catch {
            setFormError("Payment verification failed. Please contact us with your payment reference.");
            setIsSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            // Clear ref so visibilitychange fallback doesn't double-fire
            pendingPaymentRef.current = null;
            localStorage.removeItem("eo_pending_booking");
            // Fire abandonment SMS + email immediately so customer gets a resume link
            notifyAbandonedMutation.mutate({ id: bookingId });
            abortWithError("Payment was not completed. Check your SMS/email for a link to resume this booking.");
          },
        },
      };

      // Set pending ref BEFORE opening — mobile fallbacks watch this
      pendingPaymentRef.current = bookingId;
      const rzp = new Razorpay(razorpayOptions);
      rzp.open();

    } catch {
      setIsSubmitting(false);
      setFormError("Booking failed. Please try again or email us at easyoutstation@gmail.com.");
    }
  };

  if (bookingComplete) {
    // Estimate arrival: pickup time + 30 min prep
    const estimatedArrival = (() => {
      if (!pickupTime) return null;
      const [h, m] = pickupTime.split(":").map(Number);
      const d = new Date();
      d.setHours(h, m - 30, 0);
      if (d.getMinutes() < 0) { d.setHours(d.getHours() - 1); d.setMinutes(d.getMinutes() + 60); }
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    })();

    const whatsappShareText = encodeURIComponent(
      `🚌 My EasyOutstation trip is confirmed!\n\n📍 ${fromCity} → ${toCity}\n📅 Pickup: ${pickupDate ? format(pickupDate, "dd MMM yyyy") : ""} at ${pickupTime}${tripType === "round_trip" ? `\n🔄 Return: ${returnDate ? format(returnDate, "dd MMM yyyy") : "Same day"}${returnTime ? ` at ${fmtTime(returnTime)}` : ""}` : ""}\n💰 ₹${totalPrice.toLocaleString("en-IN")}\n\nBooking ID: #${bookingId}\n\nBook your ride at easyoutstation.com`
    );

    clearBookingDraft();

    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="pt-20">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16">
            <Card className="text-center p-8 shadow-xl border-0">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold font-['DM_Serif_Display'] mb-2">Booking Confirmed!</h1>
              <p className="text-muted-foreground mb-2">Booking ID: <span className="font-bold text-primary">#{bookingId}</span></p>
              {advancePaid && (
                <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm font-medium px-4 py-2 rounded-full mb-3">
                  <Check className="w-4 h-4" /> Advance Paid Successfully
                </div>
              )}
              <p className="text-sm text-muted-foreground mb-4">
                A confirmation email has been sent to <strong>{customerEmail}</strong>.<br />
                Driver details will be shared within <strong>60 minutes</strong>.<br />
                {advancePaid
                  ? <>Balance of <strong>₹{(totalPrice - Math.max(100, Math.round(totalPrice * 0.1))).toLocaleString("en-IN")}</strong> payable to driver at pickup.</>
                  : <>Full amount of <strong>₹{totalPrice.toLocaleString("en-IN")}</strong> payable to driver at pickup.</>
                }
              </p>

              {/* Estimated arrival */}
              {estimatedArrival && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="text-left">
                    <div className="text-xs text-blue-500 font-medium uppercase tracking-wide">Estimated Driver Arrival</div>
                    <div className="text-sm font-bold text-blue-800">Your driver will be ready by {estimatedArrival}</div>
                  </div>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-4 text-sm text-left space-y-2 mb-6">
                <div className="flex justify-between"><span className="text-muted-foreground">Route</span><span className="font-medium">{fromCity} → {toCity}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pickup</span><span className="font-medium">{pickupDate ? format(pickupDate, "dd MMM yyyy") : ""} at {pickupTime}</span></div>
                {tripType === "round_trip" && (<div className="flex justify-between"><span className="text-muted-foreground">Return</span><span className="font-medium">{returnDate ? format(returnDate, "dd MMM yyyy") : "Same day"}{returnTime ? ` at ${fmtTime(returnTime)}` : ""}</span></div>)}
                <div className="flex justify-between"><span className="text-muted-foreground">Distance</span><span className="font-medium">{finalDistance} km {durationText && `(${durationText})`}</span></div>
                <Separator />
                <div className="flex justify-between font-bold"><span>Total Fare</span><span className="text-primary">₹{totalPrice.toLocaleString("en-IN")}</span></div>
              </div>

              <div className="flex flex-col gap-3">
                {/* WhatsApp Share */}
                <a href={`https://wa.me/?text=${whatsappShareText}`} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full bg-[#25D366] hover:bg-[#22c55e] text-white gap-2">
                    <MessageCircle className="w-4 h-4" />
                    Share Trip on WhatsApp
                  </Button>
                </a>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>Back to Home</Button>
                  <Button className="flex-1 bg-primary" onClick={() => navigate("/dashboard")}>View Bookings</Button>
                </div>
              </div>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="pt-20">
        {/* Sticky mobile price bar */}
        <div className="sticky top-16 z-30 lg:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-500">{car?.name || "Selected Vehicle"}</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">{fromCity} → {toCity}</span>
          </div>
          <div className="text-base font-bold text-blue-700">₹{totalPrice.toLocaleString("en-IN")}</div>
        </div>

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Change Car link */}
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Change vehicle or route
          </button>
          {/* Steps */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  currentStep === step.id ? "bg-primary text-white shadow-md" :
                  currentStep > step.id ? "bg-green-100 text-green-700" : "bg-white text-muted-foreground border"
                }`}>
                  {currentStep > step.id ? <Check className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
                  <span className="hidden sm:inline">{step.label}</span>
                </div>
                {idx < steps.length - 1 && <div className={`w-8 h-0.5 ${currentStep > step.id ? "bg-green-400" : "bg-slate-200"}`} />}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <Card className="shadow-sm border-0">
                <CardContent className="p-6">

                  {/* STEP 1 */}
                  {currentStep === 1 && (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Trip Details</h2>
                        {(paramFromFull || paramDate || paramTripType !== "one_way") && (
                          <span className="text-xs bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full flex items-center gap-1">
                            <Check className="w-3 h-3" /> Pre-filled from your search
                          </span>
                        )}
                      </div>

                      {/* Trip Type */}
                      <div className="space-y-2">
                        <Label>Trip Type</Label>
                        <div className="flex gap-2">
                          {["one_way", "round_trip"].map((type) => (
                            <button
                              key={type}
                              onClick={() => { setTripType(type); if (type === "one_way") setReturnDate(undefined); }}
                              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                                tripType === type ? "bg-primary text-white border-primary" : "bg-white border-input hover:border-primary"
                              }`}
                            >
                              {type === "one_way" ? "One Way" : "Round Trip"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Date & Time */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Pickup Date *</Label>
                          <Popover open={pickupCalOpen} onOpenChange={setPickupCalOpen}>
                            <PopoverTrigger asChild>
                              <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-input bg-white text-sm hover:border-primary transition-colors">
                                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                                <span>{pickupDate ? format(pickupDate, "dd MMM yyyy") : "Select date"}</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3 shadow-lg">
                              <Calendar mode="single" selected={pickupDate} onSelect={(d) => { setPickupDate(d); setPickupCalOpen(false); }} disabled={(d) => d < new Date()} />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="space-y-2">
                          <Label>Pickup Time *</Label>
                          <input
                            type="time"
                            value={pickupTime}
                            onChange={(e) => setPickupTime(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-input bg-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                          />
                        </div>
                      </div>

                      {tripType === "round_trip" && (
                        <div className="space-y-2">
                          <Label>Return Date <span className="text-xs text-muted-foreground font-normal">(leave blank for same day return)</span></Label>
                          <div className="flex gap-2">
                            <Popover open={returnCalOpen} onOpenChange={setReturnCalOpen}>
                              <PopoverTrigger asChild>
                                <button className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border bg-white text-sm hover:border-primary transition-colors ${
                                  returnDate ? "border-input" : "border-dashed border-slate-300"
                                }`}>
                                  <CalendarDays className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <span className={returnDate ? "" : "text-muted-foreground"}>
                                    {returnDate ? format(returnDate, "dd MMM yyyy") : "Overnight — pick return date"}
                                  </span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-3 shadow-lg">
                                <Calendar mode="single" selected={returnDate} onSelect={(d) => { setReturnDate(d); setReturnCalOpen(false); }} disabled={(d) => d <= (pickupDate || new Date())} />
                              </PopoverContent>
                            </Popover>
                            {returnDate && (
                              <button onClick={() => setReturnDate(undefined)}
                                className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-500 hover:border-red-300 hover:text-red-500 transition-colors whitespace-nowrap">
                                Same day
                              </button>
                            )}
                          </div>
                          {!returnDate && (
                            <p className="text-[11px] text-blue-600 bg-blue-50 rounded-lg px-3 py-1.5">
                              Same day return — driver charge for 1 day · distance charged ×2
                            </p>
                          )}
                        </div>
                      )}

                      {tripType === "round_trip" && (
                        <div className="space-y-2">
                          <Label>Return Pickup Time *</Label>
                          <input
                            type="time"
                            value={returnTime}
                            onChange={(e) => setReturnTime(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-input bg-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                          />
                          <p className="text-[11px] text-slate-500">What time should the driver pick you up on the return day?</p>
                        </div>
                      )}

                      {/* Pickup Address */}
                      <div className="space-y-2">
                        <Label>Pickup Address * <span className="text-xs text-muted-foreground">(House/Flat No, Street, Area)</span></Label>
                        <AddressAutocomplete
                          value={pickupAddress}
                          onChange={(address, pincode, lat, lng) => {
                            setPickupAddress(address);
                            if (pincode) setPickupPincode(pincode);
                            if (lat) setPickupLat(lat);
                            if (lng) setPickupLng(lng);
                          }}
                          placeholder="Start typing your pickup address..."
                        />
                        {pickupPincode && (
                          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Pincode auto-detected: <strong>{pickupPincode}</strong>
                          </p>
                        )}
                        {!pickupPincode && pickupAddress && (
                          <div className="space-y-1">
                            <Label className="text-xs">Pickup Pincode *</Label>
                            <Input value={pickupPincode} onChange={(e) => setPickupPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              placeholder="Enter 6-digit pincode" maxLength={6} />
                          </div>
                        )}
                        {pickupLat && pickupLng && (
                          <MapPreview lat={pickupLat} lng={pickupLng} label={pickupAddress} />
                        )}
                      </div>

                      {/* Drop Address */}
                      <div className="space-y-2">
                        <Label>Drop-off Address * <span className="text-xs text-muted-foreground">(Destination address)</span></Label>
                        <AddressAutocomplete
                          value={dropAddress}
                          onChange={(address, pincode, lat, lng) => {
                            setDropAddress(address);
                            if (pincode) setDropPincode(pincode);
                            if (lat) setDropLat(lat);
                            if (lng) setDropLng(lng);
                          }}
                          placeholder="Enter your destination address..."
                        />
                        {dropPincode && (
                          <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Pincode auto-detected: <strong>{dropPincode}</strong>
                          </p>
                        )}
                        {!dropPincode && dropAddress && (
                          <div className="space-y-1">
                            <Label className="text-xs">Drop Pincode *</Label>
                            <Input value={dropPincode} onChange={(e) => setDropPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              placeholder="Enter 6-digit pincode" maxLength={6} />
                          </div>
                        )}
                        {dropLat && dropLng && (
                          <MapPreview lat={dropLat} lng={dropLng} label={dropAddress} />
                        )}
                      </div>

                      {/* Distance Result */}
                      {(pickupLat && dropLat) && (
                        <div className={`flex items-center gap-3 p-3 rounded-xl ${isCalcDistance ? "bg-slate-50" : "bg-green-50 border border-green-200"}`}>
                          {isCalcDistance ? (
                            <><Loader2 className="w-4 h-4 animate-spin text-primary" /><span className="text-sm text-muted-foreground">Calculating distance...</span></>
                          ) : (
                            <><Route className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-800">
                              Distance: <strong>{finalDistance} km</strong>
                              {durationText && <span className="text-green-600 ml-2">({durationText})</span>}
                            </span></>
                          )}
                        </div>
                      )}

                      {/* Special Requests */}
                      <div className="space-y-2">
                        <Label>Special Requests <span className="text-xs text-muted-foreground">(Optional)</span></Label>
                        <textarea
                          value={specialRequests}
                          onChange={(e) => setSpecialRequests(e.target.value)}
                          placeholder="Any special requirements, preferred route, stops, etc..."
                          className="w-full px-3 py-2.5 rounded-xl border border-input bg-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none min-h-[80px] resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {/* STEP 2 */}
                  {currentStep === 2 && (
                    <div className="space-y-5">
                      <h2 className="text-xl font-semibold">Personal Information</h2>

                      <div className="space-y-2">
                        <Label>Full Name *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter your full name" className="pl-10" autoComplete="name" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Mobile Number * <span className="text-xs text-muted-foreground">(for driver coordination)</span></Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">+91</span>
                            <Input
                              value={customerPhone}
                              onChange={(e) => { setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setOtpVerified(false); }}
                              placeholder="10-digit mobile number"
                              className="pl-12"
                              disabled={otpVerified}
                              type="tel" inputMode="numeric" autoComplete="tel-national"
                            />
                          </div>
                          {otpVerified && (
                            <span className="flex items-center gap-1 text-green-600 text-sm font-medium shrink-0 px-2">
                              <Check className="w-4 h-4" /> Verified
                            </span>
                          )}
                        </div>

                        {/* Firebase OTP */}
                        {!otpVerified && customerPhone.length === 10 && (
                          <FirebaseOTP
                            phone={customerPhone}
                            onVerified={() => { setOtpVerified(true); setOtpError(""); setFormError(""); }}
                            onError={(msg) => setOtpError(msg)}
                          />
                        )}
                        {!otpVerified && customerPhone.length !== 10 && (
                          <p className="text-xs text-slate-400">Enter your 10-digit number above to receive OTP</p>
                        )}
                        {otpError && <p className="text-xs text-red-500 flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2"><AlertCircle className="w-3.5 h-3.5 shrink-0" />{otpError}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label>Email Address * <span className="text-xs text-muted-foreground">(confirmation will be sent here)</span></Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="your@email.com" className="pl-10" autoComplete="email" inputMode="email" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3 */}
                  {currentStep === 3 && (
                    <div className="space-y-5">
                      <h2 className="text-xl font-semibold">Review & Confirm</h2>
                      {resumeBookingId > 0 && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                          <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                          <span>Resuming your saved booking — your details are pre-filled. Just review and pay to confirm.</span>
                        </div>
                      )}

                      <div className="bg-muted rounded-xl p-4 space-y-3">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Vehicle</span><span className="font-medium">{car?.name}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Route</span><span className="font-medium">{fromCity} → {toCity}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Trip Type</span><span className="font-medium capitalize">{tripType.replace("_", " ")}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pickup Address</span><span className="font-medium text-right max-w-[200px]">{pickupAddress}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Drop Address</span><span className="font-medium text-right max-w-[200px]">{dropAddress}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pickup Date & Time</span><span className="font-medium">{pickupDate ? format(pickupDate, "dd MMM yyyy") : ""} at {pickupTime}</span></div>
                        {tripType === "round_trip" && (<div className="flex justify-between text-sm"><span className="text-muted-foreground">Return Date & Time</span><span className="font-medium">{returnDate ? format(returnDate, "dd MMM yyyy") : "Same day"}{returnTime ? ` at ${fmtTime(returnTime)}` : ""}</span></div>)}
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Passengers allowed</span><span className="font-medium">{car ? car.seats - 1 : "—"}</span></div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Distance</span>
                          <span className="font-medium">
                            {billedKm} km{durationText && ` (${durationText})`}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Distance Fare ({billedKm} km × ₹{pricePerKm})</span>
                          <span>₹{basePrice.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Driver Charges (₹{driverChargePerDay}/day × {tripDays} day{tripDays > 1 ? "s" : ""})</span>
                          <span>₹{totalDriverCharges.toLocaleString("en-IN")}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-base"><span>Fixed Fare</span><span className="text-primary">₹{(basePrice + totalDriverCharges).toLocaleString("en-IN")}</span></div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Toll charges</span>
                          <span className="text-amber-600 text-xs font-medium">Charged at actuals</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Parking charges</span>
                          <span className="text-amber-600 text-xs font-medium">Charged at actuals</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground bg-slate-50 rounded-lg px-3 py-2">
                          ℹ️ Toll and parking collected at actuals — no markup. Any km beyond {billedKm} km on this trip charged at ₹{pricePerKm}/km.
                        </p>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <h3 className="text-sm font-semibold text-blue-800 mb-2">Customer Details</h3>
                        <div className="text-sm space-y-1 text-blue-700">
                          <div>{customerName}</div>
                          <div>+91-{customerPhone}</div>
                          <div>{customerEmail}</div>
                        </div>
                      </div>

                      {isTestUser ? (
                        <div className="bg-violet-50 border border-violet-300 rounded-xl p-4 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-violet-200 flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-4 h-4 text-violet-700" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-violet-800">Test Mode — Payment Bypassed</p>
                            <p className="text-xs text-violet-600">This account is marked as a test user. Booking will be confirmed without payment.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-blue-800">Advance Payment Now (10%)</span>
                            <span className="text-lg font-bold text-blue-700">₹{Math.max(100, Math.round(totalPrice * 0.1)).toLocaleString("en-IN")}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-blue-600">
                            <span>Balance Payment (To driver at pickup)</span>
                            <span>₹{(totalPrice - Math.max(100, Math.round(totalPrice * 0.1))).toLocaleString("en-IN")}</span>
                          </div>
                          <p className="text-[10px] text-blue-500">
                            10% advance confirms your booking. 100% refundable on cancellation 24hrs before pickup.
                          </p>
                        </div>
                      )}

                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-sm text-amber-800">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Driver details will be shared within 60 minutes of booking confirmation.</span>
                      </div>

                      <div className="flex items-start gap-3">
                        <Checkbox id="terms" checked={agreeTerms} onCheckedChange={(v) => setAgreeTerms(v as boolean)} className="mt-0.5" />
                        <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                          I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">Terms & Conditions</a> and <a href="/cancellation" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">Cancellation Policy</a>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex flex-col gap-3 mt-6 pt-4 border-t">
                    {formError && (
                      <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {formError}
                      </div>
                    )}
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={handleBack} disabled={currentStep === 1} className="gap-2">
                        <ArrowLeft className="w-4 h-4" /> Back
                      </Button>
                    {currentStep < 3 ? (
                      <Button onClick={handleNext} className="bg-primary gap-2">
                        Continue <ArrowRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary gap-2">
                        {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <>Pay ₹{Math.max(100, Math.round(totalPrice * 0.1)).toLocaleString("en-IN")} & Confirm Booking <Check className="w-4 h-4" /></>}
                      </Button>
                    )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <Card className="shadow-sm border-0 sticky top-24">
                <CardContent className="p-5 space-y-4">
                  {car && (
                    <div className="flex gap-3 items-center">
                      {car.imageUrl && <img src={car.imageUrl} alt={car.name} className="w-16 h-12 object-cover rounded-lg" />}
                      <div>
                        <div className="font-semibold text-sm">{car.name}</div>
                        <div className="text-xs text-muted-foreground">{car.brand} · {car.seats - 1} passengers</div>
                      </div>
                    </div>
                  )}
                  <Separator />
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Route</span><span className="font-medium">{fromCity} → {toCity || "Custom"}</span></div>
                    {finalDistance > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Distance</span><span className="font-medium">{finalDistance} km</span></div>}
                    {durationText && <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-medium">{durationText}</span></div>}
                    <div className="flex justify-between"><span className="text-muted-foreground">Rate</span><span className="font-medium">₹{pricePerKm}/km</span></div>
                  </div>
                  <Separator />
                  <div className="bg-primary/5 rounded-xl p-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      {tripType === "round_trip" ? "Round Trip Total" :
                       "One Way Total"}
                    </div>
                    <div className="text-2xl font-bold text-primary">₹{(basePrice + totalDriverCharges).toLocaleString("en-IN")}</div>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <div>₹{pricePerKm}/km × {billedKm} km = ₹{basePrice.toLocaleString("en-IN")}</div>
                      <div>Driver: ₹{totalDriverCharges} · Toll + Parking: at actuals</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2"><Shield className="w-3 h-3 text-green-500" /> Verified professional driver</div>
                    <div className="flex items-center gap-2"><Clock className="w-3 h-3 text-green-500" /> Confirmation within 60 minutes</div>
                    <div className="flex items-center gap-2"><Users className="w-3 h-3 text-green-500" /> 24/7 customer support</div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
