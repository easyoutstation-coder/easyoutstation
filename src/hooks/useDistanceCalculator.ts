import { useState, useCallback } from "react";

interface DistanceResult {
  distanceKm: number;
  durationText: string;
  isLoading: boolean;
  error: string | null;
}

// Module-level cache: survives re-renders and component remounts within the same session
const sessionCache = new Map<string, { distanceKm: number; durationText: string }>();

const CACHE_KEY_PREFIX = "eo_dist:";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function cacheKey(lat1: number, lng1: number, lat2: number, lng2: number): string {
  // Round to 2dp — ~1km precision, collapses near-identical lookups
  return `${lat1.toFixed(2)},${lng1.toFixed(2)},${lat2.toFixed(2)},${lng2.toFixed(2)}`;
}

function readLocalCache(key: string): { distanceKm: number; durationText: string } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!raw) return null;
    const { value, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) { localStorage.removeItem(CACHE_KEY_PREFIX + key); return null; }
    return value;
  } catch { return null; }
}

function writeLocalCache(key: string, value: { distanceKm: number; durationText: string }): void {
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({ value, expiresAt: Date.now() + CACHE_TTL_MS }));
  } catch { /* localStorage full — skip */ }
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
    const key = cacheKey(originLat, originLng, destLat, destLng);

    // Layer 1: in-session memory cache
    const mem = sessionCache.get(key);
    if (mem) {
      setResult({ ...mem, isLoading: false, error: null });
      return mem.distanceKm;
    }

    // Layer 2: localStorage with 30-day TTL
    const stored = readLocalCache(key);
    if (stored) {
      sessionCache.set(key, stored);
      setResult({ ...stored, isLoading: false, error: null });
      return stored.distanceKm;
    }

    setResult(r => ({ ...r, isLoading: true, error: null }));

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.code === "Ok" && data.routes?.[0]) {
        const distanceKm = Math.round(data.routes[0].distance / 1000);
        const durationSeconds = data.routes[0].duration;
        const hours = Math.floor(durationSeconds / 3600);
        const minutes = Math.floor((durationSeconds % 3600) / 60);
        const durationText = `~${hours}h ${minutes}m`;
        const cached = { distanceKm, durationText };
        sessionCache.set(key, cached);
        writeLocalCache(key, cached);
        setResult({ distanceKm, durationText, isLoading: false, error: null });
        return distanceKm;
      }
    } catch { /* fall through to Haversine */ }

    // Last fallback: Haversine formula
    const R = 6371;
    const dLat = (destLat - originLat) * Math.PI / 180;
    const dLon = (destLng - originLng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(originLat * Math.PI / 180) * Math.cos(destLat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const distanceKm = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.3);
    const cached = { distanceKm, durationText: "Estimated" };
    sessionCache.set(key, cached);
    writeLocalCache(key, cached);
    setResult({ distanceKm, durationText: "Estimated", isLoading: false, error: null });
    return distanceKm;
  }, []);

  return { ...result, calculateDistance };
}
