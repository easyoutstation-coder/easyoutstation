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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LayoutDashboard, Users, Car, IndianRupee, Clock, CheckCircle, XCircle,
  Phone, UserCog, StickyNote, CheckCheck, X, Plus, Pencil, Trash2,
  MessageCircle, Mail, AlertTriangle,
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

const MASTER_PHONES = ["9958556011"];
const MASTER_EMAILS = ["parmindersinghtalwar@gmail.com"];
function isMasterUser(user: { phone?: string | null; email?: string | null } | undefined) {
  if (!user) return false;
  return MASTER_PHONES.includes(user.phone ?? "") || MASTER_EMAILS.includes(user.email ?? "");
}

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

// ── Types ──────────────────────────────────────────────────────────────────
interface ConfirmModal {
  open: boolean;
  bookingId: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  route: string;
  date: string;
  carName: string;
  pickupAddress: string;
}
interface CancelModal {
  open: boolean;
  bookingId: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  route: string;
  date: string;
}
interface NoteModal { open: boolean; bookingId: number; currentNote: string }
interface ActionResult { whatsappLink: string | null; emailSent: boolean; customerPhone: string | null; bookingId?: number; action?: "confirmed" | "cancelled" }
interface DriverForm { name: string; phone: string; vehicleInfo: string }

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });

  const [statusFilter, setStatusFilter] = useState("pending");
  const [confirmModal, setConfirmModal] = useState<ConfirmModal>({
    open: false, bookingId: 0, customerName: "", customerPhone: "", customerEmail: "",
    route: "", date: "", carName: "", pickupAddress: "",
  });
  const [cancelModal, setCancelModal] = useState<CancelModal>({
    open: false, bookingId: 0, customerName: "", customerPhone: "", customerEmail: "",
    route: "", date: "",
  });
  const [cancelReason, setCancelReason] = useState("");
  const [noteModal, setNoteModal] = useState<NoteModal>({ open: false, bookingId: 0, currentNote: "" });
  const [noteText, setNoteText] = useState("");

  // Driver selection in confirm modal
  const [selectedDriverId, setSelectedDriverId] = useState(""); // "" = custom
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");

  // Result shown after confirm/cancel
  const [actionResult, setActionResult] = useState<ActionResult | null>(null);

  // Driver management
  const [addDriverOpen, setAddDriverOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<{ id: number } & DriverForm | null>(null);
  const [newDriver, setNewDriver] = useState<DriverForm>({ name: "", phone: "", vehicleInfo: "" });

  const utils = trpc.useUtils();
  const invalidateBookings = () => { utils.admin.getBookings.invalidate(); utils.admin.getStats.invalidate(); };

  const { data: stats } = trpc.admin.getStats.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: bookingsList, isLoading: bookingsLoading } = trpc.admin.getBookings.useQuery(
    { status: statusFilter }, { enabled: isAuthenticated && user?.role === "admin" }
  );
  const { data: driversList } = trpc.admin.getDrivers.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });
  const { data: customers } = trpc.admin.getCustomers.useQuery(undefined, { enabled: isAuthenticated && user?.role === "admin" });

  const confirmBooking = trpc.admin.confirmBooking.useMutation({
    onSuccess: (res) => {
      setConfirmModal(m => ({ ...m, open: false }));
      setActionResult({ ...res, bookingId: confirmModal.bookingId, action: "confirmed" });
      setSelectedDriverId(""); setDriverName(""); setDriverPhone("");
      invalidateBookings();
    },
  });
  const cancelBooking = trpc.admin.cancelBooking.useMutation({
    onSuccess: (res) => {
      setCancelModal(m => ({ ...m, open: false }));
      setCancelReason("");
      setActionResult({ ...res, bookingId: cancelModal.bookingId, action: "cancelled" });
      invalidateBookings();
    },
  });
  const updatePayment = trpc.admin.updatePayment.useMutation({ onSuccess: invalidateBookings });
  const addNote = trpc.admin.addNote.useMutation({
    onSuccess: () => { setNoteModal(m => ({ ...m, open: false })); setNoteText(""); invalidateBookings(); },
  });
  const addDriver = trpc.admin.addDriver.useMutation({
    onSuccess: () => { setAddDriverOpen(false); setNewDriver({ name: "", phone: "", vehicleInfo: "" }); utils.admin.getDrivers.invalidate(); },
  });
  const updateDriver = trpc.admin.updateDriver.useMutation({
    onSuccess: () => { setEditingDriver(null); utils.admin.getDrivers.invalidate(); },
  });
  const removeDriver = trpc.admin.removeDriver.useMutation({ onSuccess: () => utils.admin.getDrivers.invalidate() });
  const setUserRole = trpc.admin.setUserRole.useMutation({ onSuccess: () => utils.admin.getCustomers.invalidate() });

  function openConfirmModal(b: any) {
    const booking = b as typeof b & { driverName?: string; driverPhone?: string };
    setDriverName(booking.driverName ?? "");
    setDriverPhone(booking.driverPhone ?? "");
    setSelectedDriverId("");
    setConfirmModal({
      open: true,
      bookingId: Number(b.id),
      customerName: b.customerName,
      customerPhone: b.customerPhone ?? "",
      customerEmail: b.customerEmail ?? "",
      route: `${b.fromCity} → ${b.toCity}`,
      date: new Date(b.pickupDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      carName: b.car?.name ?? "",
      pickupAddress: b.pickupAddress ?? "",
    });
  }

  function selectDriver(driverId: string) {
    setSelectedDriverId(driverId);
    if (driverId && driverId !== "custom") {
      const d = driversList?.find(d => String(d.id) === driverId);
      if (d) { setDriverName(d.name); setDriverPhone(d.phone); }
    } else if (driverId === "custom") {
      setDriverName(""); setDriverPhone("");
    }
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>;
  }
  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold text-muted-foreground">Admin access only.</p>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  const masterAdmin = isMasterUser(user);

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

        {/* Action result banner */}
        {actionResult && (
          <div className={`mb-4 rounded-xl p-4 flex items-start justify-between gap-3 shadow-sm border ${
            actionResult.action === "cancelled"
              ? "bg-red-50 border-red-200"
              : "bg-green-50 border-green-200"
          }`}>
            <div className="flex items-start gap-3 flex-1">
              <CheckCheck className={`w-5 h-5 mt-0.5 shrink-0 ${actionResult.action === "cancelled" ? "text-red-600" : "text-green-600"}`} />
              <div className="flex-1">
                <p className={`font-semibold text-sm ${actionResult.action === "cancelled" ? "text-red-800" : "text-green-800"}`}>
                  Booking #{actionResult.bookingId} {actionResult.action === "cancelled" ? "cancelled" : "confirmed"}!
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {actionResult.emailSent ? (
                    <span className="flex items-center gap-1 text-xs bg-white/70 text-green-700 border border-green-200 px-2 py-1 rounded-full">
                      <Mail className="w-3 h-3" /> Confirmation email sent ✓
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs bg-white/70 text-amber-700 border border-amber-200 px-2 py-1 rounded-full">
                      <Mail className="w-3 h-3" /> No email on file
                    </span>
                  )}
                  {actionResult.whatsappLink ? (
                    <a
                      href={actionResult.whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs font-semibold bg-[#25D366] text-white px-3 py-1 rounded-full hover:bg-[#1ebe5d] transition-colors"
                    >
                      <MessageCircle className="w-3 h-3" /> Tap to send WhatsApp →
                    </a>
                  ) : (
                    <span className="flex items-center gap-1 text-xs bg-white/70 text-amber-700 border border-amber-200 px-2 py-1 rounded-full">
                      No phone on file — call customer manually
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={() => setActionResult(null)} className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <Tabs defaultValue="bookings">
          <TabsList className="mb-6">
            <TabsTrigger value="overview" className="gap-1.5"><LayoutDashboard className="w-4 h-4" />Overview</TabsTrigger>
            <TabsTrigger value="bookings" className="gap-1.5">
              <Car className="w-4 h-4" />Bookings
              {(stats?.pending ?? 0) > 0 && <span className="ml-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{stats!.pending}</span>}
            </TabsTrigger>
            <TabsTrigger value="drivers" className="gap-1.5"><Car className="w-4 h-4" />Drivers</TabsTrigger>
            <TabsTrigger value="customers" className="gap-1.5"><Users className="w-4 h-4" />Customers</TabsTrigger>
          </TabsList>

          {/* ── Overview ────────────────────────────────────────────── */}
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

          {/* ── Bookings ─────────────────────────────────────────────── */}
          <TabsContent value="bookings">
            <div className="flex flex-wrap gap-2 mb-4">
              {(["pending", "confirmed", "all", "completed", "cancelled"] as const).map(s => (
                <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm"
                  onClick={() => setStatusFilter(s)} className="capitalize">
                  {s}{s === "pending" && (stats?.pending ?? 0) > 0 ? ` (${stats!.pending})` : ""}
                </Button>
              ))}
            </div>

            {bookingsLoading ? (
              <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
            ) : !bookingsList?.length ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No bookings found.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {bookingsList.map(b => {
                  const bx = b as typeof b & { driverName?: string; driverPhone?: string; adminNotes?: string };
                  const isCancelled = b.status === "cancelled";
                  const isCompleted = b.status === "completed";
                  return (
                    <Card key={b.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <div className="p-4 space-y-3">
                          {/* Top */}
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-muted-foreground font-mono">#{b.id}</span>
                                <h4 className="font-semibold text-sm">{b.customerName}</h4>
                                {b.customerPhone && (
                                  <a href={`tel:+91${b.customerPhone}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                                    <Phone className="w-3 h-3" />{b.customerPhone}
                                  </a>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {b.fromCity} → {b.toCity} · {new Date(b.pickupDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </p>
                              <p className="text-xs text-muted-foreground">{b.car?.name} · {b.totalKm} km · {b.tripType.replace("_", " ")}</p>
                              {b.pickupAddress && <p className="text-xs text-muted-foreground">📍 {b.pickupAddress}</p>}
                              {b.specialRequests && <p className="text-xs text-muted-foreground italic">"{b.specialRequests}"</p>}
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className="font-bold text-primary">₹{parseFloat(b.totalPrice.toString()).toLocaleString("en-IN")}</span>
                              <Badge className={`${statusColors[b.status as BookingStatus]} text-xs border-0`}>
                                {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                              </Badge>
                              <Badge className={`${paymentColors[b.paymentStatus as PaymentStatus]} text-xs border-0`}>
                                {b.paymentStatus === "paid" ? "Paid ✓" : b.paymentStatus === "refunded" ? "Refunded" : "Unpaid"}
                              </Badge>
                            </div>
                          </div>

                          {/* Driver / Note banners */}
                          {(bx.driverName || bx.driverPhone) && (
                            <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 text-xs text-green-800">
                              👨‍✈️ <strong>{bx.driverName}</strong>
                              {bx.driverPhone && <> · <a href={`tel:+91${bx.driverPhone}`} className="hover:underline">+91-{bx.driverPhone}</a></>}
                            </div>
                          )}
                          {bx.adminNotes && (
                            <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-800">
                              📝 {bx.adminNotes}
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                            {/* Confirm — only for pending/confirmed */}
                            {!isCancelled && !isCompleted && (
                              <Button
                                size="sm"
                                className="h-8 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => openConfirmModal(b)}
                              >
                                <CheckCheck className="w-3 h-3" />
                                {b.status === "confirmed" ? "Re-assign Driver" : "Confirm"}
                              </Button>
                            )}

                            {/* Cancel — only if not already cancelled */}
                            {!isCancelled && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => setCancelModal({
                                  open: true,
                                  bookingId: Number(b.id),
                                  customerName: b.customerName,
                                  customerPhone: b.customerPhone ?? "",
                                  customerEmail: b.customerEmail ?? "",
                                  route: `${b.fromCity} → ${b.toCity}`,
                                  date: new Date(b.pickupDate).toLocaleDateString("en-IN"),
                                })}
                              >
                                <X className="w-3 h-3" /> Cancel
                              </Button>
                            )}

                            {/* Payment */}
                            <Select value={b.paymentStatus}
                              onValueChange={v => updatePayment.mutate({ id: Number(b.id), paymentStatus: v as PaymentStatus })}>
                              <SelectTrigger className="h-8 text-xs w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Unpaid</SelectItem>
                                <SelectItem value="paid">Mark Paid</SelectItem>
                                <SelectItem value="refunded">Refunded</SelectItem>
                              </SelectContent>
                            </Select>

                            {/* Note */}
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
                              onClick={() => { setNoteModal({ open: true, bookingId: Number(b.id), currentNote: bx.adminNotes ?? "" }); setNoteText(bx.adminNotes ?? ""); }}>
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

          {/* ── Drivers ──────────────────────────────────────────────── */}
          <TabsContent value="drivers">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Driver Roster</h2>
              <Button size="sm" className="gap-1" onClick={() => setAddDriverOpen(true)}>
                <Plus className="w-4 h-4" /> Add Driver
              </Button>
            </div>
            {!driversList?.length ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No drivers yet. Add your first driver.</CardContent></Card>
            ) : (
              <div className="space-y-2">
                {driversList.map(d => (
                  <Card key={d.id}>
                    <CardContent className="p-4">
                      {editingDriver?.id === Number(d.id) ? (
                        <div className="flex flex-wrap gap-2 items-end">
                          <Input placeholder="Name" value={editingDriver.name} onChange={e => setEditingDriver(ed => ed ? { ...ed, name: e.target.value } : ed)} className="h-8 text-sm w-40" />
                          <Input placeholder="Phone" value={editingDriver.phone} onChange={e => setEditingDriver(ed => ed ? { ...ed, phone: e.target.value } : ed)} className="h-8 text-sm w-36" />
                          <Input placeholder="Vehicle (optional)" value={editingDriver.vehicleInfo} onChange={e => setEditingDriver(ed => ed ? { ...ed, vehicleInfo: e.target.value } : ed)} className="h-8 text-sm w-48" />
                          <Button size="sm" className="h-8 text-xs" disabled={updateDriver.isPending}
                            onClick={() => editingDriver && updateDriver.mutate({ id: editingDriver.id, name: editingDriver.name, phone: editingDriver.phone, vehicleInfo: editingDriver.vehicleInfo || undefined })}>
                            Save
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingDriver(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-sm">{d.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <a href={`tel:+91${d.phone}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                                <Phone className="w-3 h-3" />{d.phone}
                              </a>
                              {d.vehicleInfo && <span className="text-xs text-muted-foreground">· {d.vehicleInfo}</span>}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0"
                              onClick={() => setEditingDriver({ id: Number(d.id), name: d.name, phone: d.phone, vehicleInfo: d.vehicleInfo ?? "" })}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:bg-red-50"
                              onClick={() => removeDriver.mutate({ id: Number(d.id) })}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Add driver inline */}
            {addDriverOpen && (
              <Card className="mt-3 border-dashed border-2 border-primary/30">
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-3">New Driver</p>
                  <div className="flex flex-wrap gap-2 items-end">
                    <Input placeholder="Full Name *" value={newDriver.name} onChange={e => setNewDriver(d => ({ ...d, name: e.target.value }))} className="h-8 text-sm w-40" />
                    <Input placeholder="Phone *" value={newDriver.phone} onChange={e => setNewDriver(d => ({ ...d, phone: e.target.value }))} className="h-8 text-sm w-36" />
                    <Input placeholder="Vehicle / Notes" value={newDriver.vehicleInfo} onChange={e => setNewDriver(d => ({ ...d, vehicleInfo: e.target.value }))} className="h-8 text-sm w-48" />
                    <Button size="sm" className="h-8 text-xs gap-1" disabled={!newDriver.name || !newDriver.phone || addDriver.isPending}
                      onClick={() => addDriver.mutate({ name: newDriver.name, phone: newDriver.phone, vehicleInfo: newDriver.vehicleInfo || undefined })}>
                      <Plus className="w-3 h-3" /> Add
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setAddDriverOpen(false)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Customers ────────────────────────────────────────────── */}
          <TabsContent value="customers">
            <div className="space-y-2">
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
                      {/* Only master admin can grant/revoke admin access */}
                      {masterAdmin && (
                        c.role !== "admin" ? (
                          <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
                            onClick={() => setUserRole.mutate({ userId: Number(c.id), role: "admin" })}>
                            <UserCog className="w-3 h-3" /> Give Admin Access
                          </Button>
                        ) : (
                          !MASTER_PHONES.includes(c.phone ?? "") && !MASTER_EMAILS.includes(c.email ?? "") && (
                            <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground"
                              onClick={() => setUserRole.mutate({ userId: Number(c.id), role: "user" })}>
                              Remove Admin
                            </Button>
                          )
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Confirm Booking Modal ──────────────────────────────────── */}
      <Dialog open={confirmModal.open} onOpenChange={open => setConfirmModal(m => ({ ...m, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Confirm Booking #{confirmModal.bookingId}
            </DialogTitle>
          </DialogHeader>

          <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1 mb-2">
            <p><span className="text-muted-foreground">Customer:</span> <strong>{confirmModal.customerName}</strong>
              {confirmModal.customerPhone && <> · <a href={`tel:+91${confirmModal.customerPhone}`} className="text-primary hover:underline">{confirmModal.customerPhone}</a></>}
            </p>
            <p><span className="text-muted-foreground">Route:</span> {confirmModal.route} · {confirmModal.date}</p>
            {confirmModal.carName && <p><span className="text-muted-foreground">Car:</span> {confirmModal.carName}</p>}
            {confirmModal.pickupAddress && <p><span className="text-muted-foreground">Pickup:</span> {confirmModal.pickupAddress}</p>}
          </div>

          <div className="space-y-3">
            {/* Driver dropdown */}
            {(driversList?.length ?? 0) > 0 && (
              <div>
                <label className="text-sm font-medium mb-1 block">Select from Roster</label>
                <Select value={selectedDriverId} onValueChange={selectDriver}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Choose a driver…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">— Enter manually —</SelectItem>
                    {driversList!.map(d => (
                      <SelectItem key={d.id} value={String(d.id)}>
                        {d.name} · {d.phone}{d.vehicleInfo ? ` (${d.vehicleInfo})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium mb-1 block">Driver Name *</label>
                <Input placeholder="e.g. Ramesh Kumar" value={driverName} onChange={e => setDriverName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Driver Phone *</label>
                <Input placeholder="10-digit" value={driverPhone} onChange={e => setDriverPhone(e.target.value)} />
              </div>
            </div>

            {(confirmModal.customerEmail || confirmModal.customerPhone) && (
              <div className="bg-blue-50 rounded-lg p-2 text-xs text-blue-700 flex gap-2">
                <Mail className="w-3 h-3 shrink-0 mt-0.5" />
                <span>
                  Confirmation will be sent
                  {confirmModal.customerEmail && <> via email to <strong>{confirmModal.customerEmail}</strong></>}
                  {confirmModal.customerEmail && confirmModal.customerPhone && " and "}
                  {confirmModal.customerPhone && <>WhatsApp link for <strong>+91-{confirmModal.customerPhone}</strong> will be shown</>}
                  .
                </span>
              </div>
            )}

            <Button
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              disabled={!driverName.trim() || !driverPhone.trim() || confirmBooking.isPending}
              onClick={() => confirmBooking.mutate({ id: confirmModal.bookingId, driverName: driverName.trim(), driverPhone: driverPhone.trim() })}
            >
              <CheckCheck className="w-4 h-4 mr-2" />
              {confirmBooking.isPending ? "Confirming…" : "Confirm Booking & Notify Customer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Booking Modal ───────────────────────────────────── */}
      <Dialog open={cancelModal.open} onOpenChange={open => setCancelModal(m => ({ ...m, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Cancel Booking #{cancelModal.bookingId}
            </DialogTitle>
          </DialogHeader>

          <div className="bg-slate-50 rounded-lg p-3 text-sm space-y-1 mb-2">
            <p><span className="text-muted-foreground">Customer:</span> <strong>{cancelModal.customerName}</strong>
              {cancelModal.customerPhone && <> · <a href={`tel:+91${cancelModal.customerPhone}`} className="text-primary hover:underline">{cancelModal.customerPhone}</a></>}
            </p>
            <p><span className="text-muted-foreground">Route:</span> {cancelModal.route} · {cancelModal.date}</p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Reason (optional)</label>
              <Textarea
                placeholder="e.g. Vehicle unavailable, customer request…"
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                rows={3}
              />
            </div>

            {(cancelModal.customerEmail || cancelModal.customerPhone) && (
              <div className="bg-orange-50 rounded-lg p-2 text-xs text-orange-700 flex gap-2">
                <Mail className="w-3 h-3 shrink-0 mt-0.5" />
                <span>
                  Cancellation notice will be sent
                  {cancelModal.customerEmail && <> via email to <strong>{cancelModal.customerEmail}</strong></>}
                  {cancelModal.customerEmail && cancelModal.customerPhone && " and "}
                  {cancelModal.customerPhone && <>WhatsApp link for <strong>+91-{cancelModal.customerPhone}</strong> will be shown</>}
                  .
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setCancelModal(m => ({ ...m, open: false }))}>
                Keep Booking
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={cancelBooking.isPending}
                onClick={() => cancelBooking.mutate({ id: cancelModal.bookingId, reason: cancelReason.trim() || undefined })}
              >
                <X className="w-4 h-4 mr-1" />
                {cancelBooking.isPending ? "Cancelling…" : "Cancel & Notify"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Note Modal ────────────────────────────────────────────── */}
      <Dialog open={noteModal.open} onOpenChange={open => setNoteModal(m => ({ ...m, open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Internal Note — Booking #{noteModal.bookingId}</DialogTitle></DialogHeader>
          <Textarea placeholder="Internal note (not visible to customer)…" value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} />
          <Button className="w-full mt-2" disabled={addNote.isPending}
            onClick={() => addNote.mutate({ id: noteModal.bookingId, note: noteText })}>
            {addNote.isPending ? "Saving…" : "Save Note"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
