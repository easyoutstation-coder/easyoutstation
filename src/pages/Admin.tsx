import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LayoutDashboard,
  Users,
  Car,
  IndianRupee,
  Clock,
  CheckCircle,
  XCircle,
  Phone,
  UserCog,
  StickyNote,
} from "lucide-react";

type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";
type PaymentStatus = "pending" | "paid" | "refunded";

const statusColors: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

const paymentColors: Record<PaymentStatus, string> = {
  pending: "bg-slate-100 text-slate-600",
  paid: "bg-emerald-100 text-emerald-700",
  refunded: "bg-orange-100 text-orange-700",
};

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DriverModalState {
  open: boolean;
  bookingId: number;
  customerPhone: string;
  route: string;
  date: string;
  currentDriverName: string;
  currentDriverPhone: string;
}

interface NoteModalState {
  open: boolean;
  bookingId: number;
  currentNote: string;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });

  const [statusFilter, setStatusFilter] = useState("all");
  const [driverModal, setDriverModal] = useState<DriverModalState>({
    open: false, bookingId: 0, customerPhone: "", route: "", date: "", currentDriverName: "", currentDriverPhone: "",
  });
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [noteModal, setNoteModal] = useState<NoteModalState>({ open: false, bookingId: 0, currentNote: "" });
  const [noteText, setNoteText] = useState("");

  const utils = trpc.useUtils();

  const { data: stats } = trpc.admin.getStats.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: bookingsList, isLoading: bookingsLoading } = trpc.admin.getBookings.useQuery(
    { status: statusFilter },
    { enabled: isAuthenticated && user?.role === "admin" }
  );
  const { data: customers } = trpc.admin.getCustomers.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });

  const invalidate = () => {
    utils.admin.getBookings.invalidate();
    utils.admin.getStats.invalidate();
  };

  const updateStatus = trpc.admin.updateStatus.useMutation({ onSuccess: invalidate });
  const updatePayment = trpc.admin.updatePayment.useMutation({ onSuccess: invalidate });
  const assignDriver = trpc.admin.assignDriver.useMutation({
    onSuccess: () => {
      setDriverModal(m => ({ ...m, open: false }));
      setDriverName(""); setDriverPhone("");
      invalidate();
    },
  });
  const addNote = trpc.admin.addNote.useMutation({
    onSuccess: () => { setNoteModal(m => ({ ...m, open: false })); setNoteText(""); invalidate(); },
  });
  const setUserRole = trpc.admin.setUserRole.useMutation({ onSuccess: () => utils.admin.getCustomers.invalidate() });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold text-muted-foreground">Admin access only.</p>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Car className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">EasyOutstation Admin</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>← Site</Button>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <Tabs defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-1.5"><LayoutDashboard className="w-4 h-4" />Overview</TabsTrigger>
            <TabsTrigger value="bookings" className="gap-1.5"><Car className="w-4 h-4" />Bookings {stats?.pending ? `(${stats.pending})` : ""}</TabsTrigger>
            <TabsTrigger value="customers" className="gap-1.5"><Users className="w-4 h-4" />Customers</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Clock} label="Pending" value={stats?.pending ?? "—"} />
              <StatCard icon={CheckCircle} label="Confirmed" value={stats?.confirmed ?? "—"} />
              <StatCard icon={Car} label="Completed" value={stats?.completed ?? "—"} />
              <StatCard icon={XCircle} label="Cancelled" value={stats?.cancelled ?? "—"} />
              <StatCard icon={IndianRupee} label="Total Revenue" value={stats ? `₹${stats.totalRevenue.toLocaleString("en-IN")}` : "—"} />
              <StatCard icon={IndianRupee} label="Collected" value={stats ? `₹${stats.paidRevenue.toLocaleString("en-IN")}` : "—"} sub="Marked as paid" />
              <StatCard icon={IndianRupee} label="Outstanding" value={stats ? `₹${(stats.totalRevenue - stats.paidRevenue).toLocaleString("en-IN")}` : "—"} sub="Not yet collected" />
              <StatCard icon={Users} label="Customers" value={stats?.customers ?? "—"} />
            </div>
          </TabsContent>

          {/* Bookings Tab */}
          <TabsContent value="bookings">
            <div className="flex flex-wrap gap-2 mb-4">
              {(["all", "pending", "confirmed", "completed", "cancelled"] as const).map(s => (
                <Button
                  key={s}
                  variant={statusFilter === s ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter(s)}
                  className="capitalize"
                >
                  {s}
                  {s === "pending" && stats?.pending ? ` (${stats.pending})` : ""}
                </Button>
              ))}
            </div>

            {bookingsLoading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : !bookingsList?.length ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No bookings found.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {bookingsList.map(b => {
                  const booking = b as typeof b & { driverName?: string; driverPhone?: string; adminNotes?: string };
                  return (
                    <Card key={b.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="p-4 space-y-3">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-muted-foreground font-mono">#{b.id}</span>
                                <h4 className="font-semibold text-sm">{b.customerName}</h4>
                                {b.customerPhone && (
                                  <a
                                    href={`tel:+91${b.customerPhone}`}
                                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                                  >
                                    <Phone className="w-3 h-3" />{b.customerPhone}
                                  </a>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {b.fromCity} → {b.toCity} · {new Date(b.pickupDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {b.car?.name} · {b.totalKm} km · {b.tripType.replace("_", " ")}
                              </p>
                              {b.pickupAddress && (
                                <p className="text-xs text-muted-foreground">Pickup: {b.pickupAddress}</p>
                              )}
                              {b.specialRequests && (
                                <p className="text-xs text-muted-foreground italic">"{b.specialRequests}"</p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="font-bold text-primary">₹{parseFloat(b.totalPrice.toString()).toLocaleString("en-IN")}</span>
                              <Badge className={`${statusColors[b.status as BookingStatus]} text-xs border-0`}>
                                {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                              </Badge>
                              <Badge className={`${paymentColors[b.paymentStatus as PaymentStatus]} text-xs border-0`}>
                                {b.paymentStatus === "paid" ? "Paid" : b.paymentStatus === "refunded" ? "Refunded" : "Unpaid"}
                              </Badge>
                            </div>
                          </div>

                          {/* Driver / Note banners */}
                          {(booking.driverName || booking.driverPhone) && (
                            <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-xs text-green-800">
                              Driver assigned: <strong>{booking.driverName}</strong>
                              {booking.driverPhone && (
                                <> · <a href={`tel:+91${booking.driverPhone}`} className="hover:underline">+91-{booking.driverPhone}</a></>
                              )}
                            </div>
                          )}
                          {booking.adminNotes && (
                            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-800">
                              Note: {booking.adminNotes}
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                            <Select
                              value={b.status}
                              onValueChange={v => updateStatus.mutate({ id: Number(b.id), status: v as BookingStatus })}
                            >
                              <SelectTrigger className="h-8 text-xs w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>

                            <Select
                              value={b.paymentStatus}
                              onValueChange={v => updatePayment.mutate({ id: Number(b.id), paymentStatus: v as PaymentStatus })}
                            >
                              <SelectTrigger className="h-8 text-xs w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Unpaid</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                                <SelectItem value="refunded">Refunded</SelectItem>
                              </SelectContent>
                            </Select>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1"
                              onClick={() => {
                                setDriverModal({
                                  open: true,
                                  bookingId: Number(b.id),
                                  customerPhone: b.customerPhone ?? "",
                                  route: `${b.fromCity} → ${b.toCity}`,
                                  date: new Date(b.pickupDate).toLocaleDateString("en-IN"),
                                  currentDriverName: booking.driverName ?? "",
                                  currentDriverPhone: booking.driverPhone ?? "",
                                });
                                setDriverName(booking.driverName ?? "");
                                setDriverPhone(booking.driverPhone ?? "");
                              }}
                            >
                              <Car className="w-3 h-3" /> Driver
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs gap-1"
                              onClick={() => {
                                setNoteModal({ open: true, bookingId: Number(b.id), currentNote: booking.adminNotes ?? "" });
                                setNoteText(booking.adminNotes ?? "");
                              }}
                            >
                              <StickyNote className="w-3 h-3" /> Note
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers">
            <div className="space-y-3">
              {!customers?.length ? (
                <Card><CardContent className="p-8 text-center text-muted-foreground">No customers yet.</CardContent></Card>
              ) : customers.map(c => (
                <Card key={c.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-sm">{c.name || "No Name"}</h4>
                          {c.role === "admin" && <Badge className="bg-purple-100 text-purple-700 text-xs border-0">Admin</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {c.phone && (
                            <a href={`tel:+91${c.phone}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                              <Phone className="w-3 h-3" />{c.phone}
                            </a>
                          )}
                          {c.email && <span className="text-xs text-muted-foreground">{c.email}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {Number(c.bookingCount)} booking{Number(c.bookingCount) !== 1 ? "s" : ""} · Joined {new Date(c.createdAt).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                      <div>
                        {c.role !== "admin" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs gap-1"
                            onClick={() => setUserRole.mutate({ userId: Number(c.id), role: "admin" })}
                          >
                            <UserCog className="w-3 h-3" /> Make Admin
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs text-muted-foreground"
                            onClick={() => setUserRole.mutate({ userId: Number(c.id), role: "user" })}
                          >
                            Remove Admin
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Driver Assignment Modal */}
      <Dialog open={driverModal.open} onOpenChange={open => setDriverModal(m => ({ ...m, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Driver — Booking #{driverModal.bookingId}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground mb-3">
            <p>{driverModal.route} · {driverModal.date}</p>
            {driverModal.customerPhone && (
              <a href={`tel:+91${driverModal.customerPhone}`} className="flex items-center gap-1 text-primary hover:underline mt-1">
                <Phone className="w-3 h-3" /> Customer: +91-{driverModal.customerPhone}
              </a>
            )}
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Driver Name</label>
              <Input
                placeholder="e.g. Ramesh Kumar"
                value={driverName}
                onChange={e => setDriverName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Driver Phone</label>
              <Input
                placeholder="10-digit mobile"
                value={driverPhone}
                onChange={e => setDriverPhone(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              disabled={!driverName.trim() || !driverPhone.trim() || assignDriver.isPending}
              onClick={() => assignDriver.mutate({
                id: driverModal.bookingId,
                driverName: driverName.trim(),
                driverPhone: driverPhone.trim(),
                confirmBooking: true,
              })}
            >
              {assignDriver.isPending ? "Saving..." : "Confirm Booking & Save Driver"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              disabled={!driverName.trim() || !driverPhone.trim() || assignDriver.isPending}
              onClick={() => assignDriver.mutate({
                id: driverModal.bookingId,
                driverName: driverName.trim(),
                driverPhone: driverPhone.trim(),
                confirmBooking: false,
              })}
            >
              Save Driver Only (Keep Current Status)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Note Modal */}
      <Dialog open={noteModal.open} onOpenChange={open => setNoteModal(m => ({ ...m, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Internal Note — Booking #{noteModal.bookingId}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Internal note (not visible to customer)..."
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            rows={4}
          />
          <Button
            className="w-full mt-2"
            disabled={addNote.isPending}
            onClick={() => addNote.mutate({ id: noteModal.bookingId, note: noteText })}
          >
            {addNote.isPending ? "Saving..." : "Save Note"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
