import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { MapPin, CalendarDays, ArrowRight, Shield, Clock, CheckCircle, Loader2, AlertCircle, Route, History, Building2 } from "lucide-react";
import { saveRecentSearch, getRecentSearches, type RecentSearch } from "@/hooks/useRecentSearches";
import { trpc } from "@/providers/trpc";
import { RENTAL_BANDS, RENTAL_MIN_HOURS, RENTAL_MAX_HOURS, RENTAL_KM_PER_HOUR } from "@/lib/rental";
import { calcTourKm, APPROVED_DESTINATIONS } from "@/lib/tourDistance";

// Delhi center — pickup restricted to 40km radius (covers full NCR: Gurgaon, Noida, Faridabad, Ghaziabad, Rohtak, Sonipat)
const DELHI_CENTER = { lat: 28.6139, lng: 77.2090 };
const DELHI_PICKUP_RADIUS_KM = 40;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isInDelhiNcr(lat: number, lng: number): boolean {
  return haversineKm(lat, lng, DELHI_CENTER.lat, DELHI_CENTER.lng) <= DELHI_PICKUP_RADIUS_KM;
}

// Fare range based on actual fleet rates
const MIN_RATE = 13; // Swift Dzire
const MAX_RATE = 23; // Innova Hycross
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
  delhiNcrOnly?: boolean;
}

