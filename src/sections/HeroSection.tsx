import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { MapPin, CalendarDays, Users, ArrowRight, Mic, Search } from "lucide-react";

const popularCities = [
  "Delhi", "Manali", "Jaipur", "Agra", "Rishikesh", "Chandigarh", "Dehradun", "Shimla"
];

export default function HeroSection() {
  const [fromCity, setFromCity] = useState("Delhi");
  const [toCity, setToCity] = useState("Manali");
  const [pickupDate, setPickupDate] = useState<Date>();
  const [passengers, setPassengers] = useState("4");
  const [tripType, setTripType] = useState("one_way");
  const [isListening, setIsListening] = useState(false);
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

  const handleVoiceSearch = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice search is not supported in your browser.");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      // Parse simple voice commands like "from delhi to manali"
      const fromMatch = transcript.match(/from\s+(\w+)/);
      const toMatch = transcript.match(/to\s+(\w+)/);
      if (fromMatch) setFromCity(fromMatch[1].charAt(0).toUpperCase() + fromMatch[1].slice(1));
      if (toMatch) setToCity(toMatch[1].charAt(0).toUpperCase() + toMatch[1].slice(1));
    };
    recognition.start();
  };

  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="/hero-bg.jpg"
          alt="Mountain road"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-900/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-slide-up">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm text-white/90">24/7 Premium Car Rentals</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight font-['Playfair_Display']">
              Travel in Comfort,{" "}
              <span className="text-primary">Arrive in Style</span>
            </h1>
            
            <p className="text-lg text-white/80 max-w-lg leading-relaxed">
              Premium chauffeur-driven car rentals for your Delhi to Manali journey and beyond. 
              Professional drivers, transparent pricing, unforgettable experiences.
            </p>

            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                onClick={handleSearch}
                className="bg-primary hover:bg-primary/90 text-white gap-2 px-8 h-14 text-base"
              >
                Book Your Ride
                <ArrowRight className="w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/cars")}
                className="border-white/30 text-white hover:bg-white/10 gap-2 px-8 h-14 text-base"
              >
                Explore Fleet
              </Button>
            </div>

            {/* Stats */}
            <div className="flex gap-8 pt-4">
              <div>
                <div className="text-3xl font-bold text-white">8+</div>
                <div className="text-sm text-white/60">Premium Cars</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">15K+</div>
                <div className="text-sm text-white/60">Happy Travelers</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">4.9</div>
                <div className="text-sm text-white/60">Average Rating</div>
              </div>
            </div>
          </div>

          {/* Right - Search Card */}
          <div className="animate-scale-in">
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6 lg:p-8 border border-white/20">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-foreground">Find Your Ride</h3>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleVoiceSearch}
                  className={isListening ? "text-red-500" : "text-muted-foreground"}
                >
                  <Mic className="w-4 h-4 mr-1" />
                  {isListening ? "Listening..." : "Voice"}
                </Button>
              </div>

              <div className="space-y-4">
                {/* Trip Type */}
                <div className="grid grid-cols-3 gap-2 p-1 bg-muted rounded-xl">
                  {[
                    { value: "one_way", label: "One Way" },
                    { value: "round_trip", label: "Round Trip" },
                    { value: "multi_day", label: "Multi Day" },
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setTripType(type.value)}
                      className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                        tripType === type.value
                          ? "bg-white text-primary shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>

                {/* From - To */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      From
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <select
                        value={fromCity}
                        onChange={(e) => setFromCity(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none"
                      >
                        {popularCities.map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      To
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <select
                        value={toCity}
                        onChange={(e) => setToCity(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none"
                      >
                        {popularCities.map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Date & Passengers */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm flex items-center gap-2 hover:border-primary transition-colors">
                          <CalendarDays className="w-4 h-4 text-muted-foreground" />
                          <span className={pickupDate ? "text-foreground" : "text-muted-foreground"}>
                            {pickupDate ? format(pickupDate, "dd MMM yyyy") : "Select date"}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={pickupDate}
                          onSelect={setPickupDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Passengers
                    </label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <select
                        value={passengers}
                        onChange={(e) => setPassengers(e.target.value)}
                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-input bg-background text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none appearance-none"
                      >
                        {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                          <option key={n} value={n}>{n} Passengers</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSearch}
                  className="w-full h-12 bg-primary hover:bg-primary/90 text-white gap-2 text-base font-medium"
                >
                  <Search className="w-5 h-5" />
                  Search Available Cars
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
