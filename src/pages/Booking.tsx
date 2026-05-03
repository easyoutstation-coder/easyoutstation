import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import {
  User,
  CreditCard,
  Check,
  ArrowRight,
  ArrowLeft,
  MapPin,
  CalendarDays,
  Mail,
  Users,
  Shield,
  Clock,
  Route,
} from "lucide-react";

const steps = [
  { id: 1, label: "Trip Details", icon: MapPin },
  { id: 2, label: "Personal Info", icon: User },
  { id: 3, label: "Review & Pay", icon: CreditCard },
];

export default function BookingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [bookingId, setBookingId] = useState<number | null>(null);

  // Form state
  const [tripType, setTripType] = useState("one_way");
  const [pickupDate, setPickupDate] = useState<Date>();
  const [pickupTime, setPickupTime] = useState("08:00");
  const [returnDate, setReturnDate] = useState<Date>();
  const [passengerCount, setPassengerCount] = useState("4");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupPincode, setPickupPincode] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpError, setOtpError] = useState("");

  const carId = parseInt(searchParams.get("carId") || "0");
  const fromCity = searchParams.get("from") || "Delhi";
  const toCity = searchParams.get("to") || "Manali";
  const distance = parseInt(searchParams.get("distance") || "540");

  const { data: car } = trpc.car.getById.useQuery(
    { id: carId },
    { enabled: carId > 0 }
  );

  const createBooking = trpc.booking.create.useMutation({
    onSuccess: (data) => {
      setBookingId(data.bookingId);
      setBookingComplete(true);
      setIsSubmitting(false);
    },
    onError: () => {
      setIsSubmitting(false);
      alert("Booking failed. Please try again or email us at easyoutstation@gmail.com.");
    },
  });

  const pricePerKm = parseFloat(car?.pricePerKm || "20");
  const driverCharges = parseFloat(car?.driverCharges || "400");
  const basePrice = pricePerKm * distance;
  const totalPrice = basePrice + driverCharges;

  const sendOtp = () => {
    if (!customerPhone || customerPhone.length < 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    setOtp(generatedOtp);
    setOtpSent(true);
    setOtpError("");
    // In production this would send via SMS. For now show in alert for testing.
    alert(`Your OTP is: ${generatedOtp}\n\n(In production this will be sent via SMS)`);
  };

  const verifyOtp = () => {
    if (otpInput === otp) {
      setOtpVerified(true);
      setOtpError("");
    } else {
      setOtpError("Invalid OTP. Please try again.");
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (!pickupDate) { alert("Please select a pickup date."); return; }
      if (!pickupAddress.trim()) { alert("Please enter your pickup address."); return; }
      if (!pickupPincode.trim() || pickupPincode.length < 6) { alert("Please enter a valid 6-digit pincode."); return; }
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

  const handleSubmit = () => {
    if (!agreeTerms) {
      alert("Please agree to the terms and conditions");
      return;
    }
    setIsSubmitting(true);
    createBooking.mutate({
      carId,
      fromCity,
      toCity,
      pickupDate: pickupDate ? format(pickupDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      returnDate: returnDate ? format(returnDate, "yyyy-MM-dd") : undefined,
      tripType: tripType as "one_way" | "round_trip" | "multi_day",
      passengerCount: parseInt(passengerCount),
      totalKm: distance,
      totalPrice,
      customerName,
      customerPhone,
      customerEmail,
      pickupAddress: `${pickupAddress}, Pincode: ${pickupPincode}, Pickup Time: ${pickupTime}`,
      specialRequests: specialRequests || undefined,
    });
  };

  if (bookingComplete) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="pt-20">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-16">
            <Card className="text-center p-8">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Booking Confirmed!</h1>
              <p className="text-muted-foreground mb-6">
                Your booking has been received. Our team will contact you shortly to confirm the details.
              </p>
              <div className="bg-muted rounded-xl p-4 mb-6 text-left">
                <p className="text-sm"><strong>Booking ID:</strong> #{bookingId}</p>
                <p className="text-sm"><strong>Car:</strong> {car?.name || "Toyota Innova Crysta"}</p>
                <p className="text-sm"><strong>Route:</strong> {fromCity} to {toCity}</p>
                <p className="text-sm"><strong>Amount:</strong> ₹{totalPrice.toLocaleString()}</p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => navigate("/")} className="bg-primary hover:bg-primary/90">
                  Back to Home
                </Button>
                <Button variant="outline" onClick={() => navigate("/dashboard")}>
                  View My Bookings
                </Button>
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
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground font-['Playfair_Display']">
              Book Your Ride
            </h1>
            <p className="text-muted-foreground mt-1">
              Complete your booking in 3 simple steps
            </p>
          </div>

          {/* Stepper */}
          <div className="flex items-center justify-between mb-8">
            {steps.map((step, i) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      currentStep >= step.id
                        ? "bg-primary text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={`text-xs mt-2 font-medium ${
                      currentStep >= step.id ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 ${
                      currentStep > step.id ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Form */}
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-semibold">Trip Details</h2>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>From</Label>
                          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-input bg-muted">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span className="font-medium">{fromCity}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>To</Label>
                          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-input bg-muted">
                            <MapPin className="w-4 h-4 text-primary" />
                            <span className="font-medium">{toCity}</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Trip Type</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {["one_way", "round_trip", "multi_day"].map((type) => (
                            <button
                              key={type}
                              onClick={() => setTripType(type)}
                              className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                                tripType === type
                                  ? "bg-primary text-white border-primary"
                                  : "bg-white text-foreground border-input hover:border-primary"
                              }`}
                            >
                              {type === "one_way" ? "One Way" : type === "round_trip" ? "Round Trip" : "Multi Day"}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Pickup Date</Label>
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
                        {tripType !== "one_way" && (
                          <div className="space-y-2">
                            <Label>Return Date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <button className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-input bg-white text-sm hover:border-primary transition-colors">
                                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                                  <span>{returnDate ? format(returnDate, "dd MMM yyyy") : "Select date"}</span>
                                </button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar mode="single" selected={returnDate} onSelect={setReturnDate} disabled={(d) => d < (pickupDate || new Date())} />
                              </PopoverContent>
                            </Popover>
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Passengers</Label>
                          <select
                            value={passengerCount}
                            onChange={(e) => setPassengerCount(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-xl border border-input bg-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                          >
                            {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                              <option key={n} value={n}>{n} Passengers</option>
                            ))}
                          </select>
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

                      <div className="space-y-2">
                        <Label>Pickup Address * <span className="text-xs text-muted-foreground">(House/Flat No, Street, Area)</span></Label>
                        <Input
                          value={pickupAddress}
                          onChange={(e) => setPickupAddress(e.target.value)}
                          placeholder="e.g. 42, Sector 15, Rohini"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Pickup Pincode *</Label>
                        <Input
                          value={pickupPincode}
                          onChange={(e) => setPickupPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                          placeholder="6-digit pincode"
                          maxLength={6}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Special Requests</Label>
                        <textarea
                          value={specialRequests}
                          onChange={(e) => setSpecialRequests(e.target.value)}
                          placeholder="Any special requirements..."
                          className="w-full px-3 py-2.5 rounded-xl border border-input bg-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none min-h-[80px] resize-none"
                        />
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-semibold">Personal Information</h2>

                      <div className="space-y-2">
                        <Label>Full Name *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Enter your full name"
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Mobile Number * <span className="text-xs text-muted-foreground">(for driver coordination)</span></Label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+91</span>
                            <Input
                              value={customerPhone}
                              onChange={(e) => {
                                setCustomerPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                                setOtpVerified(false);
                                setOtpSent(false);
                              }}
                              placeholder="10-digit mobile number"
                              className="pl-12"
                              disabled={otpVerified}
                            />
                          </div>
                          {!otpVerified && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={sendOtp}
                              className="shrink-0"
                            >
                              {otpSent ? "Resend OTP" : "Send OTP"}
                            </Button>
                          )}
                          {otpVerified && (
                            <span className="flex items-center gap-1 text-green-600 text-sm font-medium shrink-0">
                              <Check className="w-4 h-4" /> Verified
                            </span>
                          )}
                        </div>

                        {otpSent && !otpVerified && (
                          <div className="flex gap-2 mt-2">
                            <Input
                              value={otpInput}
                              onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                              placeholder="Enter 6-digit OTP"
                              maxLength={6}
                            />
                            <Button type="button" onClick={verifyOtp} className="shrink-0">
                              Verify
                            </Button>
                          </div>
                        )}
                        {otpError && <p className="text-sm text-red-500">{otpError}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label>Email Address * <span className="text-xs text-muted-foreground">(booking confirmation will be sent here)</span></Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="email"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            placeholder="your@email.com"
                            className="pl-10"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <h2 className="text-xl font-semibold">Review & Confirm</h2>

                      <div className="bg-muted rounded-xl p-4 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Car</span>
                          <span className="font-medium">{car?.name || "Toyota Innova Crysta"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Route</span>
                          <span className="font-medium">{fromCity} → {toCity}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Distance</span>
                          <span className="font-medium">{distance} km</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Pickup Date</span>
                          <span className="font-medium">{pickupDate ? format(pickupDate, "dd MMM yyyy") : "Not selected"}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Passengers</span>
                          <span className="font-medium">{passengerCount}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Base Price ({distance} km × ₹{pricePerKm})</span>
                          <span>₹{basePrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Driver Charges</span>
                          <span>₹{driverCharges}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between text-base font-bold">
                          <span>Total Amount</span>
                          <span className="text-primary">₹{totalPrice.toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Checkbox
                          id="terms"
                          checked={agreeTerms}
                          onCheckedChange={(c) => setAgreeTerms(c as boolean)}
                        />
                        <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                          I agree to the terms and conditions. I understand that toll tax, parking, and state permits are extra. 
                          Free cancellation up to 24 hours before pickup.
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex gap-3 mt-8">
                    {currentStep > 1 && (
                      <Button variant="outline" onClick={handleBack} className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back
                      </Button>
                    )}
                    <div className="flex-1" />
                    {currentStep < 3 ? (
                      <Button onClick={handleNext} className="bg-primary hover:bg-primary/90 gap-2">
                        Continue
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-primary hover:bg-primary/90 gap-2"
                      >
                        {isSubmitting ? "Processing..." : "Confirm Booking"}
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted">
                      <img
                        src={car?.imageUrl || "/cars/toyota-innova-crysta.jpg"}
                        alt={car?.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold">{car?.name || "Toyota Innova Crysta"}</h3>
                      <p className="text-xs text-muted-foreground">{car?.brand || "Toyota"}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Route className="w-4 h-4" />
                      {fromCity} to {toCity}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      ~12 hours journey
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {car?.seats || 6} seats
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Shield className="w-4 h-4" />
                      Professional driver included
                    </div>
                  </div>

                  <Separator />

                  <div className="bg-slate-900 rounded-xl p-4 text-white">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-slate-400">Estimated Total</span>
                      <span className="text-2xl font-bold text-primary">₹{totalPrice.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {distance} km × ₹{pricePerKm} + ₹{driverCharges} driver
                    </p>
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