function PlaceInput({ label, placeholder, onSelect, error, delhiNcrOnly = false }: PlaceInputProps) {
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

      const options: any = {
        componentRestrictions: { country: "in" },
        fields: ["formatted_address", "geometry", "name", "address_components"],
        types: ["geocode", "establishment"],
      };

      // Bias results toward Delhi NCR for pickup input
      if (delhiNcrOnly) {
        options.bounds = new window.google.maps.LatLngBounds(
          new window.google.maps.LatLng(27.9, 76.5),  // SW corner of NCR
          new window.google.maps.LatLng(29.2, 78.0),  // NE corner of NCR
        );
        options.strictBounds = false;
      }

      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, options);
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

        if (delhiNcrOnly && !isInDelhiNcr(lat, lng)) {
          setLocalError("Pickup must be within Delhi NCR (Delhi, Gurgaon, Noida, Faridabad, Ghaziabad, Rohtak, Sonipat)");
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
  const [pickupOpen, setPickupOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [pickupTime, setPickupTime] = useState("08:00");
  const [returnTime, setReturnTime] = useState("08:00");
  const [tripType, setTripType] = useState("round_trip");
  const [sameDayReturn, setSameDayReturn] = useState(false);
  const [rentalHours, setRentalHours] = useState(RENTAL_MIN_HOURS);

  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationText, setDurationText] = useState("");
  const [fareMin, setFareMin] = useState<number | null>(null);
  const [fareMax, setFareMax] = useState<number | null>(null);
  const [calcError, setCalcError] = useState("");
  const [isCalc, setIsCalc] = useState(false);
  const [formError, setFormError] = useState("");

  // Tour (multi-stop sub-mode under Round Trip)
  const [tourSubMode, setTourSubMode] = useState(false);
  const [tourStops, setTourStops] = useState<string[]>([]);
  const [tourStopInput, setTourStopInput] = useState("");
  const [tourInputFocused, setTourInputFocused] = useState(false);
  const [tourStartDate, setTourStartDate] = useState<Date>();
  const [tourEndDate, setTourEndDate] = useState<Date>();
  const [tourStartOpen, setTourStartOpen] = useState(false);
  const [tourEndOpen, setTourEndOpen] = useState(false);

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
  const rawBilledKm = (distanceKm ?? 0) * kmMultiplier;
  // Apply same minimum billing rules as Cars.tsx
  const billedKm = tripDays > 1
    ? Math.max(rawBilledKm, tripDays * 250)
    : Math.max(rawBilledKm, 80);
  const fareMultiplier = isRoundTrip ? 1 : 1.25;
  const displayFareMin = distanceKm ? Math.round(billedKm * MIN_RATE * fareMultiplier + DRIVER_CHARGE * tripDays) : null;
  const displayFareMax = distanceKm ? Math.round(billedKm * MAX_RATE * fareMultiplier + DRIVER_CHARGE * tripDays) : null;

  const handleSearch = () => {
    setFormError("");
    if (!fromAddress) { setFormError("Please enter a pickup location."); return; }
    if (!toAddress) { setFormError("Please enter a drop-off location."); return; }
    if (!pickupDate) { setFormError("Please select a departure date."); return; }
    if (isRoundTrip && !sameDayReturn && !returnDate) { setFormError("Please select a return date, or check 'Same day return'."); return; }

    const params = new URLSearchParams({
      from: fromAddress.split(",")[0],
      to: toAddress.split(",")[0],
      fromFull: fromAddress,
      toFull: toAddress,
      tripType,
    });
    if (pickupDate) params.set("date", format(pickupDate, "yyyy-MM-dd"));
    params.set("time", pickupTime);
    if (isRoundTrip && !sameDayReturn && returnDate) params.set("returnDate", format(returnDate, "yyyy-MM-dd"));
    if (isRoundTrip) params.set("returnTime", returnTime);
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
      passengerCount: undefined,
    });

    navigate(`/cars?${params.toString()}`);
  };

  const isRental = tripType === "rental";
  const isTour = isRoundTrip && tourSubMode;

  // Tour fare derivations
  const tourDays = tourStartDate && tourEndDate
    ? Math.max(1, Math.ceil((tourEndDate.getTime() - tourStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 1;
  const tourActualKm = calcTourKm(tourStops);
  const tourBilledKm = Math.max(tourActualKm, tourDays * 250);
  const tourFareMin = tourActualKm > 0 ? Math.round(tourBilledKm * MIN_RATE + DRIVER_CHARGE * tourDays) : null;
  const tourFareMax = tourActualKm > 0 ? Math.round(tourBilledKm * MAX_RATE + DRIVER_CHARGE * tourDays) : null;

  const filteredTourDestinations = APPROVED_DESTINATIONS.filter(d =>
    !tourStops.includes(d) &&
    d.toLowerCase().includes(tourStopInput.toLowerCase())
  );

  const addTourStop = (dest: string) => {
    setTourStops(s => [...s, dest]);
    setTourStopInput("");
  };

  const handleTourSearch = () => {
    setFormError("");
    if (tourStops.length < 1) { setFormError("Please add at least one destination."); return; }
    if (!tourStartDate) { setFormError("Please select a start date."); return; }
    if (!tourEndDate) { setFormError("Please select an end date."); return; }
    const params = new URLSearchParams({
      tripType: "multi_day",
      from: "Delhi",
      stops: tourStops.join(","),
      days: String(tourDays),
      startDate: format(tourStartDate, "yyyy-MM-dd"),
      endDate: format(tourEndDate, "yyyy-MM-dd"),
      distance: String(tourBilledKm),
      actualKm: String(tourActualKm),
    });
    navigate(`/cars?${params.toString()}`);
  };

  const handleRentalSearch = () => {
    setFormError("");
    if (!fromAddress) { setFormError("Please enter a pickup location."); return; }
    if (!pickupDate) { setFormError("Please select a departure date."); return; }
    const params = new URLSearchParams({
      tripType: "rental",
      hours: String(rentalHours),
      from: fromAddress.split(",")[0],
      fromFull: fromAddress,
    });
    if (pickupDate) params.set("date", format(pickupDate, "yyyy-MM-dd"));
    params.set("time", pickupTime);
    if (fromPincode) params.set("fromPincode", fromPincode);
    if (fromLat && fromLng) { params.set("fromLat", String(fromLat)); params.set("fromLng", String(fromLng)); }
    navigate(`/cars?${params.toString()}`);
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img src="/hero-bg.jpg" alt="Premium cab" className="w-full h-full object-cover" fetchpriority="high" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/75 to-slate-900/50" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center lg:min-h-screen pt-20 pb-8 lg:py-28">

          {/* Right - Booking Widget (first on mobile) */}
          <div className="order-first lg:order-last animate-scale-in">
            <div className="bg-white rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-7">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 font-['DM_Serif_Display']">Book Your Ride</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Delhi · Manali · Shimla · Dharamshala · Kashmir · Vaishno Devi · Jaipur · Agra · Rishikesh · Haridwar · Dehradun · Chandigarh · Ludhiana · Amritsar · Ayodhya · Banaras & more
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-xs font-semibold text-green-700 shrink-0 ml-2">
                  ₹0 Fee
                </span>
              </div>

              <div className="space-y-4">
                {/* Tier 1: Trip type tabs */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl">
                  {[
                    { value: "one_way", label: "One Way" },
                    { value: "round_trip", label: "Round Trip" },
                    { value: "rental", label: "Rentals" },
                  ].map((type) => (
                    <button key={type.value} onClick={() => {
                      setTripType(type.value);
                      if (type.value === "one_way") { setReturnDate(undefined); setSameDayReturn(false); setTourSubMode(false); }
                      if (type.value === "rental") { setReturnDate(undefined); setSameDayReturn(false); setTourSubMode(false); }
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

                {/* Tier 2: Single scrollable pill row — functional pills + decorative chips */}
                <div className="overflow-x-auto -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
                  <div className="flex gap-1.5 flex-nowrap">
                    {isRoundTrip ? (
                      <>
                        {[
                          { id: "same_day", label: "Same day" },
                          { id: "overnight", label: "Overnight" },
                          { id: "multi_stop", label: "Multi-stop" },
                        ].map(({ id, label }) => {
                          const isActive = id === "same_day" ? (sameDayReturn && !tourSubMode)
                                         : id === "overnight" ? (!sameDayReturn && !tourSubMode)
                                         : tourSubMode;
                          return (
                            <button key={id} onClick={() => {
                              if (id === "same_day") { setSameDayReturn(true); setTourSubMode(false); setReturnDate(undefined); }
                              else if (id === "overnight") { setSameDayReturn(false); setTourSubMode(false); }
                              else { setTourSubMode(true); setSameDayReturn(false); setReturnDate(undefined); }
                            }}
                              className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${
                                isActive
                                  ? id === "multi_stop"
                                    ? "bg-violet-50 border-violet-400 text-violet-700"
                                    : "bg-blue-50 border-blue-400 text-blue-700"
                                  : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                              }`}>
                              {label}
                            </button>
                          );
                        })}
                      </>
                    ) : isRental ? (
                      <>
                        <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-[11px] text-amber-700 font-medium cursor-default">🏥 Hospital Visits</span>
                        <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-[11px] text-amber-700 font-medium cursor-default">🛍️ Shopping Trips</span>
                        <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-[11px] text-amber-700 font-medium cursor-default">✈️ Airport Loops</span>
                        <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-100 text-[11px] text-amber-700 font-medium cursor-default">📍 Multiple Stops</span>
                      </>
                    ) : (
                      <>
                        <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[11px] text-blue-600 font-medium cursor-default">✈️ Airport Transfer</span>
                        <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[11px] text-blue-600 font-medium cursor-default">💼 Corporate Drop</span>
                        <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-[11px] text-blue-600 font-medium cursor-default">🏔️ Hill Getaway</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Multi-stop sub-row — visible only when Multi-stop is active */}
                {isTour && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-100 text-[11px] text-violet-600 font-medium">🗺️ Custom Route</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-100 text-[11px] text-violet-600 font-medium">🏔️ Multi-City</span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-100 text-[11px] text-violet-600 font-medium">🔄 Circuit from Delhi</span>
                  </div>
                )}

                {/* Tour form */}
                {isTour ? (
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-violet-50 border border-violet-200 text-sm text-violet-800">
                      <span className="font-semibold">Multi-stop circuit from Delhi</span>
                      <span className="text-violet-600 text-xs block mt-0.5">Driver departs Delhi, covers all your stops, returns to Delhi. Fare covers the full circuit.</span>
                    </div>

                    {/* Date range */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">START DATE</label>
                        <Popover open={tourStartOpen} onOpenChange={setTourStartOpen}>
                          <PopoverTrigger asChild>
                            <button className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm flex items-center gap-2 hover:border-violet-400 transition-colors">
                              <CalendarDays className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                              <span className={tourStartDate ? "text-slate-900" : "text-slate-400"}>
                                {tourStartDate ? format(tourStartDate, "dd MMM") : "Start date"}
                              </span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-3 bg-white border-slate-200 shadow-lg" align="start">
                            <Calendar mode="single" selected={tourStartDate} onSelect={(d) => {
                              setTourStartDate(d);
                              setTourStartOpen(false);
                              if (tourEndDate && d && tourEndDate <= d) setTourEndDate(undefined);
                            }} disabled={(date) => date < new Date()} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">END DATE</label>
                        <Popover open={tourEndOpen} onOpenChange={setTourEndOpen}>
                          <PopoverTrigger asChild>
                            <button className={`w-full h-11 px-3 rounded-xl border bg-white text-sm flex items-center gap-2 hover:border-violet-400 transition-colors ${tourEndDate ? "border-slate-200" : "border-violet-300 border-dashed"}`}>
                              <CalendarDays className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                              <span className={tourEndDate ? "text-slate-900" : "text-violet-400"}>
                                {tourEndDate ? format(tourEndDate, "dd MMM") : "End date"}
                              </span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-3 bg-white border-slate-200 shadow-lg" align="start">
                            <Calendar mode="single" selected={tourEndDate} onSelect={(d) => {
                              setTourEndDate(d);
                              setTourEndOpen(false);
                            }} disabled={(date) => date <= (tourStartDate || new Date())} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* Stop builder */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">DESTINATIONS (ADD STOPS)</label>
                      {tourStops.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-violet-50 border border-violet-100">
                          {tourStops.map((stop, i) => (
                            <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-violet-200 rounded-full text-xs text-violet-800 font-medium">
                              {stop}
                              <button onClick={() => setTourStops(s => s.filter((_, idx) => idx !== i))} className="text-violet-300 hover:text-violet-600 ml-0.5 leading-none">×</button>
                            </span>
                          ))}
                          <span className="text-[10px] text-violet-400 self-center">→ Delhi</span>
                        </div>
                      )}
                      <div className="relative">
                        <input
                          type="text"
                          value={tourStopInput}
                          onChange={(e) => setTourStopInput(e.target.value)}
                          onFocus={() => setTourInputFocused(true)}
                          onBlur={() => setTimeout(() => setTourInputFocused(false), 150)}
                          placeholder={tourStops.length >= 8 ? "Max 8 stops reached" : "Type to search destinations…"}
                          disabled={tourStops.length >= 8}
                          className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none disabled:bg-slate-50 disabled:text-slate-400"
                        />
                        {tourInputFocused && filteredTourDestinations.length > 0 && (
                          <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-44 overflow-y-auto">
                            {filteredTourDestinations.map(dest => (
                              <button
                                key={dest}
                                onMouseDown={() => addTourStop(dest)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-violet-50 hover:text-violet-800 transition-colors flex items-center gap-2"
                              >
                                <MapPin className="w-3 h-3 text-violet-400 shrink-0" />{dest}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Live fare estimate */}
                    {tourStops.length > 0 && tourStartDate && tourEndDate && tourFareMin && (
                      <div className="p-3 rounded-xl bg-violet-50 border border-violet-200">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-violet-800">
                            <Route className="w-3.5 h-3.5 inline mr-1 text-violet-500" />
                            <span className="font-medium">{tourDays} days · ~{tourActualKm} km</span>
                            {tourBilledKm > tourActualKm && (
                              <span className="text-violet-500 text-xs ml-1">(min {tourBilledKm} billed)</span>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-violet-800 text-sm">
                              ₹{tourFareMin.toLocaleString("en-IN")} – ₹{tourFareMax?.toLocaleString("en-IN")}
                            </div>
                            <div className="text-[10px] text-violet-500">indicative · all vehicles</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                {/* From location — Delhi NCR only */}
                <PlaceInput
                  label="PICKUP LOCATION"
                  placeholder="Enter Delhi NCR address or area"
                  delhiNcrOnly
                  onSelect={(addr, lat, lng, pincode) => { setFromAddress(addr); setFromLat(lat); setFromLng(lng); setFromPincode(pincode); }}
                />

                {/* Rental: hours stepper + summary (no drop-off field) */}
                {isRental ? (
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">PACKAGE DURATION</label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setRentalHours(h => Math.max(RENTAL_MIN_HOURS, h - 1))}
                          disabled={rentalHours <= RENTAL_MIN_HOURS}
                          className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        >−</button>
                        <span className="text-slate-900 font-semibold w-16 text-center">{rentalHours} hrs</span>
                        <button
                          onClick={() => setRentalHours(h => Math.min(RENTAL_MAX_HOURS, h + 1))}
                          disabled={rentalHours >= RENTAL_MAX_HOURS}
                          className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                        >+</button>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                      <span className="font-semibold">{rentalHours} hrs</span>
                      {" · "}
                      <span>{rentalHours * RENTAL_KM_PER_HOUR} km included</span>
                      {" · "}
                      <span>from <strong>₹{(RENTAL_BANDS[0].hourly * rentalHours).toLocaleString("en-IN")}</strong></span>
                      <div className="text-[11px] text-amber-600 mt-0.5">Local Delhi NCR travel · multiple stops OK</div>
                    </div>
                  </div>
                ) : (
                  /* To location — outstation only */
                  <PlaceInput
                    label="DROP-OFF LOCATION"
                    placeholder="Enter destination address or city"
                    onSelect={(addr, lat, lng, pincode) => { setToAddress(addr); setToLat(lat); setToLng(lng); setToPincode(pincode); }}
                  />
                )}

                {/* Distance + Fare result — outstation only */}
                {!isRental && (isCalc || distanceKm) && (
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
                            {isRoundTrip && sameDayReturn ? "same day return · " : tripDays > 1 ? `${tripDays}-day total · ` : ""}depends on vehicle
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                  </>
                )}

                {/* Date row — hidden on Tour tab (Tour has its own date pickers) */}
                {!isTour && <div className={`grid gap-3 ${isRoundTrip && !isRental ? "grid-cols-2" : "grid-cols-1"}`}>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {isRoundTrip ? "DEPARTURE" : "DATE"}
                    </label>
                    <Popover open={pickupOpen} onOpenChange={setPickupOpen}>
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
                          setPickupOpen(false);
                          if (returnDate && d && returnDate <= d) setReturnDate(undefined);
                        }} disabled={(date) => date < new Date()} initialFocus />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Return date — only shown for round trips (not rentals) */}
                  {isRoundTrip && !isRental && (sameDayReturn ? (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">RETURN</label>
                      <div className="w-full h-11 px-3 rounded-xl border border-blue-200 bg-blue-50 text-sm flex items-center gap-2">
                        <CalendarDays className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="text-blue-700 font-medium text-xs">Same day as departure</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">RETURN DATE</label>
                      <Popover open={returnOpen} onOpenChange={setReturnOpen}>
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
                          <Calendar mode="single" selected={returnDate} onSelect={(d) => {
                            setReturnDate(d);
                            setReturnOpen(false);
                          }} disabled={(date) => date <= (pickupDate || new Date())} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>
                  ))}
                </div>}

                {/* Time row — 2 cols for round trip, hidden for Tour */}
                {!isTour && <div className={`grid gap-3 ${isRoundTrip && !isRental ? "grid-cols-2" : "grid-cols-1"}`}>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">PICKUP TIME</label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-600 pointer-events-none" />
                      <select value={pickupTime} onChange={(e) => setPickupTime(e.target.value)}
                        className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer">
                        {Array.from({ length: 38 }, (_, i) => {
                          const totalMins = 4 * 60 + i * 30;
                          const h = Math.floor(totalMins / 60);
                          const m = totalMins % 60;
                          const val = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                          const label = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
                          return <option key={val} value={val}>{label}</option>;
                        })}
                      </select>
                    </div>
                  </div>
                  {isRoundTrip && !isRental && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">DROP-OFF TIME</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-blue-600 pointer-events-none" />
                        <select value={returnTime} onChange={(e) => setReturnTime(e.target.value)}
                          className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none appearance-none cursor-pointer">
                          {Array.from({ length: 38 }, (_, i) => {
                            const totalMins = 4 * 60 + i * 30;
                            const h = Math.floor(totalMins / 60);
                            const m = totalMins % 60;
                            const val = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
                            const label = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
                            return <option key={val} value={val}>{label}</option>;
                          })}
                        </select>
                      </div>
                    </div>
                  )}
                </div>}

                {formError && (
                  <p className="text-xs text-red-500 flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {formError}
                  </p>
                )}

                <Button onClick={isTour ? handleTourSearch : isRental ? handleRentalSearch : handleSearch}
                  className={`w-full h-12 text-white font-semibold text-sm gap-2 shadow-sm transition-all ${isTour ? "bg-violet-600 hover:bg-violet-700" : "bg-blue-600 hover:bg-blue-700"}`}>
                  {isTour
                    ? tourFareMin
                      ? `See Tour Vehicles · ₹${tourFareMin.toLocaleString("en-IN")}–₹${tourFareMax?.toLocaleString("en-IN")} (${tourDays}d)`
                      : "See Tour Vehicles & Fares"
                    : isRental
                      ? `See Rental Vehicles · from ₹${(RENTAL_BANDS[0].hourly * rentalHours).toLocaleString("en-IN")}`
                      : displayFareMin
                        ? `See Vehicles · ₹${displayFareMin.toLocaleString("en-IN")}–₹${displayFareMax?.toLocaleString("en-IN")}${tripDays > 1 ? ` (${tripDays}d)` : ""}`
                        : "See Available Vehicles & Fares"}
                  <ArrowRight className="w-4 h-4" />
                </Button>

                {/* Referral pill */}
                <Link to="/referral" className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 hover:border-blue-300 transition-colors group">
                  <span className="text-base">🎁</span>
                  <span className="text-xs font-semibold text-blue-700">Refer a friend — you both get <span className="text-blue-900 font-bold">₹100 off</span></span>
                  <ArrowRight className="w-3 h-3 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
                </Link>

                {/* Guarantees */}
                <div className="flex items-center justify-center divide-x divide-slate-200">
                  {[
                    { icon: "🔒", text: "No Hidden Fees" },
                    { icon: "⏰", text: "On-Time Pickup" },
                    { icon: "✅", text: "Free Cancel 24hr" },
                  ].map((g, i) => (
                    <span key={i} className="flex items-center gap-1 px-3 text-[11px] text-slate-400 font-medium">
                      <span>{g.icon}</span>
                      <span>{g.text}</span>
                    </span>
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

          {/* Left - Brand content (second on mobile, first on desktop) */}
          <div className="order-last lg:order-first space-y-6 lg:space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-medium text-white/90 uppercase tracking-wider">Delhi's Trusted Outstation Cab</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white leading-tight font-['DM_Serif_Display']">
              Safe Journeys.<br />
              <span className="text-blue-300">Fixed Prices.</span><br />
              Every Time.
            </h1>
            <p className="hidden sm:block text-lg text-slate-300 max-w-md leading-relaxed">
              Book verified cab drivers for Delhi outstation trips. Transparent pricing,
              no hidden charges, confirmed pickup — or your money back.
            </p>
            <div className="hidden sm:flex flex-wrap gap-5 text-sm text-slate-300">
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
            {/* B2B teaser */}
            <button
              onClick={() => document.getElementById("corporate")?.scrollIntoView({ behavior: "smooth" })}
              className="hidden sm:flex items-center gap-3 w-fit px-4 py-2.5 rounded-xl bg-white/8 border border-white/15 hover:bg-white/15 hover:border-white/30 transition-all group backdrop-blur-sm"
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

            <div className="hidden sm:flex gap-8 pt-4 border-t border-white/10">
              {[{ num: "500+", label: "Trips Completed" }, { num: "4.9★", label: "Average Rating" }, { num: "30+", label: "Cities Served" }].map((s, i) => (
                <div key={i}>
                  <div className="text-xl font-bold text-white font-['DM_Serif_Display']">{s.num}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Mobile-only compact trust row */}
            <div className="flex sm:hidden gap-4 text-xs text-slate-300">
              <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-blue-400" />Verified</span>
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-blue-400" />No Hidden Fees</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-400" />On-Time</span>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
