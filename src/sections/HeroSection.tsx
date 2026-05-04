import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { MapPin, CalendarDays, Users, ArrowRight, MessageCircle, Shield, Clock, CheckCircle } from "lucide-react";

const popularCities = ["Delhi", "Manali", "Jaipur", "Agra", "Rishikesh", "Chandigarh", "Dehradun", "Shimla", "Haridwar"];

export default function HeroSection() {
  const [fromCity, setFromCity] = useState("Delhi");
  const [toCity, setToCity] = useState("Manali");
  const [pickupDate, setPickupDate] = useState<Date>();
  const [passengers, setPassengers] = useState("4");
  const [tripType, setTripType] = useState("one_way");
  const navigate = useNavigate();

  const handleSearch = () => {
    const params = new URLSearchParams({ from: fromCity, to: toCity, passengers, tripType });
    if (pickupDate) params.set("date", format(pickupDate, "yyyy-MM-dd"));
    navigate(`/cars?${params.toString()}`);
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src="/hero-bg.jpg" alt="Premium cab" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/75 to-slate-900/50" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center min-h-screen lg:py-28 py-32">

          {/* Left content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-medium text-white/90 uppercase tracking-wider">Delhi's Trusted Outstation Cab</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight font-['Playfair_Display']">
              Safe Journeys.<br />
              <span className="text-blue-300">Fixed Prices.</span><br />
              Every Time.
            </h1>

            <p className="text-lg text-slate-300 max-w-md leading-relaxed">
              Book verified cab drivers for Delhi outstation trips. Transparent pricing,
              no hidden charges, confirmed pickup — or your money back.
            </p>

            <div className="flex flex-wrap gap-5 text-sm text-slate-300">
              {[
                { icon: Shield, text: "Verified Drivers" },
                { icon: CheckCircle, text: "No Hidden Charges" },
                { icon: Clock, text: "On-Time Guarantee" },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-2">
                  <b.icon className="w-4 h-4 text-blue-400" />
                  {b.text}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={handleSearch}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-7 h-12 gap-2 shadow-lg shadow-blue-900/30 transition-all">
                See Available Cars
                <ArrowRight className="w-4 h-4" />
              </Button>
              <a href="https://wa.me/919958556011?text=Hi%2C%20I%20want%20to%20book%20a%20cab%20from%20Delhi" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline"
                  className="border-white/30 text-white hover:bg-white/10 h-12 px-6 gap-2 backdrop-blur-sm">
                  <MessageCircle className="w-4 h-4 text-green-400" />
                  WhatsApp Us
                </Button>
              </a>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-4 border-t border-white/10">
              {[
                { num: "15K+", label: "Happy Travelers" },
                { num: "4.9★", label: "Average Rating" },
                { num: "8+", label: "Premium Cars" },
              ].map((s, i) => (
                <div key={i}>
                  <div className="text-xl font-bold text-white font-['Playfair_Display']">{s.num}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Booking widget */}
          <div className="animate-scale-in">
            <div className="bg-white rounded-2xl shadow-2xl p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-['Playfair_Display']">Book Your Cab</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Get instant fare estimate</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-xs font-semibold text-green-700">
                  ₹0 Booking Fee
                </span>
              </div>

              <div className="space-y-4">
                {/* Trip type */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
                  {[
                    { value: "one_way", label: "One Way" },
                    { value: "round_trip", label: "Round Trip" },
                    { value: "multi_day", label: "Multi Day" },
                  ].map((type) => (
                    <button key={type.value} onClick={() => setTripType(type.value)}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                        tripType === type.value
                          ? "bg-white text-blue-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}>
                      {type.label}
                    </button>
                  ))}
                </div>

                {/* From / To */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "FROM", value: fromCity, setter: setFromCity },
                    { label: "TO", value: toCity, setter: setToCity },
                  ].map((field) => (
                    <div key={field.label} className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{field.label}</label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-600" />
                        <select value={field.value} onChange={(e) => field.setter(e.target.value)}
                          className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer">
                          {popularCities.map((city) => <option key={city} value={city}>{city}</option>)}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Date & Passengers */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">DATE</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm flex items-center gap-2 hover:border-blue-400 transition-colors text-left">
                          <CalendarDays className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className={pickupDate ? "text-slate-900" : "text-slate-400"}>
                            {pickupDate ? format(pickupDate, "dd MMM") : "Select date"}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 bg-white border-slate-200" align="start">
                        <Calendar mode="single" selected={pickupDate} onSelect={setPickupDate}
                          disabled={(date) => date < new Date()} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">PASSENGERS</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-600" />
                      <select value={passengers} onChange={(e) => setPassengers(e.target.value)}
                        className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer">
                        {[1,2,3,4,5,6,7,8].map((n) => <option key={n} value={n}>{n} {n === 1 ? "Person" : "People"}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <Button onClick={handleSearch}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm gap-2 shadow-sm transition-all">
                  See Available Cars & Fares
                  <ArrowRight className="w-4 h-4" />
                </Button>

                {/* Guarantees */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { icon: "🔒", text: "No Hidden Fees" },
                    { icon: "⏰", text: "On-Time Pickup" },
                    { icon: "✅", text: "Free Cancel 24hr" },
                  ].map((g, i) => (
                    <div key={i} className="text-center p-2 rounded-lg bg-slate-50">
                      <div className="text-sm mb-0.5">{g.icon}</div>
                      <div className="text-[10px] text-slate-500 leading-tight font-medium">{g.text}</div>
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
