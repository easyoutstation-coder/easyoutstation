import { useState, useRef, useEffect } from "react";
import { MapPin, Loader2 } from "lucide-react";

// Shared Google Maps loader
let mapsLoaded = false;
let mapsLoadingPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (mapsLoaded) return Promise.resolve();
  if (mapsLoadingPromise) return mapsLoadingPromise;
  // If already loaded by HeroSection
  if (window.google?.maps?.places) { mapsLoaded = true; return Promise.resolve(); }
  mapsLoadingPromise = new Promise((resolve) => {
    if (window.initGoogleMaps) {
      // Already being loaded
      const orig = window.initGoogleMaps;
      window.initGoogleMaps = () => { orig(); mapsLoaded = true; resolve(); };
    } else {
      window.initGoogleMaps = () => { mapsLoaded = true; resolve(); };
      const script = document.createElement("script");
      const key = import.meta.env.VITE_GOOGLE_MAPS_KEY;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places,geometry&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });
  return mapsLoadingPromise;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, pincode: string, lat?: number, lng?: number) => void;
  placeholder?: string;
}

export default function AddressAutocomplete({ value, onChange, placeholder }: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [inputValue, setInputValue] = useState(value);
  const [isLoading, setIsLoading] = useState(true);

  // Sync external value changes
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    loadGoogleMaps().then(() => {
      setIsLoading(false);
      if (!inputRef.current) return;
      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "in" },
        fields: ["formatted_address", "geometry", "address_components", "name"],
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

        setInputValue(address);
        onChange(address, pincode, lat, lng);
      });
    });

    return () => {
      if (autocompleteRef.current) {
        window.google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  return (
    <div className="relative">
      <div className="relative">
        {isLoading
          ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
          : <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
        }
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder || "Start typing your address..."}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
          autoComplete="off"
        />
      </div>
    </div>
  );
}
