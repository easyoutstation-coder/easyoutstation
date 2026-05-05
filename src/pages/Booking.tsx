import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
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
  Route, Loader2, AlertCircle, LogIn,
} from "lucide-react";

const steps = [
  { id: 1, label: "Trip Details", icon: MapPin },
  { id: 2, label: "Personal Info", icon: User },
  { id: 3, label: "Review & Pay", icon: CreditCard },
];

export default function BookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);
  const [advancePaid, setAdvancePaid] = useState(false);

  // Trip details
  const [tripType, setTripType] = useState("one_way");
  const [pickupDate, setPickupDate] = useState<Date>();
  const [pickupTime, setPickupTime] = useState("08:00");
  const [returnDate, setReturnDate] = useState<Date>();
  const [passengerCount, setPassengerCount] = useState("4");
  const [specialRequests, setSpecialRequests] = useState("");

  // Pickup location
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupPincode, setPickupPincode] = useState("");
  const [pickupLat, setPickupLat] = useState<number>();
  const [pickupLng, setPickupLng] = useState<number>();

  // Drop location
  const [dropAddress, setDropAddress] = useState("");
  const [dropPincode, setDropPincode] = useState("");
  const [dropLat, setDropLat] = useState<number>();
  const [dropLng, setDropLng] = useState<number>();

  // Customer info - pre-filled from auth
  const [customerName, setCustomerName] = useState(user?.name || "");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState(user?.email || "");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // OTP
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");

  const carId = parseInt(searchParams.get("carId") || "0");
  const fromCity = searchParams.get("from") || "Delhi";
  const toCity = searchParams.get("to") || "";
  const defaultDistance = parseInt(searchParams.get("distance") || "0");

  const { data: car } = trpc.car.getById.useQuery({ id: carId }, { enabled: carId > 0 });

  // Auth gate - must be logged in to book
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen px-4">
          <div className="max-w-md w-full text-center bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 font-['Playfair_Display'] mb-2">Sign in to Book</h2>
            <p className="text-slate-500 mb-6 text-sm">You need an account to complete your booking. It only takes 30 seconds.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => navigate(-1)} className="flex-1">
                Go Back
              </Button>
              <Button onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.href)}`)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                Sign In / Sign Up
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Distance calculation
  const { distanceKm, durationText, isLoading: isCalcDistance, calculateDistance } = useDistanceCalculator();
  const [manualDistance, setManualDistance] = useState(defaultDistance);
  const finalDistance = distanceKm || manualDistance;

  const pricePerKm = parseFloat(car?.pricePerKm || "20");
  const driverChargePerDay = parseFloat(car?.driverCharges || "400");

  // Trip type pricing logic
  const tripDays = tripType === "multi_day" && returnDate && pickupDate
    ? Math.max(2, Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)))
    : tripType === "round_trip" ? 2  // Round trip always minimum 2 driver days
    : 1;

  const totalKmForTrip = tripType === "round_trip"
    ? finalDistance * 2
    : tripType === "multi_day"
    ? finalDistance * tripDays
    : finalDistance;

  const basePrice = pricePerKm * totalKmForTrip;
  const totalDriverCharges = driverChargePerDay * tripDays;

  // Toll charges based on known routes (approximate actuals)
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
    const oneway = key ? tolls[key] : Math.round(finalDistance * 1.2); // ~₹1.2/km estimate
    return tripType === "round_trip" ? oneway * 2 : oneway;
  })();

  const totalPrice = basePrice + totalDriverCharges + tollCharges;

  // Auto-calculate distance when both locations are selected
  useEffect(() => {
    if (pickupLat && pickupLng && dropLat && dropLng) {
      calculateDistance(pickupLat, pickupLng, dropLat, dropLng);
    }
  }, [pickupLat, pickupLng, dropLat, dropLng]);

  // Pre-fill drop address from route
  useEffect(() => {
    if (toCity && !dropAddress) {
      setDropAddress(toCity + ", India");
    }
  }, [toCity]);

  const sendOtpMutation = trpc.sms.sendOtp.useMutation({
    onSuccess: (data) => {
      setOtpSent(true);
      setOtpError("");
      if (data.dev && data.otp) {
        // Dev mode - show OTP in alert
        alert(`[DEV MODE] Your OTP is: ${data.otp}`);
      } else {
        alert(`OTP sent to +91-${customerPhone}. Please check your SMS.`);
      }
    },
    onError: (e) => setOtpError(e.message),
  });

  const verifyOtpMutation = trpc.sms.verifyOtp.useMutation({
    onSuccess: () => {
      setOtpVerified(true);
      setOtpError("");
    },
    onError: () => setOtpError("Invalid OTP. Please try again."),
  });

  const sendOtp = () => {
    if (!customerPhone || customerPhone.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    sendOtpMutation.mutate({ phone: customerPhone });
  };

  const verifyOtp = () => {
    if (!otpInput || otpInput.length < 6) {
      setOtpError("Please enter the 6-digit OTP.");
      return;
    }
    verifyOtpMutation.mutate({ phone: customerPhone, otp: otpInput });
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!pickupDate) { alert("Please select a pickup date."); return; }
      if (!pickupAddress.trim()) { alert("Please enter your pickup address."); return; }
      if (!pickupPincode.trim() || pickupPincode.length < 6) { alert("Please enter a valid 6-digit pickup pincode."); return; }
      if (!dropAddress.trim()) { alert("Please enter your drop-off address."); return; }
    }
    if (currentStep === 2) {
      if (!customerName.trim()) { alert("Please enter your full name."); return; }
      if (!customerPhone.trim() || customerPhone.length < 10) { alert("Please enter a valid 10-digit mobile number."); return; }
      if (!otpVerified) { alert("Please verify your mobile number with OTP before proceeding."); return; }
      if (!customerEmail.trim() || !customerEmail.includes("@")) { alert("Please enter a valid email address."); return; }
    }
    if (currentStep < 3) setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const createBooking = trpc.booking.create.useMutation();

  const createOrderMutation = trpc.payment.createOrder.useMutation();
  const verifyPaymentMutation = trpc.payment.verifyPayment.useMutation();

  const handleSubmit = async () => {
    if (!agreeTerms) { alert("Please agree to the terms and conditions"); return; }
    setIsSubmitting(true);

    try {
      // Step 1: Create booking first to get bookingId
      const bookingResult = await createBooking.mutateAsync({
        carId,
        fromCity: fromCity || pickupAddress.split(",")[0],
        toCity: toCity || dropAddress.split(",")[0],
        pickupDate: pickupDate ? format(pickupDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        returnDate: returnDate ? format(returnDate, "yyyy-MM-dd") : undefined,
        tripType: tripType as "one_way" | "round_trip" | "multi_day",
        passengerCount: parseInt(passengerCount),
        totalKm: totalKmForTrip,
        totalPrice,
        customerName,
        customerPhone,
        customerEmail,
        pickupAddress: `${pickupAddress}, Pincode: ${pickupPincode}, Time: ${pickupTime}${pickupLat ? `, GPS: ${pickupLat},${pickupLng}` : ""}`,
        specialRequests: dropAddress ? `Drop: ${dropAddress}${dropPincode ? ` (${dropPincode})` : ""}${specialRequests ? `. Notes: ${specialRequests}` : ""}` : specialRequests || undefined,
      });

      const bookingId = bookingResult.bookingId;

      // Step 2: Try to create Razorpay order for ₹100 advance
      try {
        const order = await createOrderMutation.mutateAsync({ bookingId });

        // Step 3: Open Razorpay checkout
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
            // Step 4: Verify payment
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
          },
          modal: {
            ondismiss: () => {
              // Payment dismissed — booking still created, mark as pending
              setBookingId(bookingId);
              setBookingComplete(true);
              setIsSubmitting(false);
            },
          },
        };

        const Razorpay = (window as any).Razorpay;
        if (Razorpay) {
          const rzp = new Razorpay(razorpayOptions);
          rzp.open();
        } else {
          // Razorpay script not loaded — complete booking without payment
          setBookingId(bookingId);
          setBookingComplete(true);
          setIsSubmitting(false);
        }
      } catch {
        // Razorpay not configured — complete booking without advance payment
        setBookingId(bookingId);
        setBookingComplete(true);
        setIsSubmitting(false);
      }
    } catch {
      setIsSubmitting(false);
      alert("Booking failed. Please try again or email us at easyoutstation@gmail.com.");
    }
  };

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="pt-20">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16">
            <Card className="text-center p-8 shadow-xl border-0">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold font-['Playfair_Display'] mb-2">Booking Confirmed!</h1>
              <p className="text-muted-foreground mb-2">Booking ID: <span className="font-bold text-primary">#{bookingId}</span></p>
              {advancePaid && (
                <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm font-medium px-4 py-2 rounded-full mb-3">
                  <Check className="w-4 h-4" /> ₹100 Advance Paid Successfully
                </div>
              )}
              <p className="text-sm text-muted-foreground mb-6">
                A confirmation email has been sent to <strong>{customerEmail}</strong>.<br />
                Driver details will be shared within <strong>4 hours</strong>.<br />
                {advancePaid
                  ? <>Balance of <strong>₹{(totalPrice - 100).toLocaleString("en-IN")}</strong> payable to driver at pickup.</>
                  : <>Full amount of <strong>₹{totalPrice.toLocaleString("en-IN")}</strong> payable to driver at pickup.</>
                }
              </p>
              <div className="bg-slate-50 rounded-xl p-4 text-sm text-left space-y-2 mb-6">
                <div className="flex justify-between"><span className="text-muted-foreground">Route</span><span className="font-medium">{fromCity} → {toCity}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pickup</span><span className="font-medium">{pickupDate ? format(pickupDate, "dd MMM yyyy") : ""} at {pickupTime}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Distance</span><span className="font-medium">{finalDistance} km {durationText && `(${durationText})`}</span></div>
                <Separator />
                <div className="flex justify-between font-bold"><span>Total Fare</span><span className="text-primary">₹{totalPrice.toLocaleString("en-IN")}</span></div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => navigate("/")}>Back to Home</Button>
                <Button className="flex-1 bg-primary" onClick={() => navigate("/dashboard")}>View Bookings</Button>
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
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
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
                      <h2 className="text-xl font-semibold">Trip Details</h2>

                      {/* Trip Type */}
                      <div className="space-y-2">
                        <Label>Trip Type</Label>
                        <div className="flex gap-2">
                          {["one_way", "round_trip", "multi_day"].map((type) => (
                            <button
                              key={type}
                              onClick={() => setTripType(type)}
                              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium border transition-all ${
                                tripType === type ? "bg-primary text-white border-primary" : "bg-white border-input hover:border-primary"
                              }`}
                            >
                              {type === "one_way" ? "One Way" : type === "round_trip" ? "Round Trip" : "Multi Day"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Date & Time */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Pickup Date *</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-input bg-white text-sm hover:border-primary transition-colors">
                                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                                <span>{pickupDate ? format(pickupDate, "dd MMM yyyy") : "Select date"}</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar mode="single" selected={pickupDate} onSelect={setPickupDate} disabled={(d) => d < new Date()} />
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

                      {tripType !== "one_way" && (
                        <div className="space-y-2">
                          <Label>Return Date *</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-input bg-white text-sm hover:border-primary transition-colors">
                                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                                <span>{returnDate ? format(returnDate, "dd MMM yyyy") : "Select return date"}</span>
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar mode="single" selected={returnDate} onSelect={setReturnDate} disabled={(d) => d < (pickupDate || new Date())} />
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}

                      {/* Passengers */}
                      <div className="space-y-2">
                        <Label>Passengers</Label>
                        <select
                          value={passengerCount}
                          onChange={(e) => setPassengerCount(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-input bg-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        >
                          {[1,2,3,4,5,6,7,8].map((n) => (
                            <option key={n} value={n}>{n} Passenger{n > 1 ? "s" : ""}</option>
                          ))}
                        </select>
                      </div>

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
                        {pickupLat && pickupLng && (
                          <MapPreview lat={pickupLat} lng={pickupLng} label={pickupAddress} />
                        )}
                      </div>

                      {/* Pickup Pincode */}
                      <div className="space-y-2">
                        <Label>Pickup Pincode *</Label>
                        <Input
                          value={pickupPincode}
                          onChange={(e) => setPickupPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="Auto-filled or enter 6-digit pincode"
                          maxLength={6}
                        />
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
                          <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Enter your full name" className="pl-10" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Mobile Number * <span className="text-xs text-muted-foreground">(for driver coordination)</span></Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">+91</span>
                            <Input
                              value={customerPhone}
                              onChange={(e) => { setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10)); setOtpVerified(false); setOtpSent(false); }}
                              placeholder="10-digit mobile number"
                              className="pl-12"
                              disabled={otpVerified}
                            />
                          </div>
                          {!otpVerified && (
                            <Button type="button" variant="outline" onClick={sendOtp} className="shrink-0">
                              {otpSent ? "Resend" : "Send OTP"}
                            </Button>
                          )}
                          {otpVerified && (
                            <span className="flex items-center gap-1 text-green-600 text-sm font-medium shrink-0 px-2">
                              <Check className="w-4 h-4" /> Verified
                            </span>
                          )}
                        </div>
                        {otpSent && !otpVerified && (
                          <div className="flex gap-2 mt-2">
                            <Input value={otpInput} onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter 6-digit OTP" maxLength={6} />
                            <Button type="button" onClick={verifyOtp} className="shrink-0">Verify</Button>
                          </div>
                        )}
                        {otpError && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{otpError}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label>Email Address * <span className="text-xs text-muted-foreground">(confirmation will be sent here)</span></Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="your@email.com" className="pl-10" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 3 */}
                  {currentStep === 3 && (
                    <div className="space-y-5">
                      <h2 className="text-xl font-semibold">Review & Confirm</h2>

                      <div className="bg-muted rounded-xl p-4 space-y-3">
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Car</span><span className="font-medium">{car?.name}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Route</span><span className="font-medium">{fromCity} → {toCity}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Trip Type</span><span className="font-medium capitalize">{tripType.replace("_", " ")}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Pickup Address</span><span className="font-medium text-right max-w-[200px]">{pickupAddress}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Drop Address</span><span className="font-medium text-right max-w-[200px]">{dropAddress}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Date & Time</span><span className="font-medium">{pickupDate ? format(pickupDate, "dd MMM yyyy") : ""} at {pickupTime}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Passengers</span><span className="font-medium">{passengerCount}</span></div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Distance</span>
                          <span className="font-medium">
                            {tripType === "round_trip" ? `${finalDistance} km × 2 = ${totalKmForTrip} km` :
                             tripType === "multi_day" ? `${finalDistance} km × ${tripDays} days = ${totalKmForTrip} km` :
                             `${finalDistance} km`}
                            {durationText && ` (${durationText})`}
                          </span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Distance Fare ({totalKmForTrip} km × ₹{pricePerKm})</span>
                          <span>₹{basePrice.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Driver Charges (₹{driverChargePerDay}/day × {tripType === "one_way" ? 1 : tripDays} day{tripDays > 1 ? "s" : ""})</span>
                          <span>₹{totalDriverCharges.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Toll Charges ({tripType === "round_trip" ? "both ways" : "one way"})</span>
                          <span>₹{tollCharges.toLocaleString("en-IN")}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-base"><span>Total Fare</span><span className="text-primary">₹{totalPrice.toLocaleString("en-IN")}</span></div>
                        <p className="text-[10px] text-muted-foreground bg-slate-50 rounded-lg px-3 py-2">
                          ⚠️ Toll shown is estimated. If actual toll differs, the final bill will be adjusted accordingly. Parking charges are paid at actuals. No other hidden fees.
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

                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-blue-800">Advance Payment (Now)</span>
                          <span className="text-lg font-bold text-blue-700">₹100</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-blue-600">
                          <span>Balance Payment (To driver at pickup)</span>
                          <span>₹{(totalPrice - 100).toLocaleString("en-IN")}</span>
                        </div>
                        <p className="text-[10px] text-blue-500">
                          ₹100 advance confirms your booking. 100% refundable on cancellation 24hrs before pickup.
                        </p>
                      </div>

                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2 text-sm text-amber-800">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>Driver details will be shared within 4 hours of booking confirmation.</span>
                      </div>

                      <div className="flex items-start gap-3">
                        <Checkbox id="terms" checked={agreeTerms} onCheckedChange={(v) => setAgreeTerms(v as boolean)} className="mt-0.5" />
                        <label htmlFor="terms" className="text-sm text-muted-foreground cursor-pointer">
                          I agree to the <span className="text-primary underline">Terms & Conditions</span> and <span className="text-primary underline">Cancellation Policy</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex justify-between mt-6 pt-4 border-t">
                    <Button variant="outline" onClick={handleBack} disabled={currentStep === 1} className="gap-2">
                      <ArrowLeft className="w-4 h-4" /> Back
                    </Button>
                    {currentStep < 3 ? (
                      <Button onClick={handleNext} className="bg-primary gap-2">
                        Continue <ArrowRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-primary gap-2">
                        {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</> : <>Pay ₹100 & Confirm Booking <Check className="w-4 h-4" /></>}
                      </Button>
                    )}
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
                        <div className="text-xs text-muted-foreground">{car.brand} · {car.seats} seats</div>
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
                       tripType === "multi_day" ? `${tripDays}-Day Total` : "One Way Total"}
                    </div>
                    <div className="text-2xl font-bold text-primary">₹{totalPrice.toLocaleString("en-IN")}</div>
                    <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                      <div>₹{pricePerKm}/km × {totalKmForTrip}km = ₹{basePrice.toLocaleString("en-IN")}</div>
                      <div>Driver: ₹{totalDriverCharges} · Toll: ₹{tollCharges}</div>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2"><Shield className="w-3 h-3 text-green-500" /> Verified professional driver</div>
                    <div className="flex items-center gap-2"><Clock className="w-3 h-3 text-green-500" /> Confirmation within 4 hours</div>
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
