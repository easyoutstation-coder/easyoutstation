import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { MapPin, Navigation, Bell, BellOff, LogOut, Car, Phone, Calendar, CheckCircle } from "lucide-react";

// Fix Leaflet default icon paths broken by Vite bundling
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const driverIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});
const customerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

function MapFit({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length === 0) return;
    if (positions.length === 1) { map.setView(positions[0], 14); return; }
    map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
  }, [positions.map(p => p.join(",")).join("|")]);
  return null;
}

async function fetchEta(fromLat: number, fromLng: number, toLat: number, toLng: number): Promise<{ mins: number; km: number } | null> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=false`
    );
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return null;
    return { mins: Math.round(route.duration / 60), km: Math.round(route.distance / 100) / 10 };
  } catch { return null; }
}

interface TripState {
  pinInput: string;
  pinVerified: boolean;
  sharing: boolean;
  driverLat: number | null;
  driverLng: number | null;
  customerLat: number | null;
  customerLng: number | null;
  eta: { mins: number; km: number } | null;
}

export default function DriverPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  const isSuperAdmin = (user as any)?.role === "super_admin";
  const { data: driverProfile, isLoading: profileLoading } = trpc.driver.getProfile.useQuery(undefined, { enabled: isAuthenticated });
  const { data: myTrips, isLoading: tripsLoading } = trpc.driver.getMyTrips.useQuery(undefined, { enabled: !!driverProfile });

  const verifyPin = trpc.driver.verifyPin.useMutation();
  const updateLocation = trpc.driver.updateLocation.useMutation();
  const stopSharing = trpc.driver.stopSharing.useMutation();
  const registerFcm = trpc.driver.registerFcmToken.useMutation();

  const [tripStates, setTripStates] = useState<Record<number, TripState>>({});
  const [pushEnabled, setPushEnabled] = useState(false);
  const intervalRefs = useRef<Record<number, ReturnType<typeof setInterval>>>({});

  const getTripState = (bookingId: number): TripState =>
    tripStates[bookingId] ?? { pinInput: "", pinVerified: false, sharing: false, driverLat: null, driverLng: null, customerLat: null, customerLng: null, eta: null };

  const setTripField = (bookingId: number, patch: Partial<TripState>) =>
    setTripStates(s => ({ ...s, [bookingId]: { ...getTripState(bookingId), ...patch } }));

  // Poll customer location for active trips
  useEffect(() => {
    myTrips?.forEach(trip => {
      const st = getTripState(trip.id);
      if (!st.sharing) return;
    });
  }, [myTrips, tripStates]);

  const handleEnablePush = useCallback(async () => {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      toast.error("Push notifications not supported in this browser.");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") { toast.error("Notification permission denied."); return; }

    const vapidKey = import.meta.env.VITE_FCM_VAPID_KEY;
    if (!vapidKey) { toast.error("Push not configured — contact admin."); return; }

    try {
      const sw = await navigator.serviceWorker.ready;
      const sub = await sw.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });
      await registerFcm.mutateAsync({ token: JSON.stringify(sub) });
      setPushEnabled(true);
      toast.success("Push notifications enabled!");
    } catch (e) {
      toast.error("Failed to enable push notifications.");
    }
  }, [registerFcm]);

  const handleVerifyPin = async (bookingId: number) => {
    const st = getTripState(bookingId);
    try {
      await verifyPin.mutateAsync({ bookingId, pin: st.pinInput.trim().toUpperCase() });
      setTripField(bookingId, { pinVerified: true });
      toast.success("PIN verified! You can now share your location.");
    } catch (e: any) {
      toast.error(e?.message ?? "Incorrect PIN.");
    }
  };

  const startSharing = (bookingId: number) => {
    if (!navigator.geolocation) { toast.error("Geolocation not supported."); return; }

    const sendLocation = () => {
      navigator.geolocation.getCurrentPosition(async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setTripField(bookingId, { driverLat: lat, driverLng: lng, sharing: true });
        await updateLocation.mutateAsync({ bookingId, lat, lng }).catch(() => {});

        // Also fetch customer location from Redis via a direct API (we'll poll via tRPC)
        // and compute ETA
      }, () => {});
    };

    sendLocation();
    intervalRefs.current[bookingId] = setInterval(sendLocation, 30_000);
    setTripField(bookingId, { sharing: true });
    toast.success("Location sharing started.");
  };

  const stopSharingTrip = async (bookingId: number) => {
    clearInterval(intervalRefs.current[bookingId]);
    delete intervalRefs.current[bookingId];
    await stopSharing.mutateAsync({ bookingId }).catch(() => {});
    setTripField(bookingId, { sharing: false, driverLat: null, driverLng: null, eta: null });
    toast("Location sharing stopped.");
  };

  // Cleanup intervals on unmount
  useEffect(() => () => { Object.values(intervalRefs.current).forEach(clearInterval); }, []);

  if (isLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-[#050e1a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Car className="w-5 h-5 text-white" />
          </div>
          <p className="text-slate-400 text-sm">Loading driver portal…</p>
        </div>
      </div>
    );
  }

  if (!driverProfile && !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-[#050e1a] flex flex-col items-center justify-center gap-4 p-6">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Car className="w-8 h-8 text-slate-500" />
        </div>
        <p className="text-xl font-bold text-white font-['DM_Serif_Display']">Driver Access Only</p>
        <p className="text-sm text-slate-400 text-center max-w-xs">Your phone number is not registered as a driver. Contact EasyOutstation admin.</p>
        <button onClick={() => navigate("/dashboard")} className="mt-2 px-6 py-2.5 rounded-xl border border-white/15 text-slate-300 hover:bg-white/5 text-sm transition-all">
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="dark-panel min-h-screen bg-[#050e1a] relative">
      {/* Gradient orbs */}
      <div className="fixed top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-blue-600/8 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full bg-violet-600/8 blur-[100px] pointer-events-none" />
      {/* Dot grid */}
      <div className="fixed inset-0 opacity-[0.025] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* Admin preview banner */}
      {isSuperAdmin && !driverProfile && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs text-amber-400 font-medium">
          Admin Preview Mode — this is how drivers see the portal
        </div>
      )}

      {/* Header */}
      <div className="relative bg-[#050e1a]/80 backdrop-blur-xl border-b border-white/8 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-900/40 shrink-0">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{driverProfile?.name ?? (isSuperAdmin ? "Admin Preview" : "")}</p>
            <p className="text-xs text-slate-500">Driver Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleEnablePush}
            disabled={pushEnabled || registerFcm.isPending}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${pushEnabled ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10"}`}
          >
            {pushEnabled ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{pushEnabled ? "Alerts on" : "Enable alerts"}</span>
          </button>
          <button onClick={() => navigate("/dashboard")} className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="relative max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between py-2">
          <h2 className="text-lg font-bold text-white font-['DM_Serif_Display']">My Assigned Trips</h2>
          {myTrips && myTrips.length > 0 && (
            <span className="text-xs text-slate-500">{myTrips.length} trip{myTrips.length !== 1 ? "s" : ""}</span>
          )}
        </div>

        {tripsLoading && (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="dp-card p-4 h-28 animate-pulse" />)}
          </div>
        )}
        {!tripsLoading && (!myTrips || myTrips.length === 0) && (
          <div className="dp-card p-10 text-center">
            <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">No trips assigned yet.</p>
          </div>
        )}

        {myTrips?.map((trip, idx) => {
          const st = getTripState(trip.id);
          const mapPositions: [number, number][] = [
            ...(st.driverLat !== null && st.driverLng !== null ? [[st.driverLat, st.driverLng] as [number, number]] : []),
            ...(st.customerLat !== null && st.customerLng !== null ? [[st.customerLat, st.customerLng] as [number, number]] : []),
          ];

          const statusStyle =
            trip.status === "driver_assigned" ? "bg-teal-500/15 text-teal-300 border-teal-500/20" :
            trip.status === "confirmed" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/20" :
            "bg-blue-500/15 text-blue-300 border-blue-500/20";

          return (
            <div key={trip.id} className="dp-card overflow-hidden" style={{ animationDelay: `${idx * 60}ms` }}>
              <div className="p-4 space-y-4">
                {/* Trip header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">#{trip.id} — {trip.fromCity} → {trip.toCity}</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />{trip.pickupDate}
                      </span>
                      {trip.customerPhone && (
                        <a href={`tel:+91${trip.customerPhone}`} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors">
                          <Phone className="w-3.5 h-3.5" />{trip.customerPhone}
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-slate-300 mt-1">Customer: <span className="text-white font-medium">{trip.customerName}</span></p>
                    {trip.pickupAddress && <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{trip.pickupAddress}</p>}
                  </div>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${statusStyle}`}>
                    {trip.status.replace("_", " ")}
                  </span>
                </div>

                {/* PIN verification */}
                {!st.pinVerified && (trip.status === "confirmed" || trip.status === "driver_assigned") && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 space-y-2">
                    <p className="text-sm font-medium text-amber-300">Enter the customer's 6-character trip PIN to activate location sharing</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. A3K9PX"
                        value={st.pinInput}
                        onChange={e => setTripField(trip.id, { pinInput: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
                        maxLength={6}
                        className="font-mono tracking-widest text-center uppercase h-9 text-sm flex-1"
                      />
                      <button
                        disabled={st.pinInput.length !== 6 || verifyPin.isPending}
                        onClick={() => handleVerifyPin(trip.id)}
                        className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-all disabled:opacity-50"
                      >
                        {verifyPin.isPending ? "…" : "Verify"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Location sharing controls */}
                {st.pinVerified && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {st.eta && (
                        <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 text-sm text-emerald-300">
                          📍 Customer is ~<strong>{st.eta.mins} mins</strong> away ({st.eta.km} km)
                        </div>
                      )}
                      {!st.sharing ? (
                        <button onClick={() => startSharing(trip.id)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm font-medium hover:bg-emerald-500/30 transition-all ml-auto">
                          <Navigation className="w-3.5 h-3.5" />Start Sharing Location
                        </button>
                      ) : (
                        <button onClick={() => stopSharingTrip(trip.id)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/20 transition-all ml-auto">
                          <MapPin className="w-3.5 h-3.5" />Stop Sharing
                        </button>
                      )}
                    </div>

                    {st.sharing && st.driverLat !== null && (
                      <div className="rounded-xl overflow-hidden border border-white/8" style={{ height: 260 }}>
                        <MapContainer center={[st.driverLat!, st.driverLng!]} zoom={14} style={{ height: "100%", width: "100%" }} zoomControl={false}>
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap contributors' />
                          <MapFit positions={mapPositions} />
                          <Marker position={[st.driverLat!, st.driverLng!]} icon={driverIcon}>
                            <Popup>You (driver)</Popup>
                          </Marker>
                          {st.customerLat !== null && st.customerLng !== null && (
                            <Marker position={[st.customerLat!, st.customerLng!]} icon={customerIcon}>
                              <Popup>{trip.customerName}</Popup>
                            </Marker>
                          )}
                        </MapContainer>
                      </div>
                    )}
                  </div>
                )}

                {/* PIN verified badge */}
                {st.pinVerified && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <CheckCircle className="w-3.5 h-3.5" />PIN verified — location sharing active
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
