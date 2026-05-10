import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { MapPin, CalendarDays, Users, ArrowRight, Shield, Clock, CheckCircle, Loader2, AlertCircle, Route, History, Building2 } from "lucide-react";
import { saveRecentSearch, getRecentSearches, type RecentSearch } from "@/hooks/useRecentSearches";
import { trpc } from "@/providers/trpc";

// 9 anchor cities with coordinates for 100km radius restriction
const ANCHOR_CITIES = [
  { name: "Delhi", lat: 28.6139, lng: 77.2090 },
  { name: "Manali", lat: 32.2396, lng: 77.1887 },
  { name: "Jaipur", lat: 26.9124, lng: 75.7873 },
  { name: "Agra", lat: 27.1767, lng: 78.0081 },
  { name: "Rishikesh", lat: 30.0869, lng: 78.2676 },
  { name: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  { name: "Dehradun", lat: 30.3165, lng: 78.0322 },
  { name: "Shimla", lat: 31.1048, lng: 77.1734 },
  { name: "Haridwar", lat: 29.9457, lng: 78.1642 },
];

const RADIUS_KM = 100;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isWithinRadius(lat: number, lng: number): boolean {
  return ANCHOR_CITIES.some(city => haversineKm(lat, lng, city.lat, city.lng) <= RADIUS_KM);
}

// Fare range based on actual fleet rates
const MIN_RATE = 12; // Swift Dzire
const MAX_RATE = 22; // Innova Hycross
const DRIVER_CHARGE = 250;

declare global {
  interface Window { google: any; initGoogleMaps: () => void; }
}

let mapsLoaded = false;
let mapsLoadingPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (mapsLoaded) return Promise.resolve();
  if (mapsLoadingPromise) return mapsLoadingPromise;
  mapsLoadingPromise = new Promise((resolve) => {
    window.initGoogleMaps = () => { mapsLoaded = true; resolve(); };
    const script = document.createElement("script");
    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,geometry&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });
  return mapsLoadingPromise;
}

interface PlaceInputProps {
  label: string;
  placeholder: string;
  onSelect: (address: string, lat: number, lng: number, pincode: string) => void;
  error?: string;
}

function PlaceInput({ label, placeholder, onSelect, error }: PlaceInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [value, setValue] = useState("");
  const [validating, setValidating] = useState(false);
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    loadGoogleMaps().then(() => {
      setReady(true);
      if (!inputRef.current) return;
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "in" },
        fields: ["formatted_address", "geometry", "name", "address_components"],
        types: ["geocode", "establishment"],
      });
      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace();
        if (!place?.geometry?.location) return;
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || place.name || "";

        // Extract pincode from address_components
        const pincode = place.address_components
          ?.find((c: any) => c.types.includes("postal_code"))
          ?.long_name || "";

        setValidating(true);
        setLocalError("");
        if (!isWithinRadius(lat, lng)) {
          setLocalError("Location must be within 100km of our service areas (Delhi, Manali, Jaipur, Agra, Rishikesh, Chandigarh, Dehradun, Shimla, Haridwar)");
          setValue("");
          setValidating(false);
          return;
        }
        setValue(address);
        onSelect(address, lat, lng, pincode);
        setValidating(false);
      });
    });
  }, []);

  const displayError = localError || error;

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</label>
      <div className="relative">
        {validating
          ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-500 animate-spin" />
          : <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-600" />
        }
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => { setValue(e.target.value); setLocalError(""); }}
          placeholder={!ready ? "Loading maps..." : placeholder}
          disabled={!ready}
          className={`w-full h-11 pl-9 pr-3 rounded-xl border text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all ${
            displayError
              ? "border-red-400 focus:ring-red-200 focus:border-red-400"
              : "border-slate-200 focus:ring-blue-500/20 focus:border-blue-500"
          } disabled:bg-slate-50 disabled:text-slate-400`}
        />
      </div>
      {displayError && (
        <p className="text-[10px] text-red-500 flex items-start gap-1">
          <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
          {displayError}
        </p>
      )}
    </div>
  );
}

