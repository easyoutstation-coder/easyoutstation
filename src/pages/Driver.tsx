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
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  }

  if (!driverProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <Car className="w-12 h-12 text-muted-foreground" />
        <p className="text-lg font-semibold">Driver access only</p>
        <p className="text-sm text-muted-foreground text-center">Your phone number is not registered as a driver. Contact EasyOutstation admin.</p>
        <Button variant="outline" onClick={() => navigate("/dashboard")}>Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-600 flex items-center justify-center">
            <Car className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm">{driverProfile.name}</p>
            <p className="text-xs text-muted-foreground">Driver Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={pushEnabled ? "outline" : "default"}
            className="gap-1.5 text-xs"
            onClick={handleEnablePush}
            disabled={pushEnabled || registerFcm.isPending}
          >
            {pushEnabled ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
            {pushEnabled ? "Notifications on" : "Enable notifications"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => navigate("/dashboard")}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <h2 className="text-lg font-semibold">My Assigned Trips</h2>

        {tripsLoading && <p className="text-muted-foreground text-sm">Loading trips…</p>}
        {!tripsLoading && (!myTrips || myTrips.length === 0) && (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No trips assigned yet.</CardContent></Card>
        )}

        {myTrips?.map(trip => {
          const st = getTripState(trip.id);
          const mapPositions: [number, number][] = [
            ...(st.driverLat !== null && st.driverLng !== null ? [[st.driverLat, st.driverLng] as [number, number]] : []),
            ...(st.customerLat !== null && st.customerLng !== null ? [[st.customerLat, st.customerLng] as [number, number]] : []),
          ];

          return (
            <Card key={trip.id} className="overflow-hidden">
              <CardContent className="p-4 space-y-4">
                {/* Trip header */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold">#{trip.id} — {trip.fromCity} → {trip.toCity}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{trip.pickupDate}</span>
                      {trip.customerPhone && (
                        <a href={`tel:+91${trip.customerPhone}`} className="flex items-center gap-1 text-primary hover:underline">
                          <Phone className="w-3.5 h-3.5" />{trip.customerPhone}
                        </a>
                      )}
                    </div>
                    <p className="text-sm mt-0.5">Customer: <strong>{trip.customerName}</strong></p>
                    {trip.pickupAddress && <p className="text-xs text-muted-foreground mt-0.5">Pickup: {trip.pickupAddress}</p>}
                  </div>
                  <Badge className={
                    trip.status === "driver_assigned" ? "bg-teal-100 text-teal-700" :
                    trip.status === "confirmed" ? "bg-green-100 text-green-700" :
                    "bg-blue-100 text-blue-700"
                  }>{trip.status.replace("_", " ")}</Badge>
                </div>

                {/* PIN verification */}
                {!st.pinVerified && (trip.status === "confirmed" || trip.status === "driver_assigned") && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                    <p className="text-sm font-medium text-amber-800">Enter the customer's 6-character trip PIN to activate location sharing</p>
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. A3K9PX"
                        value={st.pinInput}
                        onChange={e => setTripField(trip.id, { pinInput: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })}
                        maxLength={6}
                        className="font-mono tracking-widest text-center uppercase h-9 text-sm flex-1"
                      />
                      <Button
                        size="sm"
                        disabled={st.pinInput.length !== 6 || verifyPin.isPending}
                        onClick={() => handleVerifyPin(trip.id)}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        {verifyPin.isPending ? "…" : "Verify"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Location sharing controls */}
                {st.pinVerified && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {st.eta && (
                        <div className="flex-1 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800">
                          📍 Customer is ~<strong>{st.eta.mins} mins</strong> away ({st.eta.km} km)
                        </div>
                      )}
                      {!st.sharing ? (
                        <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white ml-auto" onClick={() => startSharing(trip.id)}>
                          <Navigation className="w-3.5 h-3.5" />Start Sharing Location
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="gap-1.5 ml-auto border-red-300 text-red-600 hover:bg-red-50" onClick={() => stopSharingTrip(trip.id)}>
                          <MapPin className="w-3.5 h-3.5" />Stop Sharing
                        </Button>
                      )}
                    </div>

                    {st.sharing && st.driverLat !== null && (
                      <div className="rounded-xl overflow-hidden border" style={{ height: 260 }}>
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
                  <div className="flex items-center gap-1.5 text-xs text-green-700">
                    <CheckCircle className="w-3.5 h-3.5" />PIN verified
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
