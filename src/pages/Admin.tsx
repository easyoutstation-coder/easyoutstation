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
  MessageCircle, Mail, AlertTriangle, TrendingUp, MapPin, Wallet, ShieldCheck,
  Globe, WifiOff, Search, FileText,
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

const EXPENSE_CATEGORIES = [
  "Driver Payout", "Fuel", "Toll / Parking", "Marketing / Ads",
  "Platform Fees", "Maintenance", "Salary", "Insurance", "Other",
];

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

  // Expense form state
  const [expenseForm, setExpenseForm] = useState({ category: "", description: "", amount: "", date: new Date().toISOString().slice(0, 10), bookingId: "" });
  const [showExpenseForm, setShowExpenseForm] = useState(false);

  // Booking search
  const [bookingSearch, setBookingSearch] = useState("");

  // FAQ management
  const [faqForm, setFaqForm] = useState({ question: "", answer: "", position: "0" });
  const [editingFaq, setEditingFaq] = useState<{ id: number; question: string; answer: string; position: string } | null>(null);

  // Route management
  const [routeForm, setRouteForm] = useState({ fromCity: "", toCity: "", distanceKm: "", durationHours: "", basePrice: "", isPopular: false });
  const [editingRoute, setEditingRoute] = useState<{ id: number; fromCity: string; toCity: string; distanceKm: string; durationHours: string; basePrice: string; isPopular: boolean } | null>(null);

  const utils = trpc.useUtils();
  const isAdmin = isAuthenticated && (user?.role === "admin" || user?.role === "super_admin");
  const isSuperAdmin = isAuthenticated && user?.role === "super_admin";
  const invalidateBookings = () => { utils.admin.getBookings.invalidate(); utils.admin.getStats.invalidate(); };

  const { data: stats } = trpc.admin.getStats.useQuery(undefined, { enabled: isAdmin });
  const { data: bookingsList, isLoading: bookingsLoading } = trpc.admin.getBookings.useQuery(
    { status: statusFilter }, { enabled: isAdmin }
  );
  const { data: driversList } = trpc.admin.getDrivers.useQuery(undefined, { enabled: isAdmin });
  const { data: customers } = trpc.admin.getCustomers.useQuery(undefined, { enabled: isAdmin });
  const { data: financials } = trpc.admin.getFinancials.useQuery(undefined, { enabled: isSuperAdmin });
  const { data: expensesList } = trpc.admin.getExpenses.useQuery(undefined, { enabled: isSuperAdmin });
  const { data: siteStatus, refetch: refetchSiteStatus } = trpc.admin.getSiteStatus.useQuery(undefined, { enabled: isSuperAdmin });
  const setSiteStatus = trpc.admin.setSiteStatus.useMutation({ onSuccess: () => refetchSiteStatus() });

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
  const addExpense = trpc.admin.addExpense.useMutation({
    onSuccess: () => {
      setShowExpenseForm(false);
      setExpenseForm({ category: "", description: "", amount: "", date: new Date().toISOString().slice(0, 10), bookingId: "" });
      utils.admin.getExpenses.invalidate();
      utils.admin.getFinancials.invalidate();
    },
  });
  const deleteExpense = trpc.admin.deleteExpense.useMutation({
    onSuccess: () => { utils.admin.getExpenses.invalidate(); utils.admin.getFinancials.invalidate(); },
  });

  const { data: faqsList } = trpc.admin.getFaqs.useQuery(undefined, { enabled: isAdmin });
  const addFaq = trpc.admin.addFaq.useMutation({ onSuccess: () => { setFaqForm({ question: "", answer: "", position: "0" }); utils.admin.getFaqs.invalidate(); } });
  const updateFaq = trpc.admin.updateFaq.useMutation({ onSuccess: () => { setEditingFaq(null); utils.admin.getFaqs.invalidate(); } });
  const deleteFaq = trpc.admin.deleteFaq.useMutation({ onSuccess: () => utils.admin.getFaqs.invalidate() });

  const { data: adminRoutes } = trpc.admin.getAdminRoutes.useQuery(undefined, { enabled: isAdmin });
  const addRoute = trpc.admin.addRoute.useMutation({ onSuccess: () => { setRouteForm({ fromCity: "", toCity: "", distanceKm: "", durationHours: "", basePrice: "", isPopular: false }); utils.admin.getAdminRoutes.invalidate(); } });
  const updateRoute = trpc.admin.updateRoute.useMutation({ onSuccess: () => { setEditingRoute(null); utils.admin.getAdminRoutes.invalidate(); } });
  const deleteRoute = trpc.admin.deleteRoute.useMutation({ onSuccess: () => utils.admin.getAdminRoutes.invalidate() });

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
  if (!isAuthenticated) {
    navigate("/login?redirect=/admin");
    return null;
  }
  if (user?.role !== "admin" && user?.role !== "super_admin") {
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
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="gap-1.5"><LayoutDashboard className="w-4 h-4" />Overview</TabsTrigger>
            <TabsTrigger value="bookings" className="gap-1.5">
              <Car className="w-4 h-4" />Bookings
              {(stats?.pending ?? 0) > 0 && <span className="ml-1 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{stats!.pending}</span>}
            </TabsTrigger>
            <TabsTrigger value="drivers" className="gap-1.5"><Car className="w-4 h-4" />Drivers</TabsTrigger>
            <TabsTrigger value="customers" className="gap-1.5"><Users className="w-4 h-4" />Customers</TabsTrigger>
            <TabsTrigger value="content" className="gap-1.5"><FileText className="w-4 h-4" />Content</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="financials" className="gap-1.5 text-emerald-700"><TrendingUp className="w-4 h-4" />Financials</TabsTrigger>}
          </TabsList>

          {/* ── Overview ────────────────────────────────────────────── */}
          <TabsContent value="overview" className="space-y-5">
            {/* Site live/offline toggle — super_admin only */}
            {isSuperAdmin && (
              <Card className={`border-2 ${siteStatus?.online === false ? "border-red-300 bg-red-50" : "border-green-200 bg-green-50"}`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${siteStatus?.online === false ? "bg-red-100" : "bg-green-100"}`}>
                        {siteStatus?.online === false
                          ? <WifiOff className="w-5 h-5 text-red-600" />
                          : <Globe className="w-5 h-5 text-green-600" />}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">
                          Website is {siteStatus?.online === false ? "OFFLINE" : "LIVE"}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {siteStatus?.online === false
                            ? "Visitors see maintenance page. You can still browse as admin."
                            : "Site is live and accepting bookings from all visitors."}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSiteStatus.mutate({ online: siteStatus?.online === false })}
                      disabled={setSiteStatus.isPending}
                      className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                        siteStatus?.online === false ? "bg-red-400" : "bg-green-500"
                      } ${setSiteStatus.isPending ? "opacity-50" : ""}`}
                      style={{ width: "52px" }}
                    >
                      <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                        siteStatus?.online === false ? "translate-x-0" : "translate-x-6"
                      }`} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )}
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
            <div className="flex flex-wrap gap-2 mb-3">
              {(["pending", "confirmed", "all", "completed", "cancelled"] as const).map(s => (
                <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm"
                  onClick={() => setStatusFilter(s)} className="capitalize">
                  {s}{s === "pending" && (stats?.pending ?? 0) > 0 ? ` (${stats!.pending})` : ""}
                </Button>
              ))}
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or booking ID…"
                value={bookingSearch}
                onChange={e => setBookingSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>

            {bookingsLoading ? (
              <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" /></div>
            ) : !bookingsList?.length ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground">No bookings found.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {bookingsList.filter(b => {
                  if (!bookingSearch.trim()) return true;
                  const q = bookingSearch.toLowerCase();
                  return (
                    String(b.id).includes(q) ||
                    b.customerName.toLowerCase().includes(q) ||
                    (b.customerPhone ?? "").includes(q) ||
                    (b.customerEmail ?? "").toLowerCase().includes(q)
                  );
                }).map(b => {
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
                          {c.role === "admin" && <Badge className="bg-blue-100 text-blue-700 text-xs border-0">Admin</Badge>}
                          {c.role === "super_admin" && <Badge className="bg-purple-100 text-purple-700 text-xs border-0">Super Admin</Badge>}
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
                      {/* Only super_admin can grant/revoke roles */}
                      {isSuperAdmin && c.role !== "super_admin" && (
                        <div className="flex gap-1">
                          {c.role === "user" && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1"
                                onClick={() => setUserRole.mutate({ userId: Number(c.id), role: "admin" })}>
                                <UserCog className="w-3 h-3" /> Make Admin
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-purple-200 text-purple-700 hover:bg-purple-50"
                                onClick={() => setUserRole.mutate({ userId: Number(c.id), role: "super_admin" })}>
                                <ShieldCheck className="w-3 h-3" /> Super Admin
                              </Button>
                            </>
                          )}
                          {c.role === "admin" && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-purple-200 text-purple-700 hover:bg-purple-50"
                                onClick={() => setUserRole.mutate({ userId: Number(c.id), role: "super_admin" })}>
                                <ShieldCheck className="w-3 h-3" /> Upgrade to Super
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500 hover:bg-red-50"
                                onClick={() => setUserRole.mutate({ userId: Number(c.id), role: "user" })}>
                                Remove
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Content (FAQ + Routes) ──────────────────────────────── */}
          <TabsContent value="content" className="space-y-8">

            {/* FAQ Management */}
            <div>
              <h2 className="font-semibold mb-4 flex items-center gap-2"><FileText className="w-4 h-4" />FAQ Management</h2>

              {/* Add / Edit FAQ form */}
              <Card className="mb-4 border-dashed border-2 border-primary/20">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium">{editingFaq ? `Editing FAQ #${editingFaq.id}` : "Add New FAQ"}</p>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Question *</label>
                    <Input
                      placeholder="e.g. Are there hidden charges?"
                      value={editingFaq ? editingFaq.question : faqForm.question}
                      onChange={e => editingFaq ? setEditingFaq(f => f ? { ...f, question: e.target.value } : f) : setFaqForm(f => ({ ...f, question: e.target.value }))}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Answer *</label>
                    <Textarea
                      placeholder="Enter the answer…"
                      rows={3}
                      value={editingFaq ? editingFaq.answer : faqForm.answer}
                      onChange={e => editingFaq ? setEditingFaq(f => f ? { ...f, answer: e.target.value } : f) : setFaqForm(f => ({ ...f, answer: e.target.value }))}
                      className="text-sm"
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="w-24">
                      <label className="text-xs font-medium mb-1 block">Order</label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={editingFaq ? editingFaq.position : faqForm.position}
                        onChange={e => editingFaq ? setEditingFaq(f => f ? { ...f, position: e.target.value } : f) : setFaqForm(f => ({ ...f, position: e.target.value }))}
                        className="text-sm h-8"
                      />
                    </div>
                    <div className="flex gap-2 mt-5">
                      {editingFaq ? (
                        <>
                          <Button size="sm" className="h-8 text-xs"
                            disabled={!editingFaq.question || !editingFaq.answer || updateFaq.isPending}
                            onClick={() => updateFaq.mutate({ id: editingFaq.id, question: editingFaq.question, answer: editingFaq.answer, position: parseInt(editingFaq.position) || 0 })}>
                            {updateFaq.isPending ? "Saving…" : "Save"}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingFaq(null)}>Cancel</Button>
                        </>
                      ) : (
                        <Button size="sm" className="h-8 text-xs gap-1"
                          disabled={!faqForm.question || !faqForm.answer || addFaq.isPending}
                          onClick={() => addFaq.mutate({ question: faqForm.question, answer: faqForm.answer, position: parseInt(faqForm.position) || 0 })}>
                          <Plus className="w-3 h-3" />{addFaq.isPending ? "Adding…" : "Add FAQ"}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* FAQ List */}
              {!faqsList?.length ? (
                <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No FAQs yet. Add your first FAQ above.</CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {faqsList.map(f => (
                    <Card key={f.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{f.question}</p>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{f.answer}</p>
                            <p className="text-xs text-slate-400 mt-1">Order: {f.position} · {f.isActive ? "Active" : "Hidden"}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                              onClick={() => setEditingFaq({ id: Number(f.id), question: f.question, answer: f.answer, position: String(f.position) })}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                              onClick={() => deleteFaq.mutate({ id: Number(f.id) })}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Route Management */}
            <div>
              <h2 className="font-semibold mb-4 flex items-center gap-2"><MapPin className="w-4 h-4" />Route Management</h2>

              {/* Add / Edit Route form */}
              <Card className="mb-4 border-dashed border-2 border-primary/20">
                <CardContent className="p-4 space-y-3">
                  <p className="text-sm font-medium">{editingRoute ? `Editing Route #${editingRoute.id}` : "Add New Route"}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-medium mb-1 block">From City *</label>
                      <Input placeholder="e.g. Delhi"
                        value={editingRoute ? editingRoute.fromCity : routeForm.fromCity}
                        onChange={e => editingRoute ? setEditingRoute(r => r ? { ...r, fromCity: e.target.value } : r) : setRouteForm(r => ({ ...r, fromCity: e.target.value }))}
                        className="text-sm h-8" />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">To City *</label>
                      <Input placeholder="e.g. Manali"
                        value={editingRoute ? editingRoute.toCity : routeForm.toCity}
                        onChange={e => editingRoute ? setEditingRoute(r => r ? { ...r, toCity: e.target.value } : r) : setRouteForm(r => ({ ...r, toCity: e.target.value }))}
                        className="text-sm h-8" />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Distance (km) *</label>
                      <Input type="number" placeholder="e.g. 520"
                        value={editingRoute ? editingRoute.distanceKm : routeForm.distanceKm}
                        onChange={e => editingRoute ? setEditingRoute(r => r ? { ...r, distanceKm: e.target.value } : r) : setRouteForm(r => ({ ...r, distanceKm: e.target.value }))}
                        className="text-sm h-8" />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Duration (hrs) *</label>
                      <Input type="number" placeholder="e.g. 12"
                        value={editingRoute ? editingRoute.durationHours : routeForm.durationHours}
                        onChange={e => editingRoute ? setEditingRoute(r => r ? { ...r, durationHours: e.target.value } : r) : setRouteForm(r => ({ ...r, durationHours: e.target.value }))}
                        className="text-sm h-8" />
                    </div>
                    <div>
                      <label className="text-xs font-medium mb-1 block">Base Price (₹) *</label>
                      <Input type="number" placeholder="e.g. 6000"
                        value={editingRoute ? editingRoute.basePrice : routeForm.basePrice}
                        onChange={e => editingRoute ? setEditingRoute(r => r ? { ...r, basePrice: e.target.value } : r) : setRouteForm(r => ({ ...r, basePrice: e.target.value }))}
                        className="text-sm h-8" />
                    </div>
                    <div className="flex items-end pb-1.5">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox"
                          checked={editingRoute ? editingRoute.isPopular : routeForm.isPopular}
                          onChange={e => editingRoute ? setEditingRoute(r => r ? { ...r, isPopular: e.target.checked } : r) : setRouteForm(r => ({ ...r, isPopular: e.target.checked }))}
                          className="rounded" />
                        Popular route
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {editingRoute ? (
                      <>
                        <Button size="sm" className="h-8 text-xs"
                          disabled={!editingRoute.fromCity || !editingRoute.toCity || !editingRoute.distanceKm || updateRoute.isPending}
                          onClick={() => updateRoute.mutate({ id: editingRoute.id, fromCity: editingRoute.fromCity, toCity: editingRoute.toCity, distanceKm: parseInt(editingRoute.distanceKm), durationHours: parseInt(editingRoute.durationHours) || 0, basePrice: editingRoute.basePrice, isPopular: editingRoute.isPopular })}>
                          {updateRoute.isPending ? "Saving…" : "Save Route"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingRoute(null)}>Cancel</Button>
                      </>
                    ) : (
                      <Button size="sm" className="h-8 text-xs gap-1"
                        disabled={!routeForm.fromCity || !routeForm.toCity || !routeForm.distanceKm || addRoute.isPending}
                        onClick={() => addRoute.mutate({ fromCity: routeForm.fromCity, toCity: routeForm.toCity, distanceKm: parseInt(routeForm.distanceKm), durationHours: parseInt(routeForm.durationHours) || 0, basePrice: routeForm.basePrice, isPopular: routeForm.isPopular })}>
                        <Plus className="w-3 h-3" />{addRoute.isPending ? "Adding…" : "Add Route"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Route List */}
              {!adminRoutes?.length ? (
                <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No routes yet.</CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {adminRoutes.map(r => (
                    <Card key={r.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{r.fromCity} → {r.toCity}</p>
                              {r.isPopular && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Popular</span>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{r.distanceKm} km · {r.durationHours}h · Base ₹{parseFloat(r.basePrice.toString()).toLocaleString("en-IN")}</p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                              onClick={() => setEditingRoute({ id: Number(r.id), fromCity: r.fromCity, toCity: r.toCity, distanceKm: String(r.distanceKm), durationHours: String(r.durationHours), basePrice: String(r.basePrice), isPopular: r.isPopular ?? false })}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                              onClick={() => deleteRoute.mutate({ id: Number(r.id) })}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── Financials (super_admin only) ─────────────────────── */}
          {isSuperAdmin && (
            <TabsContent value="financials" className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="p-4">
                    <p className="text-xs text-emerald-700 font-medium">Gross Revenue</p>
                    <p className="text-2xl font-bold text-emerald-800">₹{(financials?.totals.grossRevenue ?? 0).toLocaleString("en-IN")}</p>
                    <p className="text-xs text-emerald-600">{financials?.totals.totalBookings ?? 0} active bookings</p>
                  </CardContent>
                </Card>
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <p className="text-xs text-blue-700 font-medium">Collected</p>
                    <p className="text-2xl font-bold text-blue-800">₹{(financials?.totals.collected ?? 0).toLocaleString("en-IN")}</p>
                    <p className="text-xs text-blue-600">Payments received</p>
                  </CardContent>
                </Card>
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <p className="text-xs text-red-700 font-medium">Total Expenses</p>
                    <p className="text-2xl font-bold text-red-800">₹{(financials?.totals.totalExpenses ?? 0).toLocaleString("en-IN")}</p>
                    <p className="text-xs text-red-600">Logged expenses</p>
                  </CardContent>
                </Card>
                <Card className={`border-2 ${(financials?.totals.profit ?? 0) >= 0 ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50"}`}>
                  <CardContent className="p-4">
                    <p className={`text-xs font-medium ${(financials?.totals.profit ?? 0) >= 0 ? "text-emerald-700" : "text-red-700"}`}>Net Profit</p>
                    <p className={`text-2xl font-bold ${(financials?.totals.profit ?? 0) >= 0 ? "text-emerald-800" : "text-red-800"}`}>
                      ₹{Math.abs(financials?.totals.profit ?? 0).toLocaleString("en-IN")}
                      {(financials?.totals.profit ?? 0) < 0 ? " loss" : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">Collected − Expenses</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                    <p className="text-xl font-bold text-amber-600">₹{(financials?.totals.outstanding ?? 0).toLocaleString("en-IN")}</p>
                    <p className="text-xs text-muted-foreground">Confirmed but unpaid</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Lost (Cancelled)</p>
                    <p className="text-xl font-bold text-slate-500">₹{(financials?.totals.lostRevenue ?? 0).toLocaleString("en-IN")}</p>
                    <p className="text-xs text-muted-foreground">Value of cancelled bookings</p>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Trend */}
              {(financials?.monthly?.length ?? 0) > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Monthly Trend (Last 6 Months)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead><tr className="border-b">
                          <th className="text-left py-1 pr-4 text-muted-foreground font-medium">Month</th>
                          <th className="text-right py-1 pr-4 text-muted-foreground font-medium">Bookings</th>
                          <th className="text-right py-1 pr-4 text-muted-foreground font-medium">Revenue</th>
                          <th className="text-right py-1 text-muted-foreground font-medium">Collected</th>
                        </tr></thead>
                        <tbody>
                          {financials!.monthly.map((m: any) => (
                            <tr key={m.month} className="border-b last:border-0">
                              <td className="py-1.5 pr-4 font-medium">{m.label}</td>
                              <td className="py-1.5 pr-4 text-right">{m.bookingCount}</td>
                              <td className="py-1.5 pr-4 text-right">₹{parseFloat(m.revenue).toLocaleString("en-IN")}</td>
                              <td className="py-1.5 text-right text-emerald-700">₹{parseFloat(m.collected).toLocaleString("en-IN")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid lg:grid-cols-2 gap-4">
                {/* Revenue by Route */}
                {(financials?.byRoute?.length ?? 0) > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-primary" />Revenue by Route</h3>
                      <div className="space-y-2">
                        {financials!.byRoute.map((r: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div>
                              <span className="font-medium">{r.fromCity} → {r.toCity}</span>
                              <span className="text-muted-foreground ml-2">{r.trips} trips · avg ₹{Math.round(parseFloat(r.avgFare)).toLocaleString("en-IN")}</span>
                            </div>
                            <span className="font-semibold text-primary">₹{parseFloat(r.revenue).toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Driver Performance */}
                {(financials?.byDriver?.length ?? 0) > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Car className="w-4 h-4 text-primary" />Driver Performance</h3>
                      <div className="space-y-2">
                        {financials!.byDriver.map((d: any, i: number) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <div>
                              <span className="font-medium">{d.driverName}</span>
                              <span className="text-muted-foreground ml-2">{d.trips} trips</span>
                            </div>
                            <span className="font-semibold text-primary">₹{parseFloat(d.revenue).toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Top Customers */}
              {(financials?.topCustomers?.length ?? 0) > 0 && (
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Top Customers by Revenue</h3>
                    <div className="space-y-2">
                      {financials!.topCustomers.map((c: any, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">{i + 1}</span>
                            <div>
                              <span className="font-medium">{c.customerName}</span>
                              {c.customerPhone && (
                                <a href={`tel:+91${c.customerPhone}`} className="text-muted-foreground hover:text-primary ml-2">{c.customerPhone}</a>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-primary">₹{parseFloat(c.totalSpend).toLocaleString("en-IN")}</span>
                            <span className="text-muted-foreground ml-2">{c.trips} trips</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Expense Tracker */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" />Expense Tracker</h3>
                    <Button size="sm" className="gap-1 h-8 text-xs" onClick={() => setShowExpenseForm(v => !v)}>
                      <Plus className="w-3 h-3" /> Add Expense
                    </Button>
                  </div>

                  {showExpenseForm && (
                    <div className="mb-4 p-3 bg-slate-50 rounded-lg space-y-2 border border-slate-200">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-medium mb-1 block">Category *</label>
                          <Select value={expenseForm.category} onValueChange={v => setExpenseForm(f => ({ ...f, category: v }))}>
                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
                            <SelectContent>
                              {EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Amount (₹) *</label>
                          <Input type="number" placeholder="0" className="h-8 text-xs" value={expenseForm.amount}
                            onChange={e => setExpenseForm(f => ({ ...f, amount: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Date *</label>
                          <Input type="date" className="h-8 text-xs" value={expenseForm.date}
                            onChange={e => setExpenseForm(f => ({ ...f, date: e.target.value }))} />
                        </div>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Booking ID (optional)</label>
                          <Input placeholder="e.g. 42" className="h-8 text-xs" value={expenseForm.bookingId}
                            onChange={e => setExpenseForm(f => ({ ...f, bookingId: e.target.value }))} />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block">Description</label>
                        <Input placeholder="Notes…" className="h-8 text-xs" value={expenseForm.description}
                          onChange={e => setExpenseForm(f => ({ ...f, description: e.target.value }))} />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" className="h-7 text-xs" disabled={!expenseForm.category || !expenseForm.amount || !expenseForm.date || addExpense.isPending}
                          onClick={() => addExpense.mutate({
                            category: expenseForm.category,
                            description: expenseForm.description || undefined,
                            amount: parseFloat(expenseForm.amount),
                            date: expenseForm.date,
                            bookingId: expenseForm.bookingId ? parseInt(expenseForm.bookingId) : undefined,
                          })}>
                          {addExpense.isPending ? "Saving…" : "Save"}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowExpenseForm(false)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {/* Expense category summary */}
                  {(financials?.byExpenseCategory?.length ?? 0) > 0 && (
                    <div className="mb-4 grid grid-cols-2 gap-2">
                      {financials!.byExpenseCategory.map((e: any) => (
                        <div key={e.category} className="flex justify-between text-xs bg-red-50 rounded px-2 py-1.5">
                          <span className="text-red-700">{e.category}</span>
                          <span className="font-semibold text-red-800">₹{parseFloat(e.total).toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Expense list */}
                  {!expensesList?.length ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No expenses logged yet.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto">
                      {expensesList.map(e => (
                        <div key={e.id} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0">
                          <div>
                            <span className="font-medium">{e.category}</span>
                            {e.description && <span className="text-muted-foreground ml-1">· {e.description}</span>}
                            <div className="text-muted-foreground">{new Date(e.date).toLocaleDateString("en-IN")}{e.bookingId ? ` · Booking #${e.bookingId}` : ""}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-red-700">₹{parseFloat(e.amount.toString()).toLocaleString("en-IN")}</span>
                            <button onClick={() => deleteExpense.mutate({ id: Number(e.id) })} className="text-muted-foreground hover:text-red-500">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
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
