import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { MapPin, CalendarDays, Users, ArrowRight, MessageCircle, Shield, Clock, CheckCircle } from "lucide-react";

const popularCities = ["Delhi", "Manali", "Jaipur", "Agra", "Rishikesh", "Chandigarh", "Dehradun", "Shimla", "Haridwar"];

const trustBadges = [
  { icon: Shield, text: "Verified Drivers" },
  { icon: CheckCircle, text: "Zero Hidden Charges" },
  { icon: Clock, text: "On-Time Guarantee" },
];

export default function HeroSection() {
  const [fromCity, setFromCity] = useState("Delhi");
  const [toCity, setToCity] = useState("Manali");
  const [pickupDate, setPickupDate] = useState<Date>();
  const [passengers, setPassengers] = useState("4");
  const [tripType, setTripType] = useState("one_way");
  const navigate = useNavigate();

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (fromCity) params.set("from", fromCity);
    if (toCity) params.set("to", toCity);
    if (pickupDate) params.set("date", format(pickupDate, "yyyy-MM-dd"));
    if (passengers) params.set("passengers", passengers);
    if (tripType) params.set("tripType", tripType);
    navigate(`/cars?${params.toString()}`);
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#0B0B0B]">
      {/* Background */}
      <div className="absolute inset-0">
        <img src="/hero-bg.jpg" alt="Premium cab" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0B] via-[#0B0B0B]/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B] via-transparent to-[#0B0B0B]/40" />
      </div>

      {/* Gold accent line top */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full py-32 lg:py-0">
        <div className="grid lg:grid-cols-2 gap-16 items-center min-h-screen lg:py-28">

          {/* Left */}
          <div className="space-y-8 animate-slide-up">
            {/* Label */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-widest text-[#D4AF37]">Delhi's Most Trusted Outstation Cab</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] font-['Playfair_Display']">
              Premium Cabs.{" "}
              <span className="text-[#D4AF37]">Verified Drivers.</span>{" "}
              <span className="block mt-2">Fixed Prices.</span>
            </h1>

            {/* Sub */}
            <p className="text-lg text-[#BFBFBF] max-w-lg leading-relaxed">
              Book outstation cab from Delhi in 30 seconds. No hidden charges, no surge pricing.
              Professional drivers for Manali, Dehradun, Rishikesh & more.
            </p>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-4">
              {trustBadges.map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-[#BFBFBF]">
                  <b.icon className="w-4 h-4 text-[#D4AF37]" />
                  {b.text}
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={handleSearch}
                className="bg-[#D4AF37] hover:bg-[#E8CA5A] text-[#0B0B0B] font-bold px-8 h-14 text-base gap-2 shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:shadow-[0_6px_25px_rgba(212,175,55,0.45)] transition-all">
                Get Instant Fare
                <ArrowRight className="w-5 h-5" />
              </Button>
              <a href="https://wa.me/917011911252?text=Hi%2C%20I%20want%20to%20book%20a%20cab%20from%20Delhi" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline"
                  className="border-[#25D366]/50 text-[#25D366] hover:bg-[#25D366]/10 h-14 px-6 gap-2 text-base transition-all">
                  <MessageCircle className="w-5 h-5" />
                  Book on WhatsApp
                </Button>
              </a>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-2 border-t border-[#2A2A2A]">
              {[
                { num: "8+", label: "Premium Cars" },
                { num: "15K+", label: "Happy Travelers" },
                { num: "4.9★", label: "Average Rating" },
                { num: "2015", label: "Est. Since" },
              ].map((s, i) => (
                <div key={i} className="pt-4">
                  <div className="text-2xl font-bold text-[#D4AF37] font-['Playfair_Display']">{s.num}</div>
                  <div className="text-xs text-[#737373] mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Booking Card */}
          <div className="animate-scale-in">
            <div className="bg-[#1C1C1C] rounded-2xl border border-[#2A2A2A] shadow-2xl p-6 lg:p-8">
              {/* Card Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-white font-['Playfair_Display']">Book Your Cab</h3>
                  <p className="text-xs text-[#737373] mt-0.5">Instant fare • No hidden charges</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                  <span className="text-xs font-semibold text-[#D4AF37]">₹0 Booking Fee</span>
                </div>
              </div>

              <div className="space-y-4">
                {/* Trip Type */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0B0B0B] rounded-xl">
                  {[
                    { value: "one_way", label: "One Way" },
                    { value: "round_trip", label: "Round Trip" },
                    { value: "multi_day", label: "Multi Day" },
                  ].map((type) => (
                    <button key={type.value} onClick={() => setTripType(type.value)}
                      className={`py-2.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                        tripType === type.value
                          ? "bg-[#D4AF37] text-[#0B0B0B] shadow-sm"
                          : "text-[#737373] hover:text-white"
                      }`}>
                      {type.label}
                    </button>
                  ))}
                </div>

                {/* From - To */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "FROM", value: fromCity, setter: setFromCity },
                    { label: "TO", value: toCity, setter: setToCity },
                  ].map((field) => (
                    <div key={field.label} className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">{field.label}</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D4AF37]" />
                        <select value={field.value} onChange={(e) => field.setter(e.target.value)}
                          className="w-full h-11 pl-9 pr-3 rounded-xl border border-[#2A2A2A] bg-[#0B0B0B] text-white text-sm focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37] outline-none appearance-none cursor-pointer">
                          {popularCities.map((city) => <option key={city} value={city}>{city}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Date & Passengers */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">DATE</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full h-11 px-3 rounded-xl border border-[#2A2A2A] bg-[#0B0B0B] text-sm flex items-center gap-2 hover:border-[#D4AF37] transition-colors">
                          <CalendarDays className="w-3.5 h-3.5 text-[#D4AF37]" />
                          <span className={pickupDate ? "text-white" : "text-[#737373]"}>
                            {pickupDate ? format(pickupDate, "dd MMM") : "Pick date"}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-[#1C1C1C] border-[#2A2A2A]" align="start">
                        <Calendar mode="single" selected={pickupDate} onSelect={setPickupDate}
                          disabled={(date) => date < new Date()} initialFocus
                          className="text-white" />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[#737373]">PASSENGERS</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#D4AF37]" />
                      <select value={passengers} onChange={(e) => setPassengers(e.target.value)}
                        className="w-full h-11 pl-9 pr-3 rounded-xl border border-[#2A2A2A] bg-[#0B0B0B] text-white text-sm focus:ring-1 focus:ring-[#D4AF37] outline-none appearance-none cursor-pointer">
                        {[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>{n} {n === 1 ? "Person" : "People"}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSearch}
                  className="w-full h-13 bg-[#D4AF37] hover:bg-[#E8CA5A] text-[#0B0B0B] font-bold text-base gap-2 shadow-[0_4px_15px_rgba(212,175,55,0.25)] hover:shadow-[0_6px_20px_rgba(212,175,55,0.4)] transition-all py-3.5">
                  See Available Cars & Fares
                  <ArrowRight className="w-5 h-5" />
                </Button>

                {/* Guarantees */}
                <div className="grid grid-cols-3 gap-2 pt-2">
                  {[
                    { icon: "🔒", text: "No Hidden Fees" },
                    { icon: "⏰", text: "On-Time Pickup" },
                    { icon: "✅", text: "Free Cancel 24hr" },
                  ].map((g, i) => (
                    <div key={i} className="text-center">
                      <div className="text-base mb-0.5">{g.icon}</div>
                      <div className="text-[10px] text-[#737373] leading-tight">{g.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
