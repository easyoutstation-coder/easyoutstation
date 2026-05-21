import { useSeo } from "@/hooks/useSeo";
import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AIChatbot from "@/components/AIChatbot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  SlidersHorizontal,
  Star,
  Users,
  Fuel,
  Gauge,
  ArrowRight,
  X,
  Check,
  Mic,
  Sparkles,
  MapPin,
} from "lucide-react";

const categories = [
  { value: "all", label: "All Categories" },
  { value: "sedan", label: "Sedan" },
  { value: "muv", label: "MUV" },
  { value: "suv", label: "SUV" },
  { value: "premium", label: "Premium" },
  { value: "luxury", label: "Luxury" },
  { value: "tempo", label: "Tempo Traveller" },
  { value: "bus", label: "Bus" },
  { value: "electric", label: "Electric" },
];

const fuelTypes = [
  { value: "all", label: "All Fuel Types" },
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "hybrid", label: "Hybrid" },
  { value: "electric", label: "Electric" },
];

const transmissions = [
  { value: "all", label: "All Transmissions" },
  { value: "manual", label: "Manual" },
  { value: "automatic", label: "Automatic" },
];

export default function CarsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const _fromCity = searchParams.get("from") || "Delhi";
  const _toCity = searchParams.get("to") || "";
  useSeo({
    title: _toCity
      ? `${_fromCity} to ${_toCity} Cab — Choose Your Car | EasyOutstation`
      : "Book Outstation Cabs from Delhi — Premium Cars | EasyOutstation",
    description: _toCity
      ? `Compare cabs for ${_fromCity} to ${_toCity}. Fixed fares, verified drivers, AC cars. Sedan, SUV & Innova available.`
      : "Choose from premium outstation cabs from Delhi. Swift Dzire, Innova Crysta, Ertiga and more. Fixed fares, no hidden charges.",
    canonical: "https://www.easyoutstation.com/cars",
    noindex: !!_toCity,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<"price_asc" | "price_desc" | "rating" | "popular">("price_asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [fuelType, setFuelType] = useState("all");
  const [transmission, setTransmission] = useState("all");
  const MAX_PRICE_KM = 70;
  const [priceRange, setPriceRange] = useState([0, MAX_PRICE_KM]);
  const [seats, setSeats] = useState("all");
  const [isListening, setIsListening] = useState(false);

  const { data: cars, isLoading } = trpc.car.list.useQuery({
    category: category === "all" ? undefined : category,
    fuelType: fuelType === "all" ? undefined : fuelType,
    transmission: transmission === "all" ? undefined : transmission,
    minPrice: priceRange[0] || undefined,
    maxPrice: priceRange[1] >= MAX_PRICE_KM ? undefined : priceRange[1],
    seats: seats === "all" ? undefined : parseInt(seats),
    search: searchQuery || undefined,
  }, { staleTime: 2 * 60 * 1000 });

  const { data: discountConfig } = trpc.admin.getDiscount.useQuery();
  const applyDiscount = (fare: number): number => {
    if (!discountConfig?.enabled) return fare;
    const raw = discountConfig.type === "percentage"
      ? (fare * discountConfig.value) / 100
      : discountConfig.value;
    const saving = discountConfig.maxDiscount ? Math.min(raw, discountConfig.maxDiscount) : raw;
    return Math.round(fare - saving);
  };
  const discountAmount = (fare: number): number => fare - applyDiscount(fare);

  const fromCity = searchParams.get("from") || "";
  const toCity = searchParams.get("to") || "";
  const distanceKm = parseInt(searchParams.get("distance") || "0");
  const DRIVER_CHARGE = 250;

  const tripTypeParam = searchParams.get("tripType") || "one_way";
  const dateParam = searchParams.get("date") || "";
  const returnDateParam = searchParams.get("returnDate") || "";

  const tripDays = (() => {
    if (tripTypeParam === "round_trip" && dateParam && returnDateParam) {
      const d1 = new Date(dateParam);
      const d2 = new Date(returnDateParam);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        return Math.max(1, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
      }
    }
    return 1; // one_way or same-day round trip
  })();
  const kmMultiplier = tripTypeParam === "round_trip" ? 2 : 1;
  const effectiveKm = distanceKm * kmMultiplier;

  // Build passthrough params to preserve user's selections across pages
  const passthroughParams = () => {
    const p = new URLSearchParams();
    if (fromCity) p.set("from", fromCity);
    if (toCity) p.set("to", toCity);
    if (distanceKm) p.set("distance", distanceKm.toString());
    const fromFull = searchParams.get("fromFull");
    const toFull = searchParams.get("toFull");
    const fromPincode = searchParams.get("fromPincode");
    const toPincode = searchParams.get("toPincode");
    if (fromFull) p.set("fromFull", fromFull);
    if (toFull) p.set("toFull", toFull);
    if (dateParam) p.set("date", dateParam);
    if (returnDateParam) p.set("returnDate", returnDateParam);
    if (tripTypeParam) p.set("tripType", tripTypeParam);
    const timeParam = searchParams.get("time");
    if (timeParam) p.set("time", timeParam);
    if (fromPincode) p.set("fromPincode", fromPincode);
    if (toPincode) p.set("toPincode", toPincode);
    return p.toString();
  };

  const recommendations: { carId: number; reason: string; confidence: number }[] = [];

  const calcFare = (pricePerKm: string, seats: number, driverCharges: string) => {
    if (!distanceKm) return null;
    const isHeavy = seats > 7;
    let billedKm = effectiveKm;
    if (tripDays > 1) billedKm = Math.max(effectiveKm, tripDays * 250);
    else if (isHeavy) billedKm = Math.max(effectiveKm, 100);
    return Math.round(parseFloat(pricePerKm) * billedKm + parseFloat(driverCharges || "250") * tripDays);
  };

  const billedKmFor = (seats: number) => {
    if (!distanceKm) return effectiveKm;
    const isHeavy = seats > 7;
    if (tripDays > 1) return Math.max(effectiveKm, tripDays * 250);
    if (isHeavy) return Math.max(effectiveKm, 100);
    return effectiveKm;
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
      const transcript = event.results[0][0].transcript;
      setSearchQuery(transcript);
    };
    recognition.start();
  };

  const clearFilters = () => {
    setCategory("all");
    setFuelType("all");
    setTransmission("all");
    setPriceRange([0, MAX_PRICE_KM]);
    setSeats("all");
    setSearchQuery("");
  };

  const hasActiveFilters =
    category !== "all" ||
    fuelType !== "all" ||
    transmission !== "all" ||
    priceRange[0] !== 0 ||
    priceRange[1] !== MAX_PRICE_KM ||
    seats !== "all" ||
    searchQuery;

  const fallbackCars = [
    { id: 1, name: "Swift Dzire", brand: "Maruti Suzuki", category: "sedan", seats: 4, pricePerKm: "12.00", rating: "4.50", reviewCount: 128, imageUrl: "/cars/swift-dzire.jpg", isAvailable: true, description: "Budget-friendly sedan ideal for couples and small families", fuelType: "diesel", transmission: "manual" },
    { id: 2, name: "Toyota Etios", brand: "Toyota", category: "sedan", seats: 4, pricePerKm: "13.00", rating: "4.60", reviewCount: 96, imageUrl: "/cars/toyota-etios.jpg", isAvailable: true, description: "Reliable sedan with Toyota's legendary durability", fuelType: "diesel", transmission: "manual" },
    { id: 3, name: "Mahindra Xylo", brand: "Mahindra", category: "suv", seats: 6, pricePerKm: "16.00", rating: "4.40", reviewCount: 74, imageUrl: "/cars/mahindra-xylo.jpg", isAvailable: true, description: "Rugged SUV with ample space for 6 passengers", fuelType: "diesel", transmission: "manual" },
    { id: 4, name: "Maruti Ertiga", brand: "Maruti Suzuki", category: "muv", seats: 6, pricePerKm: "15.00", rating: "4.70", reviewCount: 215, imageUrl: "/cars/maruti-ertiga.jpg", isAvailable: true, description: "Spacious MUV perfect for family trips", fuelType: "petrol", transmission: "manual" },
    { id: 5, name: "Toyota Innova", brand: "Toyota", category: "muv", seats: 6, pricePerKm: "19.00", rating: "4.80", reviewCount: 342, imageUrl: "/cars/toyota-innova.jpg", isAvailable: true, description: "The iconic Indian family vehicle", fuelType: "diesel", transmission: "manual" },
    { id: 6, name: "Toyota Innova Crysta", brand: "Toyota", category: "premium", seats: 6, pricePerKm: "20.00", rating: "4.90", reviewCount: 456, imageUrl: "/cars/toyota-innova-crysta.jpg", isAvailable: true, description: "Premium MPV with luxurious interiors", fuelType: "diesel", transmission: "automatic" },
    { id: 7, name: "Kia Carens", brand: "Kia", category: "premium", seats: 6, pricePerKm: "17.00", rating: "4.75", reviewCount: 89, imageUrl: "/cars/kia-carens.jpg", isAvailable: true, description: "Modern premium MPV with advanced features", fuelType: "petrol", transmission: "automatic" },
    { id: 8, name: "Toyota Innova Hycross", brand: "Toyota", category: "luxury", seats: 6, pricePerKm: "22.00", rating: "4.95", reviewCount: 67, imageUrl: "/cars/toyota-innova-hycross.jpg", isAvailable: true, description: "Flagship luxury hybrid MPV", fuelType: "hybrid", transmission: "automatic" },
    { id: 9, name: "Tempo Traveller Maharaja (12 Seater)", brand: "Force Motors", category: "tempo", seats: 12, pricePerKm: "28.00", driverCharges: "500.00", rating: "4.70", reviewCount: 45, imageUrl: "/cars/tempo-traveller-maharaja.jpg", isAvailable: true, description: "Luxury 1x1 Maharaja recliner seats. Perfect for group outstation travel. Toll, parking & state taxes charged at actuals.", fuelType: "diesel", transmission: "manual" },
    { id: 10, name: "Tempo Traveller (16-19 Seater)", brand: "Force Motors", category: "tempo", seats: 19, pricePerKm: "30.00", driverCharges: "500.00", rating: "4.65", reviewCount: 38, imageUrl: "/cars/tempo-traveller-pushback.jpg", isAvailable: true, description: "Seats up to 19 passengers with 2x1 pushback recliner seats. Toll, parking & state taxes charged at actuals.", fuelType: "diesel", transmission: "manual" },
    { id: 11, name: "Force Urbania", brand: "Force Motors", category: "tempo", seats: 17, pricePerKm: "35.00", driverCharges: "500.00", rating: "4.80", reviewCount: 29, imageUrl: "/cars/force-urbania.jpg", isAvailable: true, description: "Premium Force Urbania luxury van with plush seating. Toll, parking & state taxes charged at actuals.", fuelType: "diesel", transmission: "manual" },
    { id: 12, name: "Mini Luxury Bus (27 Seater)", brand: "Eicher / Tata / Bharat Benz", category: "bus", seats: 27, pricePerKm: "45.00", driverCharges: "500.00", rating: "4.60", reviewCount: 22, imageUrl: "/cars/mini-bus-27.jpg", isAvailable: true, description: "AC 27-seater luxury mini bus. Brand assigned on availability. Toll, parking & state taxes charged at actuals.", fuelType: "diesel", transmission: "manual" },
    { id: 13, name: "Luxury Bus (35-41 Seater)", brand: "Eicher / Tata / Bharat Benz", category: "bus", seats: 41, pricePerKm: "50.00", driverCharges: "500.00", rating: "4.62", reviewCount: 18, imageUrl: "/cars/luxury-bus-35.jpg", isAvailable: true, description: "AC 35 to 41-seater luxury bus. Brand assigned on availability. Toll, parking & state taxes charged at actuals.", fuelType: "diesel", transmission: "manual" },
    { id: 14, name: "Luxury Bus (45 Seater)", brand: "Eicher / Tata / Bharat Benz", category: "bus", seats: 45, pricePerKm: "55.00", driverCharges: "500.00", rating: "4.58", reviewCount: 15, imageUrl: "/cars/luxury-bus-45.jpg", isAvailable: true, description: "AC 45-seater luxury bus. Brand assigned on availability. Toll, parking & state taxes charged at actuals.", fuelType: "diesel", transmission: "manual" },
    { id: 15, name: "Luxury Bus (49 Seater)", brand: "Eicher / Tata / Bharat Benz", category: "bus", seats: 49, pricePerKm: "60.00", driverCharges: "500.00", rating: "4.55", reviewCount: 12, imageUrl: "/cars/luxury-bus-49.jpg", isAvailable: true, description: "AC 49-seater luxury bus. Brand assigned on availability. Toll, parking & state taxes charged at actuals.", fuelType: "diesel", transmission: "manual" },
    { id: 16, name: "BYD eMax 7", brand: "BYD", category: "electric", seats: 7, pricePerKm: "15.00", rating: "4.75", reviewCount: 18, imageUrl: "/cars/byd-emax7.jpg", isAvailable: true, description: "Zero-emission 7-seater electric MPV. As per availability. Toll, parking & state taxes charged at actuals.", fuelType: "electric", transmission: "automatic" },
    { id: 17, name: "BYD Atto 3", brand: "BYD", category: "electric", seats: 5, pricePerKm: "15.00", rating: "4.70", reviewCount: 14, imageUrl: "/cars/byd-atto3.jpg", isAvailable: true, description: "Zero-emission electric SUV with premium interiors. As per availability. Toll, parking & state taxes charged at actuals.", fuelType: "electric", transmission: "automatic" },
  ];

  const displayCars = (cars ?? fallbackCars)
    .slice()
    .sort((a, b) => {
      if (sortBy === "price_asc") return parseFloat(a.pricePerKm) - parseFloat(b.pricePerKm);
      if (sortBy === "price_desc") return parseFloat(b.pricePerKm) - parseFloat(a.pricePerKm);
      if (sortBy === "rating") return parseFloat(b.rating ?? "0") - parseFloat(a.rating ?? "0");
      if (sortBy === "popular") return (b.reviewCount || 0) - (a.reviewCount || 0);
      return 0;
    });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="pt-20">
        {/* Header */}
        <div className="bg-white border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
            {/* Route banner when coming from search */}
            {fromCity && toCity && distanceKm > 0 && (
              <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-3 text-blue-800">
                  <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="font-semibold">{fromCity} → {toCity}</span>
                  <span className="text-sm text-blue-500">· {distanceKm} km</span>
                </div>
                <div className="text-sm text-blue-700 font-medium">
                  {(() => {
                    const minBilledKm = tripDays > 1 ? Math.max(effectiveKm, tripDays * 250) : effectiveKm;
                    const minApplies = minBilledKm > effectiveKm;
                    return (
                      <>
                        Fares from{" "}
                        <span className="font-bold">₹{(minBilledKm * 12 + DRIVER_CHARGE * tripDays).toLocaleString("en-IN")}</span>
                        {" "}to{" "}
                        <span className="font-bold">₹{(minBilledKm * 22 + DRIVER_CHARGE * tripDays).toLocaleString("en-IN")}</span>
                        {tripDays > 1
                          ? <span className="text-blue-500 text-xs ml-1">({tripDays} days · {minBilledKm} km min{minApplies ? " applies" : ""})</span>
                          : " depending on car"}
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 font-['DM_Serif_Display']">
                  {fromCity && toCity ? `Cars for ${fromCity} → ${toCity}` : "Our Fleet"}
                </h1>
                <p className="text-slate-500 mt-1">
                  {displayCars.length} vehicles available{distanceKm > 0 ? ` · Prices for ${tripDays > 1 ? `${tripDays} days, min ${Math.max(effectiveKm, tripDays * 250)} km` : `${effectiveKm} km`}` : " for your journey"}
                </p>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1 md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search cars..."
                    className="pl-10 pr-10"
                  />
                  <button
                    onClick={handleVoiceSearch}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${isListening ? "text-red-500" : "text-muted-foreground"}`}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  className={showFilters ? "bg-primary text-white border-primary" : ""}
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <span className="ml-2 w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </Button>

                {/* Sort dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="h-10 px-3 rounded-lg border border-input bg-white text-sm text-slate-700 cursor-pointer hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="price_asc">💰 Price: Low to High</option>
                  <option value="price_desc">💰 Price: High to Low</option>
                  <option value="rating">⭐ Top Rated</option>
                  <option value="popular">🔥 Most Popular</option>
                </select>
              </div>
            </div>

            {/* AI Recommendations */}
            {recommendations && recommendations.length > 0 && (
              <div className="mt-4 p-4 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex items-center gap-2 text-primary font-medium text-sm mb-2">
                  <Sparkles className="w-4 h-4" />
                  AI Recommended for Your Trip
                </div>
                <div className="flex flex-wrap gap-2">
                  {recommendations.map((rec) => {
                    const car = displayCars.find((c) => c.id === rec.carId);
                    if (!car) return null;
                    return (
                      <button
                        key={rec.carId}
                        onClick={() => navigate(`/cars/${rec.carId}?${passthroughParams()}`)}
                        className="px-3 py-1.5 bg-white rounded-full text-sm border border-primary/30 hover:bg-primary hover:text-white transition-colors"
                      >
                        {car.name} - {rec.reason}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-6 p-6 bg-slate-50 rounded-xl border border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">
                      Category
                    </label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">
                      Fuel Type
                    </label>
                    <Select value={fuelType} onValueChange={setFuelType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fuelTypes.map((f) => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">
                      Transmission
                    </label>
                    <Select value={transmission} onValueChange={setTransmission}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {transmissions.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">
                      Min Seats
                    </label>
                    <Select value={seats} onValueChange={setSeats}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Any</SelectItem>
                        <SelectItem value="4">4+</SelectItem>
                        <SelectItem value="6">6+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-4">
                  <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">
                    Price Range: ₹{priceRange[0]} - {priceRange[1] >= MAX_PRICE_KM ? "any" : `₹${priceRange[1]}`} per km
                  </label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={MAX_PRICE_KM}
                    step={1}
                    className="w-full"
                  />
                </div>
                {hasActiveFilters && (
                  <div className="mt-4 flex justify-end">
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-destructive">
                      <X className="w-4 h-4 mr-1" />
                      Clear All Filters
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Trust + Promo bar */}
        <div className="bg-slate-50 border-b border-slate-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2.5 flex flex-wrap items-center gap-x-6 gap-y-1.5">
            {discountConfig?.enabled && (
              <span className="flex items-center gap-1.5 text-xs font-semibold text-orange-700 bg-orange-100 px-2.5 py-1 rounded-full">
                🏷️ {discountConfig.verbiage}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="text-green-500 font-bold">✓</span> No last-minute cancellations
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="text-green-500 font-bold">✓</span> Every car inspected before dispatch
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="text-green-500 font-bold">✓</span> Verified drivers · Fixed fares
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="text-green-500 font-bold">✓</span> Toll, parking & state taxes charged at actuals — no markup
            </span>
          </div>
        </div>

        {/* Car Grid */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse">
                  <div className="aspect-[4/3] bg-slate-200" />
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <div className="h-4 bg-slate-200 rounded w-2/3" />
                      <div className="h-4 bg-slate-200 rounded w-1/4" />
                    </div>
                    <div className="h-3 bg-slate-100 rounded w-full" />
                    <div className="h-3 bg-slate-100 rounded w-3/4" />
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <div className="h-5 bg-slate-200 rounded w-1/3" />
                      <div className="h-7 bg-slate-200 rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayCars.length === 0 ? (
            <div className="text-center py-20">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No cars found</h3>
              <p className="text-muted-foreground mt-1">Try adjusting your filters</p>
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {displayCars.map((car, carIndex) => {
                // Urgency signals — rotated per car for variety
                const urgencyMessages = [
                  "🔥 3 bookings this week",
                  "⚡ Popular choice",
                  "👥 2 people viewing now",
                  "✅ Available today",
                  "🏆 Top rated",
                ];
                const urgency = urgencyMessages[carIndex % urgencyMessages.length];

                return (
                <Card
                  key={car.id}
                  className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer bg-white"
                  onClick={() => navigate(`/booking?carId=${car.id}&${passthroughParams()}`)}
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={car.imageUrl || "/cars/swift-dzire.jpg"}
                      alt={car.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-primary text-white border-0 text-xs">
                        {car.category.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5">
                      <Star className="w-3 h-3 text-primary fill-primary" />
                      <span className="text-xs font-medium">{car.rating}</span>
                    </div>
                    {/* Urgency signal */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                      <span className="text-white text-[10px] font-medium">{urgency}</span>
                    </div>
                    {!car.isAvailable && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Badge variant="destructive" className="text-sm">Not Available</Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-slate-900 text-base">{car.name}</h3>
                        <p className="text-xs text-slate-500">{car.brand}</p>
                      </div>
                      <div className="text-right">
                        {calcFare(car.pricePerKm, car.seats, car.driverCharges ?? "250") ? (() => {
                          const fare = calcFare(car.pricePerKm, car.seats, car.driverCharges ?? "250")!;
                          const discounted = applyDiscount(fare);
                          const saving = discountAmount(fare);
                          return (
                            <>
                              {saving > 0 && <div className="text-xs text-slate-400 line-through">₹{fare.toLocaleString("en-IN")}</div>}
                              <div className={`text-lg font-bold ${saving > 0 ? "text-green-700" : "text-blue-700"}`}>
                                ₹{discounted.toLocaleString("en-IN")}
                              </div>
                              {saving > 0
                                ? <div className="text-[10px] text-green-600 font-medium">Save ₹{saving.toLocaleString("en-IN")}</div>
                                : <div className="text-[10px] text-slate-400">total · ₹{car.pricePerKm}/km</div>}
                            </>
                          );
                        })() : (
                          <>
                            <div className="text-lg font-bold text-blue-700">₹{car.pricePerKm}</div>
                            <div className="text-xs text-slate-400">/km</div>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{car.description}</p>
                    {calcFare(car.pricePerKm, car.seats, car.driverCharges ?? "250") && (() => {
                      const bkm = billedKmFor(car.seats);
                      const minApplies = bkm > effectiveKm;
                      const perCarDriver = parseFloat(car.driverCharges ?? "250");
                      return (
                        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[11px] mb-3 bg-slate-50 rounded-lg px-2.5 py-1.5">
                          <span className="text-slate-400">
                            ₹{car.pricePerKm}/km × {bkm} km{minApplies ? " (min)" : ""} + ₹{(perCarDriver * tripDays).toLocaleString("en-IN")} driver
                          </span>
                          <span className="text-green-700 font-semibold">₹{Math.max(100, Math.round(applyDiscount(calcFare(car.pricePerKm, car.seats, car.driverCharges ?? "250")!) * 0.1)).toLocaleString("en-IN")} advance</span>
                        </div>
                      );
                    })()}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {car.seats - 1} passengers
                      </span>
                      <span className="flex items-center gap-1">
                        <Fuel className="w-3.5 h-3.5" />
                        {car.fuelType}
                      </span>
                      <span className="flex items-center gap-1">
                        <Gauge className="w-3.5 h-3.5" />
                        {car.transmission}
                      </span>
                    </div>
                    <Button
                      className="w-full bg-primary hover:bg-primary/90 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/booking?carId=${car.id}&${passthroughParams()}`);
                      }}
                    >
                      Book Now
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <AIChatbot />
    </div>
  );
}
