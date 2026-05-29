import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Truck, Users, Phone, MapPin, Calendar, Car, CheckCircle, XCircle,
  LogOut, RefreshCw, Clock,
} from "lucide-react";

type BookingStatus = "pending" | "confirmed" | "driver_assigned" | "completed" | "cancelled";

const statusColors: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  driver_assigned: "bg-teal-100 text-teal-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
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
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="p-8 text-center space-y-4">
            <Truck className="w-10 h-10 text-primary mx-auto" />
            <h2 className="text-lg font-semibold">Vendor Portal</h2>
            <p className="text-sm text-muted-foreground">Please log in to access the vendor portal.</p>
            <Button className="w-full" onClick={() => navigate("/login")}>Log In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (profileLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Loading...</div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardContent className="p-8 text-center space-y-3">
            <XCircle className="w-10 h-10 text-red-500 mx-auto" />
            <h2 className="text-lg font-semibold">Not a Vendor</h2>
            <p className="text-sm text-muted-foreground">
              Your phone number is not registered as a vendor. Contact EasyOutstation admin.
            </p>
            <Button variant="outline" className="w-full" onClick={() => navigate("/")}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeTrips = myTrips?.filter(t => ["confirmed", "driver_assigned"].includes(t.status)) ?? [];
  const pastTrips = myTrips?.filter(t => ["completed", "cancelled"].includes(t.status)) ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm leading-tight">{profile.name}</p>
              <p className="text-[11px] text-muted-foreground">{profile.company ?? "Vendor"} · {profile.city ?? ""}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="gap-1.5 text-slate-500"
            onClick={() => { signOut(); navigate("/"); }}>
            <LogOut className="w-4 h-4" /> Logout
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{myDrivers?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Drivers</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{activeTrips.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Active Trips</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{pastTrips.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Completed</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="trips">
          <TabsList className="w-full">
            <TabsTrigger value="trips" className="flex-1">
              <Calendar className="w-4 h-4 mr-1.5" />Trips
              {activeTrips.length > 0 && (
                <span className="ml-1.5 bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{activeTrips.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="drivers" className="flex-1">
              <Users className="w-4 h-4 mr-1.5" />My Drivers
            </TabsTrigger>
          </TabsList>

          {/* ── Trips ── */}
          <TabsContent value="trips" className="space-y-3 pt-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Assigned Trips</p>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => refetchTrips()}>
                <RefreshCw className="w-3 h-3" /> Refresh
              </Button>
            </div>

            {(!myTrips || myTrips.length === 0) ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No trips assigned yet.</CardContent></Card>
            ) : (
              <>
                {activeTrips.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active</p>
                    {activeTrips.map(trip => (
                      <TripCard key={trip.id} trip={trip} drivers={myDrivers ?? []}
                        confirmingId={confirmingId} setConfirmingId={setConfirmingId}
                        selectedDriver={selectedDriver} setSelectedDriver={setSelectedDriver}
                        rejectReason={rejectReason} setRejectReason={setRejectReason}
                        onConfirm={(bookingId, driverPhone) => confirmTrip.mutate({ bookingId, driverPhone })}
                        onReject={(bookingId, reason) => rejectTrip.mutate({ bookingId, reason })}
                        isLoading={confirmTrip.isPending || rejectTrip.isPending}
                      />
                    ))}
                  </div>
                )}

                {pastTrips.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4">History</p>
                    {pastTrips.slice(0, 10).map(trip => (
                      <TripCard key={trip.id} trip={trip} drivers={[]}
                        confirmingId={null} setConfirmingId={() => {}}
                        selectedDriver={{}} setSelectedDriver={() => {}}
                        rejectReason={{}} setRejectReason={() => {}}
                        onConfirm={() => {}} onReject={() => {}} isLoading={false} readonly
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
              <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">
                No drivers linked to your account yet. Contact admin to link your drivers.
              </CardContent></Card>
            ) : (
              myDrivers.map(d => (
                <Card key={d.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{d.name}</p>
                      <a href={`tel:+91${d.phone}`} className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />+91-{d.phone}
                      </a>
                      {d.vehicleInfo && <p className="text-xs text-muted-foreground mt-0.5">{d.vehicleInfo}</p>}
                    </div>
                    <Badge className={d.isActive ? "bg-green-100 text-green-700 border-0 text-xs" : "bg-slate-100 text-slate-500 border-0 text-xs"}>
                      {d.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
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
}

function TripCard({ trip, drivers, confirmingId, setConfirmingId, selectedDriver, setSelectedDriver, onConfirm, onReject, isLoading, readonly }: TripCardProps) {
  const isExpanded = confirmingId === trip.id;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className="text-xs font-mono text-muted-foreground">#{trip.id}</span>
              <span className="font-semibold text-sm">{trip.customerName}</span>
              {trip.customerPhone && (
                <a href={`tel:+91${trip.customerPhone}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                  <Phone className="w-3 h-3" />{trip.customerPhone}
                </a>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3 shrink-0" />{trip.fromCity} → {trip.toCity}
            </p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3 shrink-0" />{fmt(trip.pickupDate)}
              {trip.car && <><Car className="w-3 h-3 ml-2 shrink-0" />{trip.car.name}</>}
            </p>
            {trip.driverName && (
              <p className="text-xs text-green-700 mt-1">👨‍✈️ {trip.driverName}{trip.driverPhone && ` · +91-${trip.driverPhone}`}</p>
            )}
          </div>
          <Badge className={`${statusColors[trip.status as BookingStatus]} text-xs border-0 shrink-0`}>
            {trip.status.replace("_", " ")}
          </Badge>
        </div>

        {!readonly && (trip.status === "confirmed" || trip.status === "driver_assigned") && (
          <div className="pt-1 border-t border-slate-100">
            {!isExpanded ? (
              <div className="flex gap-2">
                <Button size="sm" className="h-8 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setConfirmingId(trip.id)}>
                  <CheckCircle className="w-3 h-3" /> Assign Driver
                </Button>
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => onReject(trip.id, "Cannot service")}>
                  <XCircle className="w-3 h-3" /> Can't Service
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Select value={selectedDriver[trip.id] ?? ""} onValueChange={v => setSelectedDriver((p: any) => ({ ...p, [trip.id]: v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select driver..." /></SelectTrigger>
                  <SelectContent>
                    {drivers.map(d => (
                      <SelectItem key={d.id} value={d.phone}>{d.name} · {d.phone}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button size="sm" className="h-8 text-xs flex-1 bg-green-600 hover:bg-green-700 text-white"
                    disabled={!selectedDriver[trip.id] || isLoading}
                    onClick={() => onConfirm(trip.id, selectedDriver[trip.id])}>
                    <CheckCircle className="w-3 h-3 mr-1" /> Confirm
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs"
                    onClick={() => setConfirmingId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
