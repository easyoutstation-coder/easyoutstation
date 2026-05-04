import { useState, useCallback } from "react";

interface DistanceResult {
  distanceKm: number;
  durationText: string;
  isLoading: boolean;
  error: string | null;
}

export function useDistanceCalculator() {
  const [result, setResult] = useState<DistanceResult>({
    distanceKm: 0,
    durationText: "",
    isLoading: false,
    error: null,
  });

  const calculateDistance = useCallback(async (
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number,
  ) => {
    setResult(r => ({ ...r, isLoading: true, error: null }));

    try {
      // Use Google Maps Distance Matrix API via backend proxy
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
      
      if (apiKey) {
        // Use Google Maps Distance Matrix
        const origin = `${originLat},${originLng}`;
        const destination = `${destLat},${destLng}`;
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&units=metric&key=${apiKey}`;
        
        // Google Distance Matrix has CORS issues from browser, use OSRM as fallback
        throw new Error("Use OSRM");
      }
      throw new Error("Use OSRM");
    } catch {
      // Fallback: Use OSRM (free, no API key needed)
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;
        const res = await fetch(url);
        const data = await res.json();

        if (data.code === "Ok" && data.routes?.[0]) {
          const distanceMeters = data.routes[0].distance;
          const durationSeconds = data.routes[0].duration;
          const distanceKm = Math.round(distanceMeters / 1000);
          const hours = Math.floor(durationSeconds / 3600);
          const minutes = Math.floor((durationSeconds % 3600) / 60);
          const durationText = `~${hours}h ${minutes}m`;

          setResult({ distanceKm, durationText, isLoading: false, error: null });
          return distanceKm;
        }
      } catch {
        // Last fallback: Haversine formula
        const R = 6371;
        const dLat = (destLat - originLat) * Math.PI / 180;
        const dLon = (destLng - originLng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(originLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) *
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distanceKm = Math.round(R * c * 1.3); // 1.3 factor for road distance
        setResult({ distanceKm, durationText: "Estimated", isLoading: false, error: null });
        return distanceKm;
      }
    }
    setResult(r => ({ ...r, isLoading: false, error: "Could not calculate distance" }));
    return 0;
  }, []);

  return { ...result, calculateDistance };
}
