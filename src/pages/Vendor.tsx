import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Truck, Users, Phone, MapPin, Calendar, Car, CheckCircle, XCircle,
  LogOut, RefreshCw,
} from "lucide-react";

type BookingStatus = "pending" | "confirmed" | "driver_assigned" | "completed" | "cancelled";

const statusColors: Record<BookingStatus, string> = {
  pending: "bg-amber-500/15 text-amber-300 border border-amber-500/20",
  confirmed: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
  driver_assigned: "bg-teal-500/15 text-teal-300 border border-teal-500/20",
  completed: "bg-blue-500/15 text-blue-300 border border-blue-500/20",
  cancelled: "bg-red-500/15 text-red-300 border border-red-500/20",
};

function fmt(d: Date | string | null) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function Vendor() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Record<number, string>>({});
  const [rejectReason, setRejectReason] = useState<Record<number, string>>({});

  const isSuperAdmin = (user as any)?.role === "super_admin";
  const { data: profile, isLoading: profileLoading } = trpc.vendor.getProfile.useQuery();
  const { data: myDrivers } = trpc.vendor.getMyDrivers.useQuery(undefined, { enabled: !!profile });
  const { data: myTrips, refetch: refetchTrips } = trpc.vendor.getMyTrips.useQuery(undefined, { enabled: !!profile });

  const confirmTrip = trpc.vendor.confirmTrip.useMutation({
    onSuccess: (data) => {
      toast.success(`Trip confirmed with driver ${data.driverName}`);
      setConfirmingId(null);
      refetchTrips();
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectTrip = trpc.vendor.rejectTrip.useMutation({
    onSuccess: () => {
      toast.success("Trip flagged — admin will reassign");
      refetchTrips();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!user) {
    return (
      <div className="dark-panel min-h-screen bg-[#050e1a] flex items-center justify-center p-4">
        <div className="dp-card p-8 text-center space-y-4 w-full max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/30 to-violet-500/20 border border-blue-500/20 flex items-center justify-center mx-auto">
            <Truck className="w-7 h-7 text-blue-400" />
          </div>
          <h2 className="text-lg font-semibold text-white">Vendor Portal</h2>
          <p className="text-sm text-slate-400">Please log in to access the vendor portal.</p>
          <Button className="w-full bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 border-0 text-white" onClick={() => navigate("/login")}>Log In</Button>
        </div>
      </div>
    );
  }

  if (profileLoading) {
    return (
      <div className="dark-panel min-h-screen bg-[#050e1a] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-violet-500/10 border border-white/8 flex items-center justify-center mx-auto animate-pulse">
            <Truck className="w-6 h-6 text-blue-400" />
          </div>
          <p className="text-slate-400 text-sm">Loading portal…</p>
        </div>
      </div>
    );
  }

  if (!profile && !isSuperAdmin) {
    return (
      <div className="dark-panel min-h-screen bg-[#050e1a] flex items-center justify-center p-4">
        <div className="dp-card p-8 text-center space-y-3 w-full max-w-sm">
          <XCircle className="w-10 h-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-semibold text-white">Not a Vendor</h2>
          <p className="text-sm text-slate-400">
            Your phone number is not registered as a vendor. Contact EasyOutstation admin.
          </p>
          <Button variant="outline" className="w-full border-white/10 text-slate-300 hover:bg-white/5" onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const activeTrips = myTrips?.filter(t => ["confirmed", "driver_assigned"].includes(t.status)) ?? [];
  const pastTrips = myTrips?.filter(t => ["completed", "cancelled"].includes(t.status)) ?? [];

  return (
    <div className="dark-panel min-h-screen bg-[#050e1a] relative">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-blue-600/8 rounded-full blur-[80px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[350px] h-[350px] bg-violet-600/6 rounded-full blur-[80px]" />
      </div>

      {/* Admin preview banner */}
      {isSuperAdmin && !profile && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs text-amber-300 font-medium sticky top-0 z-20">
          Admin Preview Mode — this is how vendors see the portal
        </div>
      )}

      {/* Header */}
      <div className="bg-[#050e1a]/80 backdrop-blur-xl border-b border-white/8 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-white leading-tight">{profile?.name ?? (isSuperAdmin ? "Admin Preview" : "")}</p>
              <p className="text-[11px] text-slate-400">{profile?.company ?? "Vendor"} · {profile?.city ?? ""}</p>
            </div>
          </div>
          <button
            className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
            onClick={() => { signOut(); navigate("/"); }}>
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5 relative z-[1]">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="dp-stat p-4 text-center" style={{ animationDelay: "0ms" }}>
            <p className="text-2xl font-bold text-white">{myDrivers?.length ?? 0}</p>
            <p className="text-xs text-slate-400 mt-0.5">Drivers</p>
          </div>
          <div className="dp-stat p-4 text-center" style={{ animationDelay: "60ms" }}>
            <p className="text-2xl font-bold text-white">{activeTrips.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Active Trips</p>
          </div>
          <div className="dp-stat p-4 text-center" style={{ animationDelay: "120ms" }}>
            <p className="text-2xl font-bold text-white">{pastTrips.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">Completed</p>
          </div>
        </div>

        <div className="dark-panel">
          <Tabs defaultValue="trips">
            <TabsList className="w-full">
              <TabsTrigger value="trips" className="flex-1">
                <Calendar className="w-4 h-4 mr-1.5" />Trips
                {activeTrips.length > 0 && (
                  <span className="ml-1.5 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeTrips.length}</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="drivers" className="flex-1">
                <Users className="w-4 h-4 mr-1.5" />My Drivers
              </TabsTrigger>
            </TabsList>

            {/* ── Trips ── */}
            <TabsContent value="trips" className="space-y-3 pt-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Assigned Trips</p>
                <button
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-white/8 hover:bg-white/5 transition-colors"
                  onClick={() => refetchTrips()}>
                  <RefreshCw className="w-3 h-3" /> Refresh
                </button>
              </div>

              {(!myTrips || myTrips.length === 0) ? (
                <div className="dp-card p-8 text-center text-slate-400 text-sm">No trips assigned yet.</div>
              ) : (
                <>
                  {activeTrips.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active</p>
                      {activeTrips.map((trip, i) => (
                        <TripCard key={trip.id} trip={trip} drivers={myDrivers ?? []}
                          confirmingId={confirmingId} setConfirmingId={setConfirmingId}
                          selectedDriver={selectedDriver} setSelectedDriver={setSelectedDriver}
                          rejectReason={rejectReason} setRejectReason={setRejectReason}
                          onConfirm={(bookingId, driverPhone) => confirmTrip.mutate({ bookingId, driverPhone })}
                          onReject={(bookingId, reason) => rejectTrip.mutate({ bookingId, reason })}
                          isLoading={confirmTrip.isPending || rejectTrip.isPending}
                          index={i}
                        />
                      ))}
                    </div>
                  )}

                  {pastTrips.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-4">History</p>
                      {pastTrips.slice(0, 10).map((trip, i) => (
                        <TripCard key={trip.id} trip={trip} drivers={[]}
                          confirmingId={null} setConfirmingId={() => {}}
                          selectedDriver={{}} setSelectedDriver={() => {}}
                          rejectReason={{}} setRejectReason={() => {}}
                          onConfirm={() => {}} onReject={() => {}} isLoading={false} readonly
                          index={activeTrips.length + i}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* ── Drivers ── */}
            <TabsContent value="drivers" className="space-y-3 pt-3">
              {(!myDrivers || myDrivers.length === 0) ? (
                <div className="dp-card p-8 text-center text-slate-400 text-sm">
                  No drivers linked to your account yet. Contact admin to link your drivers.
                </div>
              ) : (
                myDrivers.map((d, i) => (
                  <div key={d.id} className="dp-card p-4 flex items-center justify-between"
                    style={{ animationDelay: `${i * 50}ms` }}>
                    <div>
                      <p className="font-medium text-sm text-white">{d.name}</p>
                      <a href={`tel:+91${d.phone}`} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />+91-{d.phone}
                      </a>
                      {d.vehicleInfo && <p className="text-xs text-slate-400 mt-0.5">{d.vehicleInfo}</p>}
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${d.isActive ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20" : "bg-white/5 text-slate-400 border border-white/8"}`}>
                      {d.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

interface TripCardProps {
  trip: any;
  drivers: any[];
  confirmingId: number | null;
  setConfirmingId: (id: number | null) => void;
  selectedDriver: Record<number, string>;
  setSelectedDriver: (fn: any) => void;
  rejectReason: Record<number, string>;
  setRejectReason: (fn: any) => void;
  onConfirm: (bookingId: number, driverPhone: string) => void;
  onReject: (bookingId: number, reason?: string) => void;
  isLoading: boolean;
  readonly?: boolean;
  index?: number;
}

function TripCard({ trip, drivers, confirmingId, setConfirmingId, selectedDriver, setSelectedDriver, onConfirm, onReject, isLoading, readonly, index = 0 }: TripCardProps) {
  const isExpanded = confirmingId === trip.id;

  return (
    <div className="dp-card p-4 space-y-3 overflow-hidden" style={{ animationDelay: `${index * 50}ms` }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-xs font-mono text-slate-500">#{trip.id}</span>
            <span className="font-semibold text-sm text-white">{trip.customerName}</span>
            {trip.customerPhone && (
              <a href={`tel:+91${trip.customerPhone}`} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                <Phone className="w-3 h-3" />{trip.customerPhone}
              </a>
            )}
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1">
            <MapPin className="w-3 h-3 shrink-0" />{trip.fromCity} → {trip.toCity}
          </p>
          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
            <Calendar className="w-3 h-3 shrink-0" />{fmt(trip.pickupDate)}
            {trip.car && <><Car className="w-3 h-3 ml-2 shrink-0" />{trip.car.name}</>}
          </p>
          {trip.driverName && (
            <p className="text-xs text-emerald-400 mt-1">👨‍✈️ {trip.driverName}{trip.driverPhone && ` · +91-${trip.driverPhone}`}</p>
          )}
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${statusColors[trip.status as BookingStatus]}`}>
          {trip.status.replace("_", " ")}
        </span>
      </div>

      {!readonly && (trip.status === "confirmed" || trip.status === "driver_assigned") && (
        <div className="pt-3 border-t border-white/6">
          {!isExpanded ? (
            <div className="flex gap-2">
              <button
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors"
                onClick={() => setConfirmingId(trip.id)}>
                <CheckCircle className="w-3.5 h-3.5" /> Assign Driver
              </button>
              <button
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                onClick={() => onReject(trip.id, "Cannot service")}>
                <XCircle className="w-3.5 h-3.5" /> Can't Service
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Select value={selectedDriver[trip.id] ?? ""} onValueChange={v => setSelectedDriver((p: any) => ({ ...p, [trip.id]: v }))}>
                <SelectTrigger className="h-8 text-xs bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Select driver..." />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={d.phone}>{d.name} · {d.phone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <button
                  className="flex items-center justify-center gap-1.5 text-xs flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors disabled:opacity-40"
                  disabled={!selectedDriver[trip.id] || isLoading}
                  onClick={() => onConfirm(trip.id, selectedDriver[trip.id])}>
                  <CheckCircle className="w-3.5 h-3.5" /> Confirm
                </button>
                <button
                  className="text-xs px-4 py-2 rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 transition-colors"
                  onClick={() => setConfirmingId(null)}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
