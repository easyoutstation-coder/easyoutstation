import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";

interface AddressAutocompleteProps {
  value: string;
  onChange: (address: string, pincode: string, lat?: number, lng?: number) => void;
  placeholder?: string;
}

declare global {
  interface Window {
    google: any;
    initGoogleMaps: () => void;
  }
}

let googleMapsLoaded = false;
let loadingPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (googleMapsLoaded) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve) => {
    window.initGoogleMaps = () => {
      googleMapsLoaded = true;
      resolve();
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_KEY}&libraries=places&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  });

  return loadingPromise;
}

export default function AddressAutocomplete({ value, onChange, placeholder }: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    loadGoogleMaps().then(() => {
      setIsLoading(false);
      if (!inputRef.current) return;

      autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "in" },
        fields: ["formatted_address", "address_components", "geometry"],
        types: ["address"],
      });

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current.getPlace();
        if (!place.formatted_address) return;

        // Extract pincode from address components
        let pincode = "";
        place.address_components?.forEach((component: any) => {
          if (component.types.includes("postal_code")) {
            pincode = component.long_name;
          }
        });

        const lat = place.geometry?.location?.lat();
        const lng = place.geometry?.location?.lng();

        setInputValue(place.formatted_address);
        onChange(place.formatted_address, pincode, lat, lng);
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
      {isLoading ? (
        <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
      ) : (
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
      )}
      <input
        ref={inputRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={placeholder || "Start typing your address..."}
        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-white text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        disabled={isLoading}
      />
    </div>
  );
}