export default function HeroSection() {
  const navigate = useNavigate();
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const logSearch = trpc.search.log.useMutation();

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const [fromAddress, setFromAddress] = useState("");
  const [fromLat, setFromLat] = useState<number>();
  const [fromLng, setFromLng] = useState<number>();
  const [fromPincode, setFromPincode] = useState("");

  const [toAddress, setToAddress] = useState("");
  const [toLat, setToLat] = useState<number>();
  const [toLng, setToLng] = useState<number>();
  const [toPincode, setToPincode] = useState("");

  const [pickupDate, setPickupDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [passengers, setPassengers] = useState("");
  const [tripType, setTripType] = useState("one_way");
  const [sameDayReturn, setSameDayReturn] = useState(false);

  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationText, setDurationText] = useState("");
  const [fareMin, setFareMin] = useState<number | null>(null);
  const [fareMax, setFareMax] = useState<number | null>(null);
  const [calcError, setCalcError] = useState("");
  const [isCalc, setIsCalc] = useState(false);
  const [formError, setFormError] = useState("");

  // Calculate distance whenever both locations are set
  useEffect(() => {
    if (!fromLat || !fromLng || !toLat || !toLng) { setDistanceKm(null); setFareMin(null); setFareMax(null); return; }
    setIsCalc(true);
    setCalcError("");
    // Use OSRM for accurate road distance
    fetch(`https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`)
      .then(r => r.json())
      .then(data => {
        if (data.code === "Ok" && data.routes?.[0]) {
          const km = Math.round(data.routes[0].distance / 1000);
          const secs = data.routes[0].duration;
          const hrs = Math.floor(secs / 3600);
          const mins = Math.floor((secs % 3600) / 60);
          setDistanceKm(km);
          setDurationText(`~${hrs}h ${mins}m`);
          setFareMin(km * MIN_RATE + DRIVER_CHARGE); setFareMax(km * MAX_RATE + DRIVER_CHARGE);
        } else {
          // Haversine fallback
          const km = Math.round(haversineKm(fromLat, fromLng, toLat, toLng) * 1.3);
          setDistanceKm(km);
          setDurationText("Estimated");
          setFareMin(km * MIN_RATE + DRIVER_CHARGE); setFareMax(km * MAX_RATE + DRIVER_CHARGE);
        }
      })
      .catch(() => {
        const km = Math.round(haversineKm(fromLat, fromLng, toLat, toLng) * 1.3);
        setDistanceKm(km);
        setFareMin(km * MIN_RATE + DRIVER_CHARGE); setFareMax(km * MAX_RATE + DRIVER_CHARGE);
      })
      .finally(() => setIsCalc(false));
  }, [fromLat, fromLng, toLat, toLng]);

  const isRoundTrip = tripType === "round_trip";

  const tripDays = isRoundTrip && !sameDayReturn && returnDate && pickupDate
    ? Math.max(1, Math.ceil((returnDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60 * 24)))
    : 1;
  const kmMultiplier = isRoundTrip ? 2 : 1;
  const displayFareMin = distanceKm ? Math.round(distanceKm * kmMultiplier * MIN_RATE + DRIVER_CHARGE * tripDays) : null;
  const displayFareMax = distanceKm ? Math.round(distanceKm * kmMultiplier * MAX_RATE + DRIVER_CHARGE * tripDays) : null;

  const handleSearch = () => {
    setFormError("");
    if (!fromAddress) { setFormError("Please enter a pickup location."); return; }
    if (!toAddress) { setFormError("Please enter a drop-off location."); return; }
    if (!pickupDate) { setFormError("Please select a departure date."); return; }
    if (isRoundTrip && !sameDayReturn && !returnDate) { setFormError("Please select a return date, or check 'Same day return'."); return; }
    if (!passengers) { setFormError("Please select number of passengers."); return; }

    const params = new URLSearchParams({
      from: fromAddress.split(",")[0],
      to: toAddress.split(",")[0],
      fromFull: fromAddress,
      toFull: toAddress,
      passengers,
      tripType,
    });
    if (pickupDate) params.set("date", format(pickupDate, "yyyy-MM-dd"));
    if (isRoundTrip && !sameDayReturn && returnDate) params.set("returnDate", format(returnDate, "yyyy-MM-dd"));
    if (distanceKm) params.set("distance", String(distanceKm));
    if (fromPincode) params.set("fromPincode", fromPincode);
    if (toPincode) params.set("toPincode", toPincode);
    if (fromLat && fromLng) { params.set("fromLat", String(fromLat)); params.set("fromLng", String(fromLng)); }
    if (toLat && toLng) { params.set("toLat", String(toLat)); params.set("toLng", String(toLng)); }
    // Save to recent searches (local + backend)
    saveRecentSearch({
      from: fromAddress.split(",")[0],
      to: toAddress.split(",")[0],
      fromFull: fromAddress,
      toFull: toAddress,
      distance: distanceKm || undefined,
    });
    logSearch.mutate({
      fromCity: fromAddress.split(",")[0],
      toCity: toAddress.split(",")[0],
      pickupDate: pickupDate ? format(pickupDate, "yyyy-MM-dd") : undefined,
      passengerCount: passengers ? parseInt(passengers) : undefined,
    });

    navigate(`/cars?${params.toString()}`);
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img src="/hero-bg.jpg" alt="Premium cab" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/75 to-slate-900/50" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-16 items-center min-h-screen lg:py-28 py-32">

          {/* Left */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-medium text-white/90 uppercase tracking-wider">Delhi's Trusted Outstation Cab</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight font-['DM_Serif_Display']">
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
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-7 h-12 gap-2 shadow-lg shadow-blue-900/30">
                See Available Cars <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            {/* B2B teaser */}
            <button
              onClick={() => document.getElementById("corporate")?.scrollIntoView({ behavior: "smooth" })}
              className="flex items-center gap-3 w-fit px-4 py-2.5 rounded-xl bg-white/8 border border-white/15 hover:bg-white/15 hover:border-white/30 transition-all group backdrop-blur-sm"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-500/30 flex items-center justify-center shrink-0">
                <Building2 className="w-3.5 h-3.5 text-blue-300" />
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-white">Corporate & Employee Transport</div>
                <div className="text-[11px] text-slate-400">GST invoices · Fleet accounts · Dedicated manager</div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all ml-1 shrink-0" />
            </button>

            <div className="flex gap-8 pt-4 border-t border-white/10">
              {[{ num: "15K+", label: "Happy Travelers" }, { num: "4.9★", label: "Average Rating" }, { num: "8+", label: "Premium Cars" }].map((s, i) => (
                <div key={i}>
                  <div className="text-xl font-bold text-white font-['DM_Serif_Display']">{s.num}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Booking Widget */}
          <div className="animate-scale-in">
            <div className="bg-white rounded-2xl shadow-2xl p-6 lg:p-7">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-['DM_Serif_Display']">Book Your Cab</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Serving within 100km of Delhi, Manali, Jaipur, Agra & more
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-xs font-semibold text-green-700 shrink-0 ml-2">
                  ₹0 Fee
                </span>
              </div>

              <div className="space-y-4">
                {/* Trip type */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
                    {[
                      { value: "one_way", label: "One Way" },
                      { value: "round_trip", label: "Round Trip" },
                    ].map((type) => (
                      <button key={type.value} onClick={() => {
                        setTripType(type.value);
                        if (type.value === "one_way") { setReturnDate(undefined); setSameDayReturn(false); }
                      }}
                        className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all ${
                          tripType === type.value
                            ? "bg-white text-blue-700 shadow-sm"
                            : "text-slate-500 hover:text-slate-700"
                        }`}>
                        {type.label}
                      </button>
                    ))}
                  </div>
                  {/* Same day return sub-toggle */}
                  {isRoundTrip && (
                    <div className="flex gap-1.5 px-0.5">
                      {[
                        { sd: true,  label: "Same day return" },
                        { sd: false, label: "Overnight stay" },
                      ].map(({ sd, label }) => (
                        <button key={label} onClick={() => { setSameDayReturn(sd); if (sd) setReturnDate(undefined); }}
                          className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                            sameDayReturn === sd
                              ? "bg-blue-50 border-blue-400 text-blue-700"
                              : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                          }`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* From location */}
                <PlaceInput
                  label="PICKUP LOCATION"
                  placeholder="Enter pickup address or city"
                  onSelect={(addr, lat, lng, pincode) => { setFromAddress(addr); setFromLat(lat); setFromLng(lng); setFromPincode(pincode); }}
                />

                {/* To location */}
                <PlaceInput
                  label="DROP-OFF LOCATION"
                  placeholder="Enter destination address or city"
                  onSelect={(addr, lat, lng, pincode) => { setToAddress(addr); setToLat(lat); setToLng(lng); setToPincode(pincode); }}
                />

                {/* Distance + Fare result */}
                {(isCalc || distanceKm) && (
                  <div className={`p-3 rounded-xl border transition-all ${
                    isCalc ? "bg-slate-50 border-slate-200" : "bg-blue-50 border-blue-200"
                  }`}>
                    {isCalc ? (
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        Calculating distance & fare...
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm text-blue-800">
                          <Route className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">{distanceKm} km{kmMultiplier > 1 ? ` × ${kmMultiplier}` : ""}</span>
                          {durationText && <span className="text-blue-500 text-xs">({durationText})</span>}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-blue-800 text-sm">
                            ₹{displayFareMin?.toLocaleString("en-IN")} – ₹{displayFareMax?.toLocaleString("en-IN")}
                          </div>
                          <div className="text-[10px] text-blue-500">
                            {isRoundTrip && sameDayReturn ? "same day return · " : tripDays > 1 ? `${tripDays}-day total · ` : ""}depends on car
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Date & Passengers */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {isRoundTrip ? "DEPARTURE" : "DATE"}
                    </label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm flex items-center gap-2 hover:border-blue-400 transition-colors">
                          <CalendarDays className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className={pickupDate ? "text-slate-900" : "text-slate-400"}>
                            {pickupDate ? format(pickupDate, "dd MMM") : "Select date"}
                          </span>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-3 bg-white border-slate-200 shadow-lg" align="start">
                        <Calendar mode="single" selected={pickupDate} onSelect={(d) => {
                          setPickupDate(d);
                          if (returnDate && d && returnDate <= d) setReturnDate(undefined);
                        }} disabled={(date) => date < new Date()} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Same-day round trip: show a "same day" badge instead of return picker */}
                  {isRoundTrip && sameDayReturn ? (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">RETURN</label>
                      <div className="w-full h-11 px-3 rounded-xl border border-blue-200 bg-blue-50 text-sm flex items-center gap-2">
                        <CalendarDays className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="text-blue-700 font-medium text-xs">Same day as departure</span>
                      </div>
                    </div>
                  ) : isRoundTrip && !sameDayReturn ? (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">RETURN DATE</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className={`w-full h-11 px-3 rounded-xl border bg-white text-sm flex items-center gap-2 hover:border-blue-400 transition-colors ${
                            returnDate ? "border-slate-200" : "border-blue-300 border-dashed"
                          }`}>
                            <CalendarDays className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className={returnDate ? "text-slate-900" : "text-blue-400"}>
                              {returnDate ? format(returnDate, "dd MMM") : "Pick return date"}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-3 bg-white border-slate-200 shadow-lg" align="start">
                          <Calendar mode="single" selected={returnDate} onSelect={setReturnDate}
                            disabled={(date) => date <= (pickupDate || new Date())} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">PASSENGERS</label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-600" />
                        <select value={passengers} onChange={(e) => setPassengers(e.target.value)}
                          className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer">
                          <option value="" disabled>Select</option>
                          {[1,2,3,4,5,6].map((n) => (
                            <option key={n} value={n}>{n} {n === 1 ? "Person" : "People"}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {/* Passengers — shown below when round trip */}
                {isRoundTrip && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">PASSENGERS</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-600" />
                      <select value={passengers} onChange={(e) => setPassengers(e.target.value)}
                        className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer">
                        <option value="" disabled>Select</option>
                        {[1,2,3,4,5,6].map((n) => (
                          <option key={n} value={n}>{n} {n === 1 ? "Person" : "People"}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {formError && (
                  <p className="text-xs text-red-500 flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {formError}
                  </p>
                )}

                <Button onClick={handleSearch}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm gap-2 shadow-sm transition-all">
                  {displayFareMin
                    ? `See Cars · ₹${displayFareMin.toLocaleString("en-IN")}–₹${displayFareMax?.toLocaleString("en-IN")}${tripDays > 1 ? ` (${tripDays}d)` : ""}`
                    : "See Available Cars & Fares"}
                  <ArrowRight className="w-4 h-4" />
                </Button>

                {/* Guarantees */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { icon: "🔒", text: "No Hidden Fees" },
                    { icon: "⏰", text: "On-Time Pickup" },
                    { icon: "✅", text: "Free Cancel 24hr" },
                  ].map((g, i) => (
                    <div key={i} className="text-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="text-sm mb-0.5">{g.icon}</div>
                      <div className="text-[10px] text-slate-500 leading-tight font-medium">{g.text}</div>
                    </div>
                  ))}
                </div>
                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                  <div className="pt-1 border-t border-slate-100">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <History className="w-3 h-3" /> Recent Searches
                    </p>
                    <div className="space-y-1">
                      {recentSearches.map((s, i) => (
                        <button key={i} onClick={() => navigate(`/cars?from=${s.from}&to=${s.to}&fromFull=${encodeURIComponent(s.fromFull)}&toFull=${encodeURIComponent(s.toFull)}${s.distance ? `&distance=${s.distance}` : ""}`)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left group">
                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <MapPin className="w-3 h-3 text-blue-500 shrink-0" />
                            <span>{s.from}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span>{s.to}</span>
                          </div>
                          {s.distance && <span className="text-[10px] text-slate-400">{s.distance} km</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
