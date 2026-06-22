import { useSeo } from "@/hooks/useSeo";
import { useNavigate } from "react-router";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  LayoutDashboard,
  Calendar,
  MapPin,
  Car,
  ChevronRight,
  User,
  Mail,
  Search,
  TrendingUp,
  Pencil,
  Check,
  X,
  Gift,
  Copy,
  Share2,
  Clock,
  CheckCircle,
  Star,
  Navigation,
  KeyRound,
} from "lucide-react";

// Fix Leaflet default marker icons broken by Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
const driverMapIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});
const customerMapIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

function MapFitter({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (!positions.length) return;
    if (positions.length === 1) { map.setView(positions[0], 14); return; }
    map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
  }, [positions.map(p => p.join(",")).join("|")]);
  return null;
}

async function getOsrmEta(fLat: number, fLng: number, tLat: number, tLng: number) {
  try {
    const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${fLng},${fLat};${tLng},${tLat}?overview=false`);
    const d = await r.json();
    const route = d?.routes?.[0];
    if (!route) return null;
    return { mins: Math.round(route.duration / 60), km: Math.round(route.distance / 100) / 10 };
  } catch { return null; }
}

function LiveTrackingSection({ bookingId, driverName }: { bookingId: number; driverName?: string | null }) {
  const [sharing, setSharing] = useState(false);
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLng, setMyLng] = useState<number | null>(null);
  const [eta, setEta] = useState<{ mins: number; km: number } | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const { data: driverLoc, refetch: refetchDriver } = trpc.booking.getDriverLocation.useQuery(
    { bookingId },
    { refetchInterval: 30_000 }
  );
  const updateMyLoc = trpc.booking.updateCustomerLocation.useMutation();
  const stopMySharing = trpc.booking.stopCustomerSharing.useMutation();

  useEffect(() => {
    if (!driverLoc || myLat === null || myLng === null) { setEta(null); return; }
    getOsrmEta(driverLoc.lat, driverLoc.lng, myLat, myLng).then(setEta);
  }, [driverLoc?.lat, driverLoc?.lng, myLat, myLng]);

  const startSharing = () => {
    if (!navigator.geolocation) return;
    const send = () => navigator.geolocation.getCurrentPosition(pos => {
      setMyLat(pos.coords.latitude);
      setMyLng(pos.coords.longitude);
      updateMyLoc.mutate({ bookingId, lat: pos.coords.latitude, lng: pos.coords.longitude });
    });
    send();
    intervalRef.current = setInterval(send, 30_000);
    setSharing(true);
  };

  const stopSharing = () => {
    clearInterval(intervalRef.current);
    stopMySharing.mutate({ bookingId });
    setSharing(false);
    setMyLat(null);
    setMyLng(null);
    setEta(null);
  };

  useEffect(() => () => clearInterval(intervalRef.current), []);

  const mapPositions: [number, number][] = [
    ...(driverLoc ? [[driverLoc.lat, driverLoc.lng] as [number, number]] : []),
    ...(myLat !== null && myLng !== null ? [[myLat, myLng] as [number, number]] : []),
  ];

  return (
    <div className="mt-3 space-y-2">
      {/* ETA banner */}
      {driverLoc && eta && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800 flex items-center gap-2">
          <Navigation className="w-3.5 h-3.5 shrink-0" />
          <span>Driver is ~<strong>{eta.mins} mins</strong> away ({eta.km} km)</span>
        </div>
      )}
      {driverLoc && !eta && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-800 flex items-center gap-2">
          <Navigation className="w-3.5 h-3.5 shrink-0 animate-pulse" />
          <span>Driver is sharing live location</span>
        </div>
      )}

      {/* Location sharing toggle */}
      <div className="flex items-center gap-2">
        {!sharing ? (
          <Button size="sm" variant="outline" className="text-xs gap-1.5" onClick={startSharing}>
            <MapPin className="w-3 h-3" />Share my location with driver
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="text-xs gap-1.5 border-red-200 text-red-600 hover:bg-red-50" onClick={stopSharing}>
            <X className="w-3 h-3" />Stop sharing location
          </Button>
        )}
      </div>

      {/* Live map */}
      {(driverLoc || (myLat !== null)) && (
        <div className="rounded-xl overflow-hidden border" style={{ height: 220 }}>
          <MapContainer
            center={driverLoc ? [driverLoc.lat, driverLoc.lng] : [myLat!, myLng!]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            zoomControl={false}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
            <MapFitter positions={mapPositions} />
            {driverLoc && (
              <Marker position={[driverLoc.lat, driverLoc.lng]} icon={driverMapIcon}>
                <Popup>{driverName ?? "Your driver"} 🚗</Popup>
              </Marker>
            )}
            {myLat !== null && myLng !== null && (
              <Marker position={[myLat, myLng]} icon={customerMapIcon}>
                <Popup>Your location 📍</Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  useSeo({ title: "My Bookings | EasyOutstation", description: "View and manage your EasyOutstation cab bookings.", noindex: true });
  const navigate = useNavigate();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const { user, isAuthenticated, isLoading: authLoading, refresh } = useAuth({
    redirectOnUnauthenticated: true,
  });

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => { setEditingName(false); refresh(); },
  });

  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const utils = trpc.useUtils();
  const submitReviewMutation = trpc.review.submit.useMutation({
    onSuccess: () => {
      setReviewBookingId(null);
      setReviewRating(0);
      setReviewComment("");
      utils.booking.getMyBookings.invalidate();
    },
  });

  const [referralCopied, setReferralCopied] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");
  const applyCodeMutation = trpc.referral.applyReferralCode.useMutation({
    onSuccess: () => { setCodeInput(""); setCodeError(""); },
    onError: (e) => setCodeError(e.message),
  });

  const { data: bookings, isLoading: bookingsLoading } = trpc.booking.getMyBookings.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: recentSearches } = trpc.search.getRecent.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: referralCode } = trpc.referral.getMyCode.useQuery(undefined, { enabled: isAuthenticated });
  const { data: referralStats } = trpc.referral.getMyStats.useQuery(undefined, { enabled: isAuthenticated });
  const { data: referralProgram } = trpc.referral.getProgram.useQuery();

  const referralLink = referralCode?.code
    ? `https://easyoutstation.com/referral?ref=${referralCode.code}`
    : "";

  const handleCopyReferral = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink).then(() => {
      setReferralCopied(true);
      setTimeout(() => setReferralCopied(false), 2000);
    });
  };

  const handleShareReferral = async () => {
    if (!referralLink) return;
    const text = `Book your outstation cab with EasyOutstation and get ₹100 off! Fixed fares, verified drivers. Use my referral link: ${referralLink}`;
    if (navigator.share) {
      await navigator.share({ title: "EasyOutstation — ₹100 off!", text, url: referralLink });
    } else {
      handleCopyReferral();
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const upcomingBookings = bookings?.filter((b) => b.status === "pending" || b.status === "confirmed") || [];
  const pastBookings = bookings?.filter((b) => b.status === "completed" || b.status === "cancelled") || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="pt-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">

          {/* Mobile profile header — visible only on mobile */}
          <div className="lg:hidden mb-5">
            <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-3 border">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                {editingName ? (
                  <div className="flex items-center gap-1">
                    <Input value={nameInput} onChange={e => setNameInput(e.target.value)}
                      className="h-7 text-sm px-2" autoFocus
                      onKeyDown={e => {
                        if (e.key === "Enter" && nameInput.trim()) updateProfileMutation.mutate({ name: nameInput.trim() });
                        if (e.key === "Escape") setEditingName(false);
                      }} />
                    <button onClick={() => { if (nameInput.trim()) updateProfileMutation.mutate({ name: nameInput.trim() }); }} className="text-green-600"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingName(false)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <p className="font-semibold text-sm truncate">{user?.name || "Guest"}</p>
                    <button onClick={() => { setNameInput(user?.name || ""); setEditingName(true); }} className="text-muted-foreground shrink-0">
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground truncate">{user?.email || user?.phone || ""}</p>
              </div>
              <Button size="sm" variant="outline" className="shrink-0 text-xs gap-1" onClick={() => navigate("/")}>
                <Search className="w-3 h-3" />Book
              </Button>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar — desktop only */}
            <div className="hidden lg:block lg:col-span-1">
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingName ? (
                        <div className="flex items-center gap-1">
                          <Input value={nameInput} onChange={e => setNameInput(e.target.value)}
                            className="h-7 text-sm px-2" autoFocus
                            onKeyDown={e => {
                              if (e.key === "Enter" && nameInput.trim()) updateProfileMutation.mutate({ name: nameInput.trim() });
                              if (e.key === "Escape") setEditingName(false);
                            }} />
                          <button onClick={() => { if (nameInput.trim()) updateProfileMutation.mutate({ name: nameInput.trim() }); }} className="text-green-600 hover:text-green-700"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setEditingName(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <h3 className="font-semibold truncate">{user?.name || "Guest"}</h3>
                          <button onClick={() => { setNameInput(user?.name || ""); setEditingName(true); }} className="text-muted-foreground hover:text-primary shrink-0">
                            <Pencil className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground truncate">{user?.email || user?.phone || ""}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-primary/10 text-primary text-sm font-medium">
                      <LayoutDashboard className="w-4 h-4" />Dashboard
                    </button>
                    <button onClick={() => navigate("/cars")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
                      <Car className="w-4 h-4" />Browse Cars
                    </button>
                    <button onClick={() => navigate("/")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
                      <Search className="w-4 h-4" />Search Rides
                    </button>
                    <button onClick={() => navigate("/referral")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
                      <Gift className="w-4 h-4" />Refer & Earn
                    </button>
                  </div>
                  <div className="mt-6 pt-6 border-t">
                    <div className="text-xs text-muted-foreground mb-2">Contact</div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />easyoutstation@gmail.com
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-5">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="text-xl sm:text-2xl font-bold text-foreground">{upcomingBookings.length}</div>
                    <div className="text-xs text-muted-foreground">Upcoming Trips</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="text-xl sm:text-2xl font-bold text-foreground">{pastBookings.length}</div>
                    <div className="text-xs text-muted-foreground">Completed Trips</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="text-xl sm:text-2xl font-bold text-foreground">{recentSearches?.length || 0}</div>
                    <div className="text-xs text-muted-foreground">Searches</div>
                  </CardContent>
                </Card>
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="p-3 sm:p-4">
                    <div className="text-xl sm:text-2xl font-bold text-amber-700">₹{referralStats?.balance ?? 0}</div>
                    <div className="text-xs text-amber-600">Credits</div>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="bookings">
                <TabsList className="w-full">
                  <TabsTrigger value="bookings" className="flex-1">My Bookings</TabsTrigger>
                  <TabsTrigger value="searches" className="flex-1">Recent Searches</TabsTrigger>
                  <TabsTrigger value="referrals" className="flex-1">
                    <Gift className="w-3.5 h-3.5 mr-1.5" />
                    Refer & Earn
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="bookings" className="space-y-4">
                  {bookingsLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                    </div>
                  ) : bookings && bookings.length > 0 ? (
                    bookings.map((booking) => (
                      <Card key={booking.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          {/* Card top: image + info side by side on all screen sizes */}
                          <div className="flex gap-3">
                            <div className="w-20 h-20 sm:w-28 sm:h-24 rounded-xl overflow-hidden bg-muted shrink-0">
                              <img
                                src={booking.car?.imageUrl || "/cars/toyota-innova.jpg"}
                                alt={booking.car?.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <div className="min-w-0">
                                  <h4 className="font-semibold text-sm truncate">{booking.car?.name || "Car Rental"}</h4>
                                  <p className="text-xs text-muted-foreground truncate">{booking.fromCity} → {booking.toCity}</p>
                                </div>
                                <Badge className={`shrink-0 text-xs border-0 ${
                                    booking.status === "confirmed" ? "bg-green-100 text-green-700" :
                                    booking.status === "driver_assigned" ? "bg-teal-100 text-teal-700" :
                                    booking.status === "pending" ? "bg-amber-100 text-amber-700" :
                                    booking.status === "cancelled" ? "bg-red-100 text-red-700" :
                                    "bg-slate-100 text-slate-700"}`}>
                                  {booking.status === "driver_assigned" ? "Driver Assigned" : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 shrink-0" />
                                  {new Date(booking.pickupDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                </span>
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{booking.totalKm} km</span>
                                <span className="flex items-center gap-1 capitalize"><Car className="w-3 h-3" />{booking.tripType.replace("_", " ")}</span>
                              </div>
                            </div>
                          </div>

                          {/* Trip PIN */}
                          {(booking.status === "confirmed" || booking.status === "driver_assigned") && (booking as any).tripPin && (
                            <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                              <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-xs text-amber-800">Trip PIN: </span>
                                <strong className="font-mono tracking-widest text-sm text-amber-900">{(booking as any).tripPin}</strong>
                                <span className="text-xs text-amber-600 ml-1.5 hidden sm:inline">— share with your driver</span>
                              </div>
                            </div>
                          )}

                          {/* Bottom row: price + actions */}
                          <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-bold text-primary text-base">
                              ₹{parseFloat(booking.totalPrice.toString()).toLocaleString("en-IN")}
                            </span>
                            <div className="flex items-center gap-2">
                              {booking.status === "completed" && !(booking as any).hasReview && (
                                <Button size="sm" variant="outline"
                                  onClick={() => { setReviewBookingId(booking.id); setReviewRating(0); setReviewComment(""); }}
                                  className="text-xs h-8 border-amber-300 text-amber-700 hover:bg-amber-50">
                                  <Star className="w-3 h-3 mr-1" />Rate
                                </Button>
                              )}
                              {booking.status === "completed" && (booking as any).hasReview && (
                                <span className="text-xs text-green-600 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" />Reviewed
                                </span>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => navigate(`/booking/${booking.id}`)} className="text-xs h-8">
                                Details<ChevronRight className="w-3 h-3 ml-0.5" />
                              </Button>
                            </div>
                          </div>
                          {/* Live tracking for confirmed/driver_assigned bookings */}
                          {(booking.status === "confirmed" || booking.status === "driver_assigned") && (
                            <LiveTrackingSection
                              bookingId={booking.id}
                              driverName={(booking as any).driverName}
                            />
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Car className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-1">No bookings yet</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Start exploring and book your first ride!
                        </p>
                        <Button onClick={() => navigate("/cars")} className="bg-primary hover:bg-primary/90">
                          Browse Cars
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="searches" className="space-y-4">
                  {recentSearches && recentSearches.length > 0 ? (
                    recentSearches.map((search, i) => (
                      <Card key={i} className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/cars?from=${search.fromCity}&to=${search.toCity}`)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <TrendingUp className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <h4 className="font-medium">
                                  {search.fromCity} → {search.toCity}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  {search.passengerCount} passengers • {new Date(search.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-1">No recent searches</h3>
                        <p className="text-sm text-muted-foreground">
                          Your search history will appear here
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* ── Referrals Tab ──────────────────────────────── */}
                <TabsContent value="referrals" className="space-y-5">
                  {referralProgram && !referralProgram.enabled ? (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <Gift className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="font-semibold mb-1">Referral Program Paused</h3>
                        <p className="text-sm text-muted-foreground">The referral program is currently inactive. Check back soon!</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <>
                      {/* Referral link card */}
                      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                              <Gift className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-900">Your Referral Link</h3>
                              <p className="text-xs text-slate-500">Share and earn ₹100 for every friend who completes their first ride</p>
                            </div>
                          </div>
                          {referralLink ? (
                            <>
                              <div className="flex items-center gap-2 bg-white border border-blue-200 rounded-xl px-4 py-3 mb-4">
                                <span className="text-sm text-slate-700 truncate flex-1">{referralLink}</span>
                                <button onClick={handleCopyReferral} className="text-blue-600 hover:text-blue-800 shrink-0">
                                  {referralCopied ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </button>
                              </div>
                              <div className="flex gap-3">
                                <Button onClick={handleCopyReferral} variant="outline" className="flex-1 text-sm">
                                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                                  {referralCopied ? "Copied!" : "Copy Link"}
                                </Button>
                                <Button onClick={handleShareReferral} className="flex-1 bg-blue-600 hover:bg-blue-700 text-sm">
                                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                                  Share
                                </Button>
                              </div>
                              <p className="text-xs text-slate-400 mt-3 text-center">
                                Your code: <span className="font-mono font-semibold text-slate-600">{referralCode?.code}</span>
                              </p>
                            </>
                          ) : (
                            <div className="animate-pulse bg-slate-100 h-10 rounded-xl" />
                          )}
                        </CardContent>
                      </Card>

                      {/* Apply a referral code */}
                      {!referralStats?.hasBeenReferred && (
                        <Card className="border-amber-200 bg-amber-50/50">
                          <CardContent className="p-5">
                            <div className="flex items-center gap-2 mb-3">
                              <Gift className="w-4 h-4 text-amber-600" />
                              <h4 className="font-semibold text-sm text-slate-800">Have a referral code?</h4>
                              <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-medium">One-time use</span>
                            </div>
                            <p className="text-xs text-slate-500 mb-3">Enter a friend's referral code. You'll both earn ₹100 credit after your first completed ride.</p>
                            {applyCodeMutation.isSuccess ? (
                              <div className="flex items-center gap-2 text-green-700 text-sm font-medium bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                Referral code applied! Credits will be added after your first completed ride.
                              </div>
                            ) : (
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={codeInput}
                                  onChange={e => { setCodeInput(e.target.value.toUpperCase()); setCodeError(""); }}
                                  placeholder="e.g. EOAB1234"
                                  maxLength={20}
                                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => { if (codeInput.length >= 6) applyCodeMutation.mutate({ code: codeInput }); }}
                                  disabled={codeInput.length < 6 || applyCodeMutation.isPending}
                                  className="bg-amber-500 hover:bg-amber-600 text-white shrink-0"
                                >
                                  {applyCodeMutation.isPending ? "Applying…" : "Apply"}
                                </Button>
                              </div>
                            )}
                            {codeError && <p className="text-xs text-red-500 mt-2">{codeError}</p>}
                          </CardContent>
                        </Card>
                      )}
                      {referralStats?.hasBeenReferred && (
                        <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                          <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
                          You've already applied a referral code — credits will be added after your first completed ride.
                        </div>
                      )}

                      {/* Points balance */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Card className="border-amber-200 bg-amber-50/50">
                          <CardContent className="p-4 flex sm:block items-center justify-between">
                            <div className="text-xs text-muted-foreground sm:mb-1">Credits Available</div>
                            <div className="text-2xl font-bold text-amber-700">₹{referralStats?.balance ?? 0}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 flex sm:block items-center justify-between">
                            <div className="text-xs text-muted-foreground sm:mb-1">Friends Referred</div>
                            <div className="text-2xl font-bold text-foreground">{referralStats?.referrals.length ?? 0}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 flex sm:block items-center justify-between">
                            <div className="text-xs text-muted-foreground sm:mb-1">Rides Rewarded</div>
                            <div className="text-2xl font-bold text-foreground">
                              {referralStats?.referrals.filter(r => r.status === "points_allocated").length ?? 0}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Points history */}
                      {referralStats?.pointsHistory && referralStats.pointsHistory.length > 0 && (
                        <Card>
                          <CardContent className="p-5">
                            <h4 className="font-semibold text-sm mb-4">Credit History</h4>
                            <div className="space-y-3">
                              {referralStats.pointsHistory.map((p: any) => {
                                const expired = new Date(p.expiresAt) < new Date();
                                const isActive = p.status === "active" && !expired;
                                return (
                                  <div key={p.id} className="flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isActive ? "bg-green-100" : "bg-slate-100"}`}>
                                        {isActive ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Clock className="w-4 h-4 text-slate-400" />}
                                      </div>
                                      <div>
                                        <div className="font-medium">₹{p.amount} referral credit</div>
                                        <div className="text-xs text-muted-foreground">
                                          {isActive ? `Expires ${new Date(p.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : p.status}
                                        </div>
                                      </div>
                                    </div>
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${isActive ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                                      {isActive ? "Active" : p.status}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Referral list */}
                      {referralStats?.referrals && referralStats.referrals.length > 0 ? (
                        <Card>
                          <CardContent className="p-5">
                            <h4 className="font-semibold text-sm mb-4">Your Referrals</h4>
                            <div className="space-y-3">
                              {referralStats.referrals.map((r: any) => (
                                <div key={r.id} className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                      <span className="text-xs font-bold text-blue-700">{r.referredName.charAt(0)}</span>
                                    </div>
                                    <div>
                                      <div className="text-sm font-medium">{r.referredName}</div>
                                      <div className="text-xs text-muted-foreground">
                                        Joined {new Date(r.joinedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                      </div>
                                    </div>
                                  </div>
                                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                                    r.status === "points_allocated" ? "bg-green-100 text-green-700" :
                                    r.status === "ride_completed" ? "bg-blue-100 text-blue-700" :
                                    "bg-amber-100 text-amber-700"
                                  }`}>
                                    {r.status === "points_allocated" ? "Rewarded" :
                                     r.status === "ride_completed" ? "Ride Done" : "Pending Ride"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <Card>
                          <CardContent className="p-8 text-center">
                            <Gift className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                            <h3 className="font-semibold mb-1">No referrals yet</h3>
                            <p className="text-sm text-muted-foreground mb-4">Share your link to start earning ₹100 per friend.</p>
                            <Button onClick={handleShareReferral} size="sm" className="bg-blue-600 hover:bg-blue-700">
                              <Share2 className="w-3.5 h-3.5 mr-1.5" />
                              Share Your Link
                            </Button>
                          </CardContent>
                        </Card>
                      )}

                      <p className="text-xs text-center text-muted-foreground">
                        Credits expire 90 days from the date they are added. Valid on any completed booking.{" "}
                        <button onClick={() => navigate("/referral")} className="underline">Learn more</button>
                      </p>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      <Dialog open={reviewBookingId !== null} onOpenChange={(open) => { if (!open) setReviewBookingId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Rate Your Trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <p className="text-sm text-muted-foreground mb-3">How was your experience?</p>
              <div className="flex gap-2 justify-center">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    onMouseEnter={() => setReviewHover(star)}
                    onMouseLeave={() => setReviewHover(0)}
                    className="text-3xl transition-transform hover:scale-110"
                  >
                    <Star
                      className={`w-8 h-8 ${(reviewHover || reviewRating) >= star ? "fill-amber-400 text-amber-400" : "text-slate-300"}`}
                    />
                  </button>
                ))}
              </div>
              {reviewRating > 0 && (
                <p className="text-center text-sm text-muted-foreground mt-1">
                  {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][reviewRating]}
                </p>
              )}
            </div>
            <Textarea
              placeholder="Share your experience (optional)"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              className="resize-none"
              rows={3}
              maxLength={500}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setReviewBookingId(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={reviewRating === 0 || submitReviewMutation.isPending}
                onClick={() => {
                  if (!reviewBookingId || reviewRating === 0) return;
                  submitReviewMutation.mutate({
                    bookingId: reviewBookingId,
                    rating: reviewRating,
                    comment: reviewComment || undefined,
                  });
                }}
              >
                {submitReviewMutation.isPending ? "Submitting..." : "Submit Review"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
