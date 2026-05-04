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
];

const fuelTypes = [
  { value: "all", label: "All Fuel Types" },
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "hybrid", label: "Hybrid" },
];

const transmissions = [
  { value: "all", label: "All Transmissions" },
  { value: "manual", label: "Manual" },
  { value: "automatic", label: "Automatic" },
];

export default function CarsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [category, setCategory] = useState(searchParams.get("category") || "all");
  const [fuelType, setFuelType] = useState("all");
  const [transmission, setTransmission] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 30]);
  const [seats, setSeats] = useState("all");
  const [isListening, setIsListening] = useState(false);

  const { data: cars, isLoading } = trpc.car.list.useQuery({
    category: category === "all" ? undefined : category,
    fuelType: fuelType === "all" ? undefined : fuelType,
    transmission: transmission === "all" ? undefined : transmission,
    minPrice: priceRange[0] || undefined,
    maxPrice: priceRange[1] || undefined,
    seats: seats === "all" ? undefined : parseInt(seats),
    search: searchQuery || undefined,
  });

  const fromCity = searchParams.get("from") || "";
  const toCity = searchParams.get("to") || "";
  const distanceKm = parseInt(searchParams.get("distance") || "0");
  const DRIVER_CHARGE = 400;

  const calcFare = (pricePerKm: string) => {
    if (!distanceKm) return null;
    return Math.round(parseFloat(pricePerKm) * distanceKm + DRIVER_CHARGE);
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
    setPriceRange([0, 30]);
    setSeats("all");
    setSearchQuery("");
  };

  const hasActiveFilters =
    category !== "all" ||
    fuelType !== "all" ||
    transmission !== "all" ||
    priceRange[0] !== 0 ||
    priceRange[1] !== 30 ||
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
  ];

  const displayCars = cars?.length ? cars : fallbackCars;

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
                  Fares from <span className="font-bold">₹{(distanceKm * 12 + 400).toLocaleString("en-IN")}</span> to <span className="font-bold">₹{(distanceKm * 22 + 400).toLocaleString("en-IN")}</span> depending on car
                </div>
              </div>
            )}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 font-['Playfair_Display']">
                  {fromCity && toCity ? `Cars for ${fromCity} → ${toCity}` : "Our Fleet"}
                </h1>
                <p className="text-slate-500 mt-1">
                  {displayCars.length} vehicles available{distanceKm > 0 ? ` · Prices shown for ${distanceKm}km` : " for your journey"}
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
                        onClick={() => navigate(`/cars/${rec.carId}`)}
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
                    Price Range: ₹{priceRange[0]} - ₹{priceRange[1]} per km
                  </label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={30}
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

        {/* Car Grid */}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <div className="aspect-[4/3] bg-muted" />
                  <CardContent className="p-4 space-y-3">
                    <div className="h-5 bg-muted rounded w-2/3" />
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </CardContent>
                </Card>
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
              {displayCars.map((car) => (
                <Card
                  key={car.id}
                  className="group overflow-hidden border-0 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer bg-white"
                  onClick={() => navigate(`/cars/${car.id}`)}
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
                    {!car.isAvailable && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Badge variant="destructive" className="text-sm">
                          Not Available
                        </Badge>
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
                        {calcFare(car.pricePerKm) ? (
                          <>
                            <div className="text-lg font-bold text-blue-700">
                              ₹{calcFare(car.pricePerKm)?.toLocaleString("en-IN")}
                            </div>
                            <div className="text-[10px] text-slate-400">total · {distanceKm}km</div>
                          </>
                        ) : (
                          <>
                            <div className="text-lg font-bold text-blue-700">₹{car.pricePerKm}</div>
                            <div className="text-xs text-slate-400">/km</div>
                          </>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-2 mb-3">{car.description}</p>
                    {calcFare(car.pricePerKm) && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-3 bg-slate-50 rounded-lg px-2.5 py-1.5">
                        <span>₹{car.pricePerKm}/km × {distanceKm}km + ₹400 driver</span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {car.seats} seats
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
                        navigate(`/cars/${car.id}`);
                      }}
                    >
                      View Details
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
      <AIChatbot />
    </div>
  );
}
