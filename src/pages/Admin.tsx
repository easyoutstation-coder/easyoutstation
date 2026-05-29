import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { toast } from "sonner";
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
  Globe, WifiOff, Search, FileText, Bot, Send, Loader2, ChevronRight, Tag,
  Gift, Share2, RefreshCw, Building2, Activity, Map, Truck,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon URLs for Vite/webpack bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});
const greenIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41],
});
function MapFitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) map.fitBounds(positions, { padding: [40, 40] });
  }, [positions, map]);
  return null;
}

type BookingStatus = "pending" | "confirmed" | "driver_assigned" | "completed" | "cancelled";
type PaymentStatus = "pending" | "paid" | "refunded";

const statusColors: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-green-100 text-green-700",
  driver_assigned: "bg-teal-100 text-teal-700",
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

function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_W = 900;
        const ratio = Math.min(1, MAX_W / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

const VEHICLE_CATEGORIES = ["sedan","muv","suv","premium","luxury","tempo","bus","electric"] as const;
const FUEL_TYPES = ["petrol","diesel","cng","hybrid","electric"] as const;
const TRANSMISSIONS = ["manual","automatic"] as const;
const DEFAULT_VEHICLE_FORM = {
  name: "", brand: "", model: "", category: "sedan" as typeof VEHICLE_CATEGORIES[number],
  seats: 4, pricePerKm: "", driverCharges: "250",
  fuelType: "diesel" as typeof FUEL_TYPES[number],
  transmission: "manual" as typeof TRANSMISSIONS[number],
  description: "", imageUrl: "",
};

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

  // Agent chat
  type AgentMsg = { role: "user" | "assistant"; content: string; isPending?: boolean };
  type ToolProposal = { toolName: string; toolInput: Record<string, any>; toolUseId: string; rawContent: any[]; priorMessages: any[] };
  const [agentMessages, setAgentMessages] = useState<AgentMsg[]>([
    { role: "assistant", content: "Hi! I can help you manage bookings — search, assign drivers, confirm, cancel, or mark trips as completed. What would you like to do?" }
  ]);
  const [agentInput, setAgentInput] = useState("");
  const [pendingTool, setPendingTool] = useState<ToolProposal | null>(null);
  const agentBottomRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const isAdmin = isAuthenticated && (user?.role === "admin" || user?.role === "super_admin");
  const isSuperAdmin = isAuthenticated && user?.role === "super_admin";
  const canManageContent = isSuperAdmin || !!(user as any)?.canManageContent;
  const invalidateBookings = () => { utils.admin.getBookings.invalidate(); utils.admin.getStats.invalidate(); };

  const { data: stats } = trpc.admin.getStats.useQuery(undefined, { enabled: isAdmin });
  const { data: bookingsList, isLoading: bookingsLoading } = trpc.admin.getBookings.useQuery(
    { status: statusFilter }, { enabled: isAdmin }
  );
  const { data: driversList } = trpc.admin.getDrivers.useQuery(undefined, { enabled: isAdmin });
  const { data: customers } = trpc.admin.getCustomers.useQuery(undefined, { enabled: isAdmin });
  const [expandedCustomerId, setExpandedCustomerId] = useState<number | null>(null);
  const { data: customerProfile } = trpc.admin.getCustomerProfile.useQuery(
    { userId: expandedCustomerId! },
    { enabled: expandedCustomerId !== null }
  );
  const setCustomerTag = trpc.admin.setCustomerTag.useMutation({ onSuccess: () => utils.admin.getCustomers.invalidate() });
  const { data: vendorsList, refetch: refetchVendors } = trpc.admin.getVendors.useQuery(undefined, { enabled: isAdmin });
  const addVendorMut = trpc.admin.addVendor.useMutation({ onSuccess: () => { setVendorForm({ name: "", phone: "", email: "", company: "", city: "" }); refetchVendors(); toast.success("Vendor added"); } });
  const updateVendorMut = trpc.admin.updateVendor.useMutation({ onSuccess: () => { setEditingVendor(null); refetchVendors(); } });
  const removeVendorMut = trpc.admin.removeVendor.useMutation({ onSuccess: () => refetchVendors() });
  const assignDriverToVendorMut = trpc.admin.assignDriverToVendor.useMutation({ onSuccess: () => { refetchVendors(); utils.admin.getDrivers.invalidate(); toast.success("Driver assigned"); } });
  const [vendorForm, setVendorForm] = useState({ name: "", phone: "", email: "", company: "", city: "" });
  const [editingVendor, setEditingVendor] = useState<any | null>(null);
  const { data: financials } = trpc.admin.getFinancials.useQuery(undefined, { enabled: isSuperAdmin });
  const { data: expensesList } = trpc.admin.getExpenses.useQuery(undefined, { enabled: isSuperAdmin });
  const { data: siteStatus, refetch: refetchSiteStatus } = trpc.admin.getSiteStatus.useQuery(undefined, { enabled: isSuperAdmin });
  const setSiteStatus = trpc.admin.setSiteStatus.useMutation({ onSuccess: () => refetchSiteStatus() });
  const { data: discountData, refetch: refetchDiscount } = trpc.admin.getDiscount.useQuery(undefined, { enabled: isSuperAdmin });
  const setDiscount = trpc.admin.setDiscount.useMutation({ onSuccess: () => refetchDiscount() });
  const [discountForm, setDiscountForm] = useState({ enabled: false, type: "percentage" as "percentage" | "fixed", value: 10, maxDiscount: "" as string, verbiage: "10% off on your first ride!" });
  const [discountSaved, setDiscountSaved] = useState(false);
  useEffect(() => {
    if (discountData) setDiscountForm({ ...discountData, maxDiscount: discountData.maxDiscount?.toString() ?? "" });
  }, [discountData]);

  const { data: corporateLeads, refetch: refetchCorporateLeads } = trpc.admin.getCorporateEnquiries.useQuery(undefined, { enabled: isAdmin });
  const { data: corporateAccountsList, refetch: refetchCorporateAccounts } = trpc.admin.getCorporateAccounts.useQuery(undefined, { enabled: isAdmin });
  const updateCorpAccountStatus = trpc.admin.updateCorporateAccountStatus.useMutation({ onSuccess: () => refetchCorporateAccounts() });
  const [corpNoteId, setCorpNoteId] = useState<number | null>(null);
  const [corpNoteText, setCorpNoteText] = useState("");
  const updateLeadStatus = trpc.admin.updateCorporateEnquiryStatus.useMutation({ onSuccess: () => refetchCorporateLeads() });
  const [leadNoteId, setLeadNoteId] = useState<number | null>(null);
  const [leadNoteText, setLeadNoteText] = useState("");

  const { data: referralProgramData, refetch: refetchReferralProgram } = trpc.admin.getReferralProgram.useQuery(undefined, { enabled: isSuperAdmin });
  const setReferralProgram = trpc.admin.setReferralProgram.useMutation({ onSuccess: () => refetchReferralProgram() });
  const { data: referralStatsData, refetch: refetchReferralStats } = trpc.admin.getReferralStats.useQuery(undefined, { enabled: isSuperAdmin });
  const allocateDuePoints = trpc.admin.allocateDuePoints.useMutation({ onSuccess: () => refetchReferralStats() });
  const [referralForm, setReferralForm] = useState({
    enabled: true, referrerAmount: 100, referredAmount: 100, pointsExpireDays: 90,
    headline: "Give ₹100. Get ₹100.", subheadline: "", description: "", terms: "",
  });
  const [referralSaved, setReferralSaved] = useState(false);
  useEffect(() => {
    if (referralProgramData) setReferralForm(f => ({ ...f, ...referralProgramData }));
  }, [referralProgramData]);

  const { data: fleetPricing, refetch: refetchFleetPricing } = trpc.admin.getFleetPricing.useQuery(undefined, { enabled: isSuperAdmin });
  const updateCarPricing = trpc.admin.updateCarPricing.useMutation({
    onSuccess: (_, vars) => {
      refetchFleetPricing();
      setFleetSaved(s => ({ ...s, [vars.id]: true }));
      setTimeout(() => setFleetSaved(s => ({ ...s, [vars.id]: false })), 2000);
    },
  });
  const [fleetEdits, setFleetEdits] = useState<Record<number, { pricePerKm: string; driverCharges: string }>>({});
  const [fleetSaved, setFleetSaved] = useState<Record<number, boolean>>({});
  useEffect(() => {
    if (fleetPricing) {
      setFleetEdits(Object.fromEntries(
        fleetPricing.map(c => [c.id, { pricePerKm: c.pricePerKm, driverCharges: c.driverCharges }])
      ));
    }
  }, [fleetPricing]);

  const [addVehicleOpen, setAddVehicleOpen] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ ...DEFAULT_VEHICLE_FORM });
  const [vehicleImagePreview, setVehicleImagePreview] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const addCar = trpc.admin.addCar.useMutation({
    onSuccess: () => {
      setAddVehicleOpen(false);
      setVehicleForm({ ...DEFAULT_VEHICLE_FORM });
      setVehicleImagePreview("");
      refetchFleetPricing();
      utils.car.list.invalidate();
    },
  });
  const deleteCar = trpc.admin.deleteCar.useMutation({
    onSuccess: () => {
      setDeleteConfirmId(null);
      refetchFleetPricing();
      utils.car.list.invalidate();
    },
  });

  const [abandonedResult, setAbandonedResult] = useState<{ total: number; sent: number } | null>(null);
  const sendAbandonedReminders = trpc.booking.sendAbandonedReminders.useMutation({
    onSuccess: (res) => setAbandonedResult(res),
  });

  // Danger Zone — data-clear state
  type ClearCategory = "bookings" | "expenses" | "searches" | "reviews" | "all";
  const [clearCategory, setClearCategory] = useState<ClearCategory>("bookings");
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearOtpSent, setClearOtpSent] = useState(false);
  const [clearMaskedPhone, setClearMaskedPhone] = useState("");
  const [clearOtp, setClearOtp] = useState("");
  const [clearDone, setClearDone] = useState<string[] | null>(null);
  const sendClearOtp = trpc.admin.sendClearOtp.useMutation({
    onSuccess: (res) => { setClearOtpSent(true); setClearMaskedPhone(res.maskedPhone); },
  });
  const clearData = trpc.admin.clearData.useMutation({
    onSuccess: (res) => { setClearDone(res.deleted); utils.admin.getStats.invalidate(); utils.admin.getFinancials.invalidate(); utils.admin.getExpenses.invalidate(); },
  });

  async function handleVehicleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file);
    setVehicleImagePreview(compressed);
    setVehicleForm(f => ({ ...f, imageUrl: compressed }));
  }

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
  const setContentPermission = trpc.admin.setContentPermission.useMutation({ onSuccess: () => utils.admin.getCustomers.invalidate() });
  const setTestUser = trpc.admin.setTestUser.useMutation({
    onSuccess: (_, vars) => {
      utils.admin.getCustomers.invalidate();
      toast.success(vars.isTestUser ? "Marked as test user — payment bypassed for this account" : "Test user flag removed");
    },
    onError: (e) => toast.error(`Failed: ${e.message}`),
  });

  // Access grant
  const [grantContact, setGrantContact] = useState("");
  const [grantRole, setGrantRole] = useState<"admin" | "super_admin" | "user">("admin");
  const grantAccess = trpc.admin.grantAccessByContact.useMutation({
    onSuccess: (res) => { toast.success(`Access updated for ${res.name ?? grantContact}`); setGrantContact(""); utils.admin.getCustomers.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  // Payments
  const { data: paymentsList, refetch: refetchPayments } = trpc.admin.getPayments.useQuery(undefined, { enabled: isSuperAdmin });
  const processRefund = trpc.admin.processRefund.useMutation({
    onSuccess: (res) => {
      refetchPayments();
      if (res.razorpayPaymentId) {
        toast.success(`Refund processed. Razorpay Payment ID: ${res.razorpayPaymentId} — complete refund in Razorpay dashboard.`, { duration: 8000 });
      } else {
        toast.success("Refund marked and customer notified via SMS + email.");
      }
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: faqsList } = trpc.admin.getFaqs.useQuery(undefined, { enabled: isAdmin });
  const addFaq = trpc.admin.addFaq.useMutation({ onSuccess: () => { setFaqForm({ question: "", answer: "", position: "0" }); utils.admin.getFaqs.invalidate(); } });
  const updateFaq = trpc.admin.updateFaq.useMutation({ onSuccess: () => { setEditingFaq(null); utils.admin.getFaqs.invalidate(); } });
  const deleteFaq = trpc.admin.deleteFaq.useMutation({ onSuccess: () => utils.admin.getFaqs.invalidate() });

  const { data: adminRoutes } = trpc.admin.getAdminRoutes.useQuery(undefined, { enabled: isAdmin });
  const [waLogsPage, setWaLogsPage] = useState(1);
  const { data: waLogsData } = trpc.admin.getWhatsappLogs.useQuery({ page: waLogsPage }, { enabled: isAdmin });
  const { data: liveTrips, refetch: refetchLive } = trpc.admin.getLiveTrips.useQuery(undefined, { enabled: isAdmin, refetchInterval: 30_000 });
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const { data: analytics } = trpc.admin.getAnalytics.useQuery({ days: analyticsDays }, { enabled: isAdmin });
  const [expandedBookingId, setExpandedBookingId] = useState<number | null>(null);
  const { data: bookingTimeline } = trpc.admin.getBookingTimeline.useQuery(
    { bookingId: expandedBookingId! },
    { enabled: expandedBookingId !== null }
  );
  const addRoute = trpc.admin.addRoute.useMutation({ onSuccess: () => { setRouteForm({ fromCity: "", toCity: "", distanceKm: "", durationHours: "", basePrice: "", isPopular: false }); utils.admin.getAdminRoutes.invalidate(); } });
  const updateRoute = trpc.admin.updateRoute.useMutation({ onSuccess: () => { setEditingRoute(null); utils.admin.getAdminRoutes.invalidate(); } });
  const deleteRoute = trpc.admin.deleteRoute.useMutation({ onSuccess: () => utils.admin.getAdminRoutes.invalidate() });

  const agentChat = trpc.agent.chat.useMutation();
  const agentExecute = trpc.agent.executeAndContinue.useMutation();

  useEffect(() => {
    agentBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentMessages, pendingTool]);

  async function sendAgentMessage(text: string) {
    if (!text.trim()) return;
    const userMsg: AgentMsg = { role: "user", content: text };
    const history = [...agentMessages.filter(m => !m.isPending), userMsg];
    setAgentMessages([...history, { role: "assistant", content: "…", isPending: true }]);
    setAgentInput("");
    setPendingTool(null);

    // Only send real API turns — skip the initial UI greeting (role: assistant, not from API)
    const firstUserIdx = history.findIndex(m => m.role === "user");
    const apiMessages = history
      .slice(firstUserIdx >= 0 ? firstUserIdx : 0)
      .map(m => ({ role: m.role, content: m.content }));
    try {
      const result = await agentChat.mutateAsync({ messages: apiMessages });
      if (result.type === "tool_proposal") {
        const assistantContent = [
          ...(result.text ? [{ type: "text", text: result.text }] : []),
          ...(result.rawContent ?? []).filter((b: any) => b.type === "tool_use"),
        ];
        setAgentMessages(prev => [
          ...prev.filter(m => !m.isPending),
          { role: "assistant", content: result.text || `I'll ${result.toolName.replace(/_/g, " ")} for you.` },
        ]);
        setPendingTool({
          toolName: result.toolName,
          toolInput: result.toolInput,
          toolUseId: result.toolUseId,
          rawContent: assistantContent,
          priorMessages: apiMessages,  // exact messages sent to API for this turn
        });
      } else {
        setAgentMessages(prev => [
          ...prev.filter(m => !m.isPending),
          { role: "assistant", content: result.text },
        ]);
      }
    } catch (err: any) {
      setAgentMessages(prev => [
        ...prev.filter(m => !m.isPending),
        { role: "assistant", content: `Error: ${err.message ?? "Something went wrong"}` },
      ]);
    }
  }

  async function confirmAgentAction() {
    if (!pendingTool) return;
    const tool = pendingTool;
    setPendingTool(null);
    setAgentMessages(prev => [...prev, { role: "assistant", content: "Executing…", isPending: true }]);

    // Build correct Anthropic message history:
    // [prior user/assistant turns, assistant message containing text+tool_use]
    // Do NOT use agentMessages — it has UI-only messages (greeting, display text)
    // that would create invalid consecutive assistant turns.
    const messagesWithTool = [
      ...tool.priorMessages,
      { role: "assistant" as const, content: tool.rawContent },
    ];

    try {
      const result = await agentExecute.mutateAsync({
        messages: messagesWithTool,
        toolUseId: tool.toolUseId,
        toolName: tool.toolName,
        toolInput: tool.toolInput,
      });
      setAgentMessages(prev => [
        ...prev.filter(m => !m.isPending),
        { role: "assistant", content: result.text },
      ]);
      invalidateBookings();
    } catch (err: any) {
      setAgentMessages(prev => [
        ...prev.filter(m => !m.isPending),
        { role: "assistant", content: `Failed: ${err.message ?? "Something went wrong"}` },
      ]);
    }
  }

  function renderToolCard(tool: ToolProposal) {
    const { toolName, toolInput } = tool;
    const label = toolName.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const colorClass = toolName === "cancel_booking"
      ? "border-red-200 bg-red-50"
      : toolName === "confirm_booking"
        ? "border-green-200 bg-green-50"
        : "border-blue-200 bg-blue-50";
    return (
      <div className={`rounded-xl border p-4 text-sm space-y-3 ${colorClass}`}>
        <div className="flex items-center gap-2 font-semibold">
          <ChevronRight className="w-4 h-4" />
          {label}
        </div>
        <div className="space-y-1 text-xs font-mono bg-white/60 rounded-lg p-3">
          {Object.entries(toolInput).map(([k, v]) => (
            <div key={k}><span className="text-slate-500">{k}:</span> <span className="font-semibold">{String(v)}</span></div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" className="flex-1" onClick={confirmAgentAction} disabled={agentExecute.isPending}>
            {agentExecute.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirm"}
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => {
            setPendingTool(null);
            setAgentMessages(prev => [...prev, { role: "assistant", content: "Cancelled. What else can I help with?" }]);
          }}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

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
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <Button
                variant="ghost" size="sm"
                onClick={() => navigate("/executive-team")}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
              >
                🏢 Executive Team
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>← Site</Button>
          </div>
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
            {canManageContent && <TabsTrigger value="content" className="gap-1.5"><FileText className="w-4 h-4" />Content</TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="payments" className="gap-1.5 text-green-700"><IndianRupee className="w-4 h-4" />Payments</TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="financials" className="gap-1.5 text-emerald-700"><TrendingUp className="w-4 h-4" />Financials</TabsTrigger>}
            {isSuperAdmin && <TabsTrigger value="referral" className="gap-1.5 text-pink-700"><Gift className="w-4 h-4" />Referral</TabsTrigger>}
            <TabsTrigger value="corporate" className="gap-1.5 text-blue-700">
              <Building2 className="w-4 h-4" />Corp Leads
              {(corporateLeads?.filter(l => l.status === "new").length ?? 0) > 0 && (
                <span className="ml-1 bg-blue-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {corporateLeads!.filter(l => l.status === "new").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="corp-accounts" className="gap-1.5 text-indigo-700">
              <Building2 className="w-4 h-4" />Corp Accounts
              {(corporateAccountsList?.filter(a => a.status === "pending").length ?? 0) > 0 && (
                <span className="ml-1 bg-indigo-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {corporateAccountsList!.filter(a => a.status === "pending").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="vendors" className="gap-1.5 text-cyan-700"><Truck className="w-4 h-4" />Vendors</TabsTrigger>
            <TabsTrigger value="analytics" className="gap-1.5 text-orange-700"><TrendingUp className="w-4 h-4" />Analytics</TabsTrigger>
            <TabsTrigger value="agent" className="gap-1.5 text-violet-700"><Bot className="w-4 h-4" />Agent</TabsTrigger>
            <TabsTrigger value="wa-logs" className="gap-1.5 text-green-700"><MessageCircle className="w-4 h-4" />WA Logs</TabsTrigger>
            <TabsTrigger value="live" className="gap-1.5 text-red-600 font-semibold">
              <Map className="w-4 h-4" />Live
              {(liveTrips?.length ?? 0) > 0 && (
                <span className="ml-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{liveTrips!.length}</span>
              )}
            </TabsTrigger>
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

            {/* Promotions / Discount toggle */}
            {isSuperAdmin && (
              <Card className={`border-2 ${discountForm.enabled ? "border-orange-300 bg-orange-50" : "border-slate-200 bg-white"}`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${discountForm.enabled ? "bg-orange-100" : "bg-slate-100"}`}>
                        <Tag className={`w-5 h-5 ${discountForm.enabled ? "text-orange-600" : "text-slate-500"}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Promotion / Discount</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {discountForm.enabled ? "Active — shown to all users on car selection" : "Inactive — no discount applied"}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDiscountForm(f => ({ ...f, enabled: !f.enabled }))}
                      className={`relative inline-flex h-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${discountForm.enabled ? "bg-orange-500" : "bg-slate-300"}`}
                      style={{ width: "52px" }}
                    >
                      <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${discountForm.enabled ? "translate-x-6" : "translate-x-0"}`} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Discount Type</label>
                      <select
                        value={discountForm.type}
                        onChange={e => setDiscountForm(f => ({ ...f, type: e.target.value as "percentage" | "fixed" }))}
                        className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400/30 focus:border-orange-400"
                      >
                        <option value="percentage">Percentage (%)</option>
                        <option value="fixed">Fixed Amount (₹)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">
                        {discountForm.type === "percentage" ? "Discount %" : "Discount ₹"}
                      </label>
                      <Input
                        type="number" min={0}
                        value={discountForm.value}
                        onChange={e => setDiscountForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))}
                        className="h-9 text-sm"
                        placeholder={discountForm.type === "percentage" ? "e.g. 20" : "e.g. 200"}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Max Discount Cap (₹) — optional</label>
                      <Input
                        type="number" min={0}
                        value={discountForm.maxDiscount}
                        onChange={e => setDiscountForm(f => ({ ...f, maxDiscount: e.target.value }))}
                        className="h-9 text-sm"
                        placeholder="e.g. 200 — leave blank for no cap"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Promo Verbiage (shown to users)</label>
                      <Input
                        value={discountForm.verbiage}
                        onChange={e => setDiscountForm(f => ({ ...f, verbiage: e.target.value }))}
                        className="h-9 text-sm"
                        placeholder="e.g. 20% off on rides up to ₹200"
                      />
                    </div>
                  </div>
                  {discountForm.verbiage && (
                    <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-orange-100 border border-orange-200 rounded-lg">
                      <Tag className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <span className="text-xs text-orange-800 font-medium">Preview: {discountForm.verbiage}</span>
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setDiscount.mutate({ ...discountForm, maxDiscount: discountForm.maxDiscount ? parseFloat(discountForm.maxDiscount) : null });
                        setDiscountSaved(true);
                        setTimeout(() => setDiscountSaved(false), 2000);
                      }}
                      disabled={setDiscount.isPending}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      {setDiscount.isPending ? "Saving…" : discountSaved ? "Saved ✓" : "Save Changes"}
                    </Button>
                    <span className="text-xs text-slate-400">Changes apply site-wide immediately</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fleet Pricing */}
            {isSuperAdmin && (
              <Card className="border-2 border-slate-200 bg-white">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <IndianRupee className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Fleet Management</p>
                        <p className="text-xs text-slate-500 mt-0.5">Add / remove vehicles and tweak pricing — changes apply site-wide instantly</p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => setAddVehicleOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                      <Plus className="w-4 h-4 mr-1" /> Add Vehicle
                    </Button>
                  </div>
                  {!fleetPricing?.length ? (
                    <p className="text-sm text-slate-400 text-center py-4">Loading fleet…</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left text-xs font-medium text-slate-400 uppercase pb-2 pr-4">Vehicle</th>
                            <th className="text-left text-xs font-medium text-slate-400 uppercase pb-2 pr-3 w-32">₹ / km</th>
                            <th className="text-left text-xs font-medium text-slate-400 uppercase pb-2 pr-3 w-36">Driver / day</th>
                            <th className="pb-2 w-36" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {fleetPricing.map(car => {
                            const edit = fleetEdits[car.id] ?? { pricePerKm: car.pricePerKm, driverCharges: car.driverCharges };
                            const dirty = edit.pricePerKm !== car.pricePerKm || edit.driverCharges !== car.driverCharges;
                            const saved = fleetSaved[car.id];
                            const catColors: Record<string, string> = {
                              sedan: "bg-blue-50 text-blue-700",
                              muv: "bg-teal-50 text-teal-700",
                              suv: "bg-emerald-50 text-emerald-700",
                              premium: "bg-violet-50 text-violet-700",
                              luxury: "bg-amber-50 text-amber-700",
                              tempo: "bg-orange-50 text-orange-700",
                              bus: "bg-red-50 text-red-700",
                              electric: "bg-green-50 text-green-700",
                            };
                            return (
                              <tr key={car.id} className="group">
                                <td className="py-2.5 pr-4">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase shrink-0 ${catColors[car.category] ?? "bg-slate-100 text-slate-600"}`}>
                                      {car.category}
                                    </span>
                                    <span className="text-slate-800 font-medium leading-tight">{car.name}</span>
                                  </div>
                                </td>
                                <td className="py-2.5 pr-3">
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                    <input
                                      type="number" min={1} step={0.5}
                                      value={edit.pricePerKm}
                                      onChange={e => setFleetEdits(prev => ({ ...prev, [car.id]: { ...edit, pricePerKm: e.target.value } }))}
                                      className="w-full pl-6 pr-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
                                    />
                                  </div>
                                </td>
                                <td className="py-2.5 pr-3">
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₹</span>
                                    <input
                                      type="number" min={0} step={50}
                                      value={edit.driverCharges}
                                      onChange={e => setFleetEdits(prev => ({ ...prev, [car.id]: { ...edit, driverCharges: e.target.value } }))}
                                      className="w-full pl-6 pr-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400"
                                    />
                                  </div>
                                </td>
                                <td className="py-2.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => updateCarPricing.mutate({
                                        id: car.id,
                                        pricePerKm: parseFloat(edit.pricePerKm),
                                        driverCharges: parseFloat(edit.driverCharges),
                                      })}
                                      disabled={(!dirty && !saved) || updateCarPricing.isPending}
                                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                                        saved
                                          ? "bg-green-100 text-green-700"
                                          : dirty
                                            ? "bg-blue-600 text-white hover:bg-blue-700"
                                            : "bg-slate-100 text-slate-400 cursor-default"
                                      }`}
                                    >
                                      {saved ? "Saved ✓" : "Save"}
                                    </button>
                                    {deleteConfirmId === car.id ? (
                                      <>
                                        <button
                                          onClick={() => deleteCar.mutate({ id: car.id })}
                                          disabled={deleteCar.isPending}
                                          className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                                        >
                                          {deleteCar.isPending ? "…" : "Confirm"}
                                        </button>
                                        <button
                                          onClick={() => setDeleteConfirmId(null)}
                                          className="text-xs px-2 py-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                                        >
                                          ✕
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => setDeleteConfirmId(car.id)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                        title="Remove vehicle"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Abandoned Booking Recovery */}
            {isSuperAdmin && (
              <Card className="border-2 border-amber-200 bg-amber-50">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">Abandoned Booking Recovery</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Find bookings started but payment not completed (&gt;30 min ago) and send SMS + email with a resume link
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => { setAbandonedResult(null); sendAbandonedReminders.mutate({}); }}
                      disabled={sendAbandonedReminders.isPending}
                      className="bg-amber-500 hover:bg-amber-600 text-white sm:shrink-0 w-full sm:w-auto"
                    >
                      {sendAbandonedReminders.isPending ? "Sending…" : "Send Reminders"}
                    </Button>
                  </div>
                  {abandonedResult && (
                    <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-white border border-amber-200 rounded-lg">
                      <span className="text-xs text-amber-800 font-medium">
                        Found {abandonedResult.total} abandoned booking{abandonedResult.total !== 1 ? "s" : ""} — sent reminders to {abandonedResult.sent}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Add Vehicle Dialog */}
            <Dialog open={addVehicleOpen} onOpenChange={setAddVehicleOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Vehicle</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  {/* Image upload */}
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5 block">Vehicle Image</label>
                    <div className="flex items-start gap-4">
                      <div className="w-28 h-20 rounded-xl border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center bg-slate-50 shrink-0">
                        {vehicleImagePreview
                          ? <img src={vehicleImagePreview} alt="preview" className="w-full h-full object-cover" />
                          : <Car className="w-6 h-6 text-slate-300" />}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file" accept="image/*"
                          onChange={handleVehicleImage}
                          className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                        />
                        <p className="text-xs text-slate-400 mt-1">JPEG / PNG / WebP — auto-compressed to ~900px</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Vehicle Name *</label>
                      <Input value={vehicleForm.name} onChange={e => setVehicleForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Toyota Innova Crysta" className="h-9 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Brand *</label>
                      <Input value={vehicleForm.brand} onChange={e => setVehicleForm(f => ({ ...f, brand: e.target.value }))} placeholder="e.g. Toyota" className="h-9 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Model *</label>
                      <Input value={vehicleForm.model} onChange={e => setVehicleForm(f => ({ ...f, model: e.target.value }))} placeholder="e.g. Crysta 2.4G" className="h-9 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Category *</label>
                      <Select value={vehicleForm.category} onValueChange={v => setVehicleForm(f => ({ ...f, category: v as any }))}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {VEHICLE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Seats *</label>
                      <Input type="number" min={1} value={vehicleForm.seats} onChange={e => setVehicleForm(f => ({ ...f, seats: parseInt(e.target.value) || 4 }))} className="h-9 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Price per km (₹) *</label>
                      <Input type="number" min={1} step={0.5} value={vehicleForm.pricePerKm} onChange={e => setVehicleForm(f => ({ ...f, pricePerKm: e.target.value }))} placeholder="e.g. 18" className="h-9 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Driver Charge / day (₹) *</label>
                      <Input type="number" min={0} step={50} value={vehicleForm.driverCharges} onChange={e => setVehicleForm(f => ({ ...f, driverCharges: e.target.value }))} placeholder="e.g. 250" className="h-9 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Fuel Type *</label>
                      <Select value={vehicleForm.fuelType} onValueChange={v => setVehicleForm(f => ({ ...f, fuelType: v as any }))}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FUEL_TYPES.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Transmission *</label>
                      <Select value={vehicleForm.transmission} onValueChange={v => setVehicleForm(f => ({ ...f, transmission: v as any }))}>
                        <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TRANSMISSIONS.map(t => <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Description</label>
                    <Textarea
                      value={vehicleForm.description}
                      onChange={e => setVehicleForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Short description shown on the cars page…"
                      className="text-sm resize-none"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                      disabled={!vehicleForm.name || !vehicleForm.brand || !vehicleForm.model || !vehicleForm.pricePerKm || addCar.isPending}
                      onClick={() => addCar.mutate({
                        name: vehicleForm.name,
                        brand: vehicleForm.brand,
                        model: vehicleForm.model,
                        category: vehicleForm.category,
                        seats: vehicleForm.seats,
                        pricePerKm: parseFloat(vehicleForm.pricePerKm),
                        driverCharges: parseFloat(vehicleForm.driverCharges) || 250,
                        fuelType: vehicleForm.fuelType,
                        transmission: vehicleForm.transmission,
                        description: vehicleForm.description || undefined,
                        imageUrl: vehicleForm.imageUrl || undefined,
                      })}
                    >
                      {addCar.isPending ? "Adding…" : "Add Vehicle"}
                    </Button>
                    <Button variant="outline" onClick={() => { setAddVehicleOpen(false); setVehicleForm({ ...DEFAULT_VEHICLE_FORM }); setVehicleImagePreview(""); }}>
                      Cancel
                    </Button>
                  </div>
                  {addCar.error && <p className="text-xs text-red-600">{addCar.error.message}</p>}
                </div>
              </DialogContent>
            </Dialog>

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

            {/* Grant / Revoke Access */}
            {isSuperAdmin && (
              <Card className="border-2 border-slate-200 bg-white mt-5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                      <UserCog className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Grant / Revoke Access</p>
                      <p className="text-xs text-slate-500 mt-0.5">Enter a user's email or phone number to assign or remove their role</p>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      placeholder="Email or phone number"
                      value={grantContact}
                      onChange={e => setGrantContact(e.target.value)}
                      className="h-9 text-sm flex-1"
                    />
                    <select
                      value={grantRole}
                      onChange={e => setGrantRole(e.target.value as any)}
                      className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400/30 focus:border-purple-400 sm:w-40"
                    >
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                      <option value="user">User (revoke)</option>
                    </select>
                    <Button
                      size="sm"
                      disabled={!grantContact.trim() || grantAccess.isPending}
                      onClick={() => grantAccess.mutate({ contact: grantContact, role: grantRole })}
                      className="bg-purple-600 hover:bg-purple-700 text-white h-9 px-4 shrink-0"
                    >
                      {grantAccess.isPending ? "Saving…" : "Apply"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
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
                                {b.fromCity} → {b.toCity} · {new Date(b.pickupDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}{b.returnDate ? ` → ${new Date(b.returnDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}${(b as any).returnTime ? ` at ${(() => { const [h, m] = ((b as any).returnTime as string).split(":").map(Number); return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; })()}` : ""}` : ""}
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

                            {/* Timeline toggle */}
                            <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
                              onClick={() => setExpandedBookingId(expandedBookingId === Number(b.id) ? null : Number(b.id))}>
                              <Activity className="w-3 h-3" /> Timeline
                            </Button>
                          </div>

                          {/* ── Timeline ── */}
                          {expandedBookingId === Number(b.id) && (
                            <div className="border-t border-slate-100 pt-3 mt-1">
                              {!bookingTimeline ? (
                                <p className="text-xs text-muted-foreground">Loading...</p>
                              ) : bookingTimeline.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No events recorded yet.</p>
                              ) : (
                                <ol className="relative border-l border-slate-200 ml-2 space-y-3">
                                  {bookingTimeline.map(ev => (
                                    <li key={ev.id} className="pl-4">
                                      <span className="absolute -left-1.5 mt-0.5 w-3 h-3 rounded-full bg-primary border-2 border-white" />
                                      <p className="text-xs font-medium text-slate-800 capitalize">{ev.event.replace(/_/g, " ")}</p>
                                      <p className="text-[10px] text-muted-foreground">
                                        {new Date(ev.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                                        {ev.metaJson && Object.keys(ev.metaJson as object).length > 0 && (
                                          <span className="ml-1 text-slate-500">· {JSON.stringify(ev.metaJson).replace(/[{}"]/g, "").replace(/,/g, ", ")}</span>
                                        )}
                                      </p>
                                    </li>
                                  ))}
                                </ol>
                              )}
                            </div>
                          )}
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
                            {(c as any).canManageContent && c.role === "admin" && <Badge className="bg-amber-100 text-amber-700 text-xs border-0">Content</Badge>}
                          {(c as any).isTestUser && <Badge className="bg-violet-100 text-violet-700 text-xs border-0">Test User</Badge>}
                          {(c as any).tag === "vip" && <Badge className="bg-yellow-100 text-yellow-700 text-xs border-0">⭐ VIP</Badge>}
                          {(c as any).tag === "blacklisted" && <Badge className="bg-red-100 text-red-700 text-xs border-0">🚫 Blacklisted</Badge>}
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
                      {isSuperAdmin && (
                        <div className="flex flex-wrap gap-1">
                          {/* Revoke super admin */}
                          {c.role === "super_admin" && (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => { setUserRole.mutate({ userId: Number(c.id), role: "user" }); toast.success("Super admin access revoked"); }}>
                              <X className="w-3 h-3" /> Revoke Access
                            </Button>
                          )}
                          {/* Content permission for admins */}
                          {c.role === "admin" && (
                            <>
                              <Button
                                size="sm" variant="outline"
                                className={`h-7 text-xs gap-1 ${(c as any).canManageContent ? "border-amber-200 text-amber-700 hover:bg-amber-50" : "border-blue-200 text-blue-700 hover:bg-blue-50"}`}
                                onClick={() => setContentPermission.mutate({ userId: Number(c.id), canManage: !(c as any).canManageContent })}>
                                <FileText className="w-3 h-3" />
                                {(c as any).canManageContent ? "Remove Content" : "Grant Content"}
                              </Button>
                            </>
                          )}
                          {/* Mark as Test — visible for all non-super-admin users */}
                          {c.role !== "super_admin" && (
                            <Button
                              size="sm" variant="outline"
                              className={`h-7 text-xs gap-1 ${(c as any).isTestUser ? "border-violet-300 text-violet-700 hover:bg-violet-50 bg-violet-50" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                              onClick={() => setTestUser.mutate({ userId: Number(c.id), isTestUser: !(c as any).isTestUser })}>
                              <ShieldCheck className="w-3 h-3" />
                              {(c as any).isTestUser ? "Test User ✓" : "Mark as Test"}
                            </Button>
                          )}
                        </div>
                      )}
                      {/* CRM tag + profile expand */}
                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 mt-2">
                        <Button size="sm" variant="outline"
                          className={`h-7 text-xs gap-1 ${(c as any).tag === "vip" ? "bg-yellow-50 border-yellow-300 text-yellow-700" : "border-slate-200 text-slate-600"}`}
                          onClick={() => setCustomerTag.mutate({ userId: Number(c.id), tag: (c as any).tag === "vip" ? "normal" : "vip" })}>
                          ⭐ {(c as any).tag === "vip" ? "Remove VIP" : "Mark VIP"}
                        </Button>
                        <Button size="sm" variant="outline"
                          className={`h-7 text-xs gap-1 ${(c as any).tag === "blacklisted" ? "bg-red-50 border-red-300 text-red-700" : "border-slate-200 text-slate-600"}`}
                          onClick={() => setCustomerTag.mutate({ userId: Number(c.id), tag: (c as any).tag === "blacklisted" ? "normal" : "blacklisted" })}>
                          🚫 {(c as any).tag === "blacklisted" ? "Remove Block" : "Blacklist"}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1 ml-auto"
                          onClick={() => setExpandedCustomerId(expandedCustomerId === Number(c.id) ? null : Number(c.id))}>
                          <Activity className="w-3 h-3" /> {expandedCustomerId === Number(c.id) ? "Hide" : "View History"}
                        </Button>
                      </div>

                      {/* Customer profile expand */}
                      {expandedCustomerId === Number(c.id) && (
                        <div className="border-t border-slate-100 pt-3 mt-1 space-y-2">
                          {!customerProfile ? (
                            <p className="text-xs text-muted-foreground">Loading...</p>
                          ) : (
                            <>
                              <div className="flex gap-4 text-sm">
                                <div><p className="text-xs text-muted-foreground">Total Spend</p><p className="font-bold text-emerald-700">₹{customerProfile.totalSpend.toLocaleString("en-IN")}</p></div>
                                <div><p className="text-xs text-muted-foreground">Trips</p><p className="font-bold">{customerProfile.bookings.length}</p></div>
                                {customerProfile.lastTrip && <div><p className="text-xs text-muted-foreground">Last Trip</p><p className="text-xs font-medium">{customerProfile.lastTrip.fromCity} → {customerProfile.lastTrip.toCity}</p></div>}
                              </div>
                              {customerProfile.bookings.length > 0 && (
                                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                  {customerProfile.bookings.slice(0, 8).map(bk => (
                                    <div key={bk.id} className="flex items-center justify-between text-xs bg-slate-50 rounded px-2 py-1.5">
                                      <span className="font-mono text-muted-foreground">#{bk.id}</span>
                                      <span>{bk.fromCity} → {bk.toCity}</span>
                                      <span className="text-muted-foreground">{new Date(bk.pickupDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
                                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[bk.status as BookingStatus]}`}>{bk.status.replace("_", " ")}</span>
                                      <span className="font-medium text-primary">₹{parseFloat(bk.totalPrice.toString()).toLocaleString("en-IN")}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
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

          {/* ── Payments (super_admin only) ───────────────────────── */}
          {isSuperAdmin && (
            <TabsContent value="payments" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Payments Received</h2>
                  <p className="text-sm text-muted-foreground">{paymentsList?.filter(p => p.paymentStatus === "paid").length ?? 0} paid · {paymentsList?.filter(p => p.paymentStatus === "refunded").length ?? 0} refunded</p>
                </div>
                <button onClick={() => refetchPayments()} className="text-muted-foreground hover:text-foreground"><RefreshCw className="w-4 h-4" /></button>
              </div>
              {!paymentsList?.length ? (
                <Card><CardContent className="p-10 text-center text-muted-foreground text-sm">No payments yet.</CardContent></Card>
              ) : (
                <div className="space-y-2">
                  {paymentsList.map(p => (
                    <Card key={p.id} className={`border-l-4 ${p.paymentStatus === "refunded" ? "border-l-orange-400" : "border-l-emerald-500"}`}>
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-muted-foreground">#{p.id}</span>
                              <span className="font-semibold text-sm">{p.customerName}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.paymentStatus === "refunded" ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"}`}>
                                {p.paymentStatus === "refunded" ? "Refunded" : "Paid ✓"}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                              {p.resolvedEmail && <span>{p.resolvedEmail}</span>}
                              {p.resolvedPhone && <a href={`tel:+91${p.resolvedPhone}`} className="hover:text-primary flex items-center gap-1"><Phone className="w-3 h-3" />+91 {p.resolvedPhone}</a>}
                              <span>{p.fromCity} → {p.toCity}</span>
                              <span>{new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                              {p.razorpayPaymentId && <span className="font-mono">RZP: {p.razorpayPaymentId}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="font-bold text-lg text-emerald-700">₹{parseFloat(p.totalPrice).toLocaleString("en-IN")}</span>
                            {p.paymentStatus === "paid" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs gap-1 border-orange-200 text-orange-700 hover:bg-orange-50"
                                disabled={processRefund.isPending}
                                onClick={() => {
                                  if (confirm(`Refund ₹${parseFloat(p.totalPrice).toLocaleString("en-IN")} for booking #${p.id}? This will notify the customer.`)) {
                                    processRefund.mutate({ bookingId: Number(p.id) });
                                  }
                                }}
                              >
                                <IndianRupee className="w-3 h-3" /> Refund
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}

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

              {/* ── Danger Zone ────────────────────────────────────────── */}
              <Card className="border-red-300 bg-red-50">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-sm text-red-700 flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-4 h-4" /> Danger Zone — Permanent Data Deletion
                  </h3>
                  <p className="text-xs text-red-600 mb-3">
                    This will permanently delete data from the database. This action cannot be undone. An OTP will be sent to your registered mobile number for verification.
                  </p>
                  <div className="flex items-center gap-2">
                    <select
                      value={clearCategory}
                      onChange={e => setClearCategory(e.target.value as ClearCategory)}
                      className="flex-1 h-9 rounded-lg border border-red-300 bg-white text-sm px-3 text-red-800 focus:outline-none focus:ring-2 focus:ring-red-300"
                    >
                      <option value="bookings">Bookings &amp; Revenue data</option>
                      <option value="expenses">Expense records</option>
                      <option value="searches">Search analytics</option>
                      <option value="reviews">Car reviews</option>
                      <option value="all">Everything (all of the above)</option>
                    </select>
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white shrink-0"
                      onClick={() => { setClearModalOpen(true); setClearOtpSent(false); setClearOtp(""); setClearDone(null); sendClearOtp.reset(); clearData.reset(); }}
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Clear Data
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* ── Agent ───────────────────────────────────────────────── */}
          {/* ── Referral Program Tab ────────────────────────── */}
          <TabsContent value="referral" className="space-y-6">
            {/* Toggle */}
            <Card className={`border-2 ${referralForm.enabled ? "border-pink-300 bg-pink-50" : "border-slate-200 bg-white"}`}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${referralForm.enabled ? "bg-pink-100" : "bg-slate-100"}`}>
                      <Gift className={`w-5 h-5 ${referralForm.enabled ? "text-pink-600" : "text-slate-500"}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">Referral Program is {referralForm.enabled ? "ACTIVE" : "INACTIVE"}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {referralForm.enabled ? "Customers can refer friends and earn ₹100 credits." : "Program paused — no new referrals or credits are processed."}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setReferralForm(f => ({ ...f, enabled: !f.enabled }))}
                    className={`relative inline-flex h-7 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${referralForm.enabled ? "bg-pink-500" : "bg-slate-300"}`}
                    style={{ width: "52px" }}
                  >
                    <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${referralForm.enabled ? "translate-x-6" : "translate-x-0"}`} />
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            {referralStatsData && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold">{referralStatsData.total}</div><div className="text-xs text-muted-foreground">Total Referrals</div></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-amber-600">{referralStatsData.pending}</div><div className="text-xs text-muted-foreground">Awaiting Ride</div></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-blue-600">{referralStatsData.rideCompleted}</div><div className="text-xs text-muted-foreground">Ride Done (Pending Points)</div></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><div className="text-2xl font-bold text-green-600">{referralStatsData.allocated}</div><div className="text-xs text-muted-foreground">Points Allocated</div></CardContent></Card>
              </div>
            )}

            {/* Allocate due points */}
            <Card className="border-blue-200">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold text-slate-900">Process Due Point Allocations</p>
                    <p className="text-xs text-slate-500 mt-0.5">Allocates ₹100 to both users for rides completed 24+ hours ago.</p>
                  </div>
                  <Button
                    onClick={() => allocateDuePoints.mutate()}
                    disabled={allocateDuePoints.isPending}
                    className="bg-blue-600 hover:bg-blue-700 shrink-0"
                  >
                    {allocateDuePoints.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                    {allocateDuePoints.data ? `Allocated ${allocateDuePoints.data.allocated} events` : "Run Allocation"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Verbiage editor */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <h3 className="font-semibold text-slate-900">Program Copy & Amounts</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Referrer Credit (₹)</label>
                    <input type="number" value={referralForm.referrerAmount} onChange={e => setReferralForm(f => ({ ...f, referrerAmount: +e.target.value }))}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400/30 focus:border-pink-400" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Referred Credit (₹)</label>
                    <input type="number" value={referralForm.referredAmount} onChange={e => setReferralForm(f => ({ ...f, referredAmount: +e.target.value }))}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400/30 focus:border-pink-400" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Points Expiry (Days)</label>
                    <input type="number" value={referralForm.pointsExpireDays} onChange={e => setReferralForm(f => ({ ...f, pointsExpireDays: +e.target.value }))}
                      className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400/30 focus:border-pink-400" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Headline</label>
                  <Input value={referralForm.headline} onChange={e => setReferralForm(f => ({ ...f, headline: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Subheadline</label>
                  <Input value={referralForm.subheadline} onChange={e => setReferralForm(f => ({ ...f, subheadline: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Description</label>
                  <Textarea rows={3} value={referralForm.description} onChange={e => setReferralForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Terms & Conditions</label>
                  <Textarea rows={5} value={referralForm.terms} onChange={e => setReferralForm(f => ({ ...f, terms: e.target.value }))} />
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setReferralProgram.mutate(referralForm, { onSuccess: () => { setReferralSaved(true); setTimeout(() => setReferralSaved(false), 2500); } })}
                    disabled={setReferralProgram.isPending}
                    className="bg-pink-600 hover:bg-pink-700"
                  >
                    {setReferralProgram.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Save Referral Program
                  </Button>
                  {referralSaved && <span className="text-sm text-green-600 font-medium flex items-center gap-1"><CheckCircle className="w-4 h-4" />Saved!</span>}
                </div>
              </CardContent>
            </Card>

            {/* Top referrers */}
            {referralStatsData?.topReferrers && referralStatsData.topReferrers.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-slate-900 mb-4">Top Referrers</h3>
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-slate-500 border-b"><th className="text-left pb-2">Name</th><th className="text-left pb-2">Phone</th><th className="text-right pb-2">Referrals</th></tr></thead>
                    <tbody>
                      {referralStatsData.topReferrers.map((r: any) => (
                        <tr key={r.userId} className="border-b last:border-0">
                          <td className="py-2">{r.name ?? "—"}</td>
                          <td className="py-2 text-muted-foreground">{r.phone ?? "—"}</td>
                          <td className="py-2 text-right font-bold">{r.referrals}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Corporate Leads ─────────────────────────────────────── */}
          <TabsContent value="corporate" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Corporate Enquiries</h2>
                <p className="text-sm text-muted-foreground">{corporateLeads?.length ?? 0} total leads</p>
              </div>
              <button onClick={() => refetchCorporateLeads()} className="text-muted-foreground hover:text-foreground">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {!corporateLeads || corporateLeads.length === 0 ? (
              <Card><CardContent className="p-10 text-center text-muted-foreground text-sm">No corporate enquiries yet.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {corporateLeads.map(lead => (
                  <Card key={lead.id} className={`border-l-4 ${lead.status === "new" ? "border-l-blue-500" : lead.status === "called" ? "border-l-amber-500" : "border-l-slate-300"}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{lead.name}</span>
                            <span className="text-muted-foreground text-xs">·</span>
                            <span className="text-sm text-muted-foreground">{lead.company}</span>
                            {lead.designation && <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{lead.designation}</span>}
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
                            <a href={`tel:+91${lead.phone}`} className="flex items-center gap-1 hover:text-primary">
                              <Phone className="w-3 h-3" />+91 {lead.phone}
                            </a>
                            {lead.teamSize && <span>Team: {lead.teamSize}</span>}
                            {lead.requirement && <span>Need: {lead.requirement}</span>}
                            <span>{new Date(lead.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                          </div>
                          {lead.message && <p className="text-xs text-slate-600 bg-slate-50 rounded p-2 mb-2">{lead.message}</p>}
                          {lead.adminNotes && <p className="text-xs text-amber-700 bg-amber-50 rounded p-2 mb-2">Note: {lead.adminNotes}</p>}

                          {/* Inline note editor */}
                          {leadNoteId === lead.id && (
                            <div className="flex gap-2 mt-2">
                              <input
                                value={leadNoteText}
                                onChange={e => setLeadNoteText(e.target.value)}
                                placeholder="Add admin note…"
                                className="flex-1 border border-input rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                              <button
                                onClick={() => {
                                  updateLeadStatus.mutate({ id: lead.id, status: lead.status, adminNotes: leadNoteText });
                                  setLeadNoteId(null);
                                  setLeadNoteText("");
                                }}
                                className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90"
                              >Save</button>
                              <button onClick={() => { setLeadNoteId(null); setLeadNoteText(""); }} className="text-xs text-muted-foreground hover:text-foreground px-2">✕</button>
                            </div>
                          )}
                        </div>

                        <div className="flex sm:flex-col gap-2 shrink-0">
                          <div className="flex gap-1.5">
                            {(["new", "called", "closed"] as const).map(s => (
                              <button
                                key={s}
                                onClick={() => updateLeadStatus.mutate({ id: lead.id, status: s })}
                                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${
                                  lead.status === s
                                    ? s === "new" ? "bg-blue-500 text-white border-blue-500"
                                      : s === "called" ? "bg-amber-500 text-white border-amber-500"
                                      : "bg-slate-500 text-white border-slate-500"
                                    : "bg-white text-muted-foreground border-slate-200 hover:border-slate-400"
                                }`}
                              >
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </button>
                            ))}
                          </div>
                          <button
                            onClick={() => { setLeadNoteId(lead.id); setLeadNoteText(lead.adminNotes ?? ""); }}
                            className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 border border-slate-200 rounded-full px-2.5 py-1 hover:border-primary"
                          >
                            <StickyNote className="w-3 h-3" /> Note
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Corporate Accounts ──────────────────────────────────── */}
          <TabsContent value="corp-accounts" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Corporate Accounts</h2>
                <p className="text-sm text-muted-foreground">{corporateAccountsList?.length ?? 0} registered companies</p>
              </div>
              <div className="flex items-center gap-2">
                <a href="/corporate-portal" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                  <Building2 className="w-3.5 h-3.5" /> Open Portal
                </a>
                <button onClick={() => refetchCorporateAccounts()} className="text-muted-foreground hover:text-foreground"><RefreshCw className="w-4 h-4" /></button>
              </div>
            </div>
            {!corporateAccountsList || corporateAccountsList.length === 0 ? (
              <Card><CardContent className="p-10 text-center text-muted-foreground text-sm">No corporate accounts yet.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {corporateAccountsList.map(acc => (
                  <Card key={acc.id} className={`border-l-4 ${acc.status === "active" ? "border-l-green-500" : acc.status === "pending" ? "border-l-amber-400" : "border-l-slate-300"}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{acc.companyName}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${acc.status === "active" ? "bg-green-100 text-green-700" : acc.status === "pending" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                              {acc.status}
                            </span>
                            <span className="text-xs text-muted-foreground">· {acc.memberCount} member{acc.memberCount !== 1 ? "s" : ""}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
                            {acc.phone && <a href={`tel:+91${acc.phone}`} className="flex items-center gap-1 hover:text-primary"><Phone className="w-3 h-3" />+91 {acc.phone}</a>}
                            {acc.email && <a href={`mailto:${acc.email}`} className="flex items-center gap-1 hover:text-primary"><Mail className="w-3 h-3" />{acc.email}</a>}
                            {acc.gstin && <span>GSTIN: {acc.gstin}</span>}
                            <span>Join Code: <strong className="font-mono">{acc.joinCode}</strong></span>
                            <span>{new Date(acc.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                          </div>
                          {acc.notes && <p className="text-xs text-amber-700 bg-amber-50 rounded p-2 mb-2">Note: {acc.notes}</p>}
                          {corpNoteId === acc.id && (
                            <div className="flex gap-2 mt-2">
                              <input value={corpNoteText} onChange={e => setCorpNoteText(e.target.value)} placeholder="Add admin note…"
                                className="flex-1 border border-input rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary" />
                              <button onClick={() => { updateCorpAccountStatus.mutate({ id: acc.id, status: acc.status as any, notes: corpNoteText }); setCorpNoteId(null); setCorpNoteText(""); }}
                                className="text-xs bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90">Save</button>
                              <button onClick={() => { setCorpNoteId(null); setCorpNoteText(""); }} className="text-xs text-muted-foreground hover:text-foreground px-2">✕</button>
                            </div>
                          )}
                        </div>
                        <div className="flex sm:flex-col gap-2 shrink-0">
                          <div className="flex gap-1.5">
                            {(["pending", "active", "suspended"] as const).map(s => (
                              <button key={s} onClick={() => updateCorpAccountStatus.mutate({ id: acc.id, status: s })}
                                className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all ${acc.status === s
                                  ? s === "active" ? "bg-green-500 text-white border-green-500" : s === "pending" ? "bg-amber-500 text-white border-amber-500" : "bg-slate-500 text-white border-slate-500"
                                  : "bg-white text-muted-foreground border-slate-200 hover:border-slate-400"}`}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </button>
                            ))}
                          </div>
                          <button onClick={() => { setCorpNoteId(acc.id); setCorpNoteText(acc.notes ?? ""); }}
                            className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1 border border-slate-200 rounded-full px-2.5 py-1 hover:border-primary">
                            <StickyNote className="w-3 h-3" /> Note
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Vendors ─────────────────────────────────────────────── */}
          <TabsContent value="vendors" className="space-y-5">
            {/* Add / Edit Vendor form */}
            <Card className="border-dashed border-2 border-cyan-200">
              <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium">{editingVendor ? `Editing ${editingVendor.name}` : "Add Vendor"}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="text-xs font-medium mb-1 block">Name *</label>
                    <Input className="text-sm" placeholder="Vendor name" value={editingVendor ? editingVendor.name : vendorForm.name}
                      onChange={e => editingVendor ? setEditingVendor((v: any) => ({ ...v, name: e.target.value })) : setVendorForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><label className="text-xs font-medium mb-1 block">Phone *</label>
                    <Input className="text-sm" placeholder="10-digit mobile" value={editingVendor ? editingVendor.phone : vendorForm.phone}
                      onChange={e => editingVendor ? setEditingVendor((v: any) => ({ ...v, phone: e.target.value })) : setVendorForm(f => ({ ...f, phone: e.target.value }))} /></div>
                  <div><label className="text-xs font-medium mb-1 block">Company</label>
                    <Input className="text-sm" placeholder="Company name" value={editingVendor ? editingVendor.company ?? "" : vendorForm.company}
                      onChange={e => editingVendor ? setEditingVendor((v: any) => ({ ...v, company: e.target.value })) : setVendorForm(f => ({ ...f, company: e.target.value }))} /></div>
                  <div><label className="text-xs font-medium mb-1 block">City</label>
                    <Input className="text-sm" placeholder="Base city" value={editingVendor ? editingVendor.city ?? "" : vendorForm.city}
                      onChange={e => editingVendor ? setEditingVendor((v: any) => ({ ...v, city: e.target.value })) : setVendorForm(f => ({ ...f, city: e.target.value }))} /></div>
                  <div className="col-span-2"><label className="text-xs font-medium mb-1 block">Email</label>
                    <Input className="text-sm" placeholder="vendor@example.com" value={editingVendor ? editingVendor.email ?? "" : vendorForm.email}
                      onChange={e => editingVendor ? setEditingVendor((v: any) => ({ ...v, email: e.target.value })) : setVendorForm(f => ({ ...f, email: e.target.value }))} /></div>
                </div>
                <div className="flex gap-2">
                  {editingVendor ? (
                    <>
                      <Button size="sm" className="gap-1" onClick={() => updateVendorMut.mutate({ id: editingVendor.id, ...editingVendor })} disabled={updateVendorMut.isPending}>
                        <CheckCheck className="w-3 h-3" /> Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingVendor(null)}>Cancel</Button>
                    </>
                  ) : (
                    <Button size="sm" className="gap-1" onClick={() => addVendorMut.mutate(vendorForm)} disabled={!vendorForm.name || !vendorForm.phone || addVendorMut.isPending}>
                      <Plus className="w-3 h-3" /> Add Vendor
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Vendor list */}
            {(!vendorsList || vendorsList.length === 0) ? (
              <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">No vendors yet.</CardContent></Card>
            ) : (
              <div className="space-y-3">
                {vendorsList.map(v => (
                  <Card key={v.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{v.name}</span>
                            {v.company && <span className="text-xs text-muted-foreground">{v.company}</span>}
                            {v.city && <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{v.city}</span>}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            <a href={`tel:+91${v.phone}`} className="flex items-center gap-1 text-xs text-primary hover:underline">
                              <Phone className="w-3 h-3" />{v.phone}
                            </a>
                            {v.email && <span className="text-xs text-muted-foreground">{v.email}</span>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{v.drivers.length} driver{v.drivers.length !== 1 ? "s" : ""} linked</p>
                        </div>
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingVendor(v)}>
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => { if (confirm("Remove vendor?")) removeVendorMut.mutate({ id: v.id }); }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Drivers linked */}
                      {v.drivers.length > 0 && (
                        <div className="bg-slate-50 rounded-lg p-2.5 space-y-1.5">
                          <p className="text-xs font-medium text-slate-600">Linked Drivers</p>
                          {v.drivers.map(d => (
                            <div key={d.id} className="flex items-center justify-between text-xs">
                              <span>{d.name} · {d.phone}</span>
                              <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-500 px-1"
                                onClick={() => assignDriverToVendorMut.mutate({ driverId: d.id, vendorId: null })}>
                                Unlink
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Link unassigned driver */}
                      {(driversList ?? []).filter(d => !d.vendorId).length > 0 && (
                        <div className="flex items-center gap-2">
                          <Select onValueChange={dId => assignDriverToVendorMut.mutate({ driverId: Number(dId), vendorId: v.id })}>
                            <SelectTrigger className="h-7 text-xs flex-1"><SelectValue placeholder="Link a driver..." /></SelectTrigger>
                            <SelectContent>
                              {(driversList ?? []).filter(d => !d.vendorId).map(d => (
                                <SelectItem key={d.id} value={String(d.id)}>{d.name} · {d.phone}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Analytics ───────────────────────────────────────────── */}
          <TabsContent value="analytics" className="space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="font-semibold text-base">Revenue & Booking Analytics</h3>
              <div className="flex gap-2">
                {[7, 30, 60, 90].map(d => (
                  <Button key={d} size="sm" variant={analyticsDays === d ? "default" : "outline"}
                    className="h-8 text-xs" onClick={() => setAnalyticsDays(d)}>
                    {d}d
                  </Button>
                ))}
              </div>
            </div>

            {/* Funnel stat cards */}
            {analytics && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: "Total Bookings", value: analytics.funnel.total, color: "text-slate-700" },
                  { label: "Paid", value: analytics.funnel.paid, color: "text-emerald-700" },
                  { label: "Confirmed", value: analytics.funnel.confirmed, color: "text-green-700" },
                  { label: "Completed", value: analytics.funnel.completed, color: "text-blue-700" },
                  { label: "Cancelled", value: analytics.funnel.cancelled, color: "text-red-600" },
                ].map(s => (
                  <Card key={s.label}>
                    <CardContent className="p-4 text-center">
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Revenue trend */}
            <Card>
              <CardContent className="p-5">
                <p className="text-sm font-medium mb-4">Daily Revenue (₹) & Bookings</p>
                {!analytics ? (
                  <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
                ) : analytics.daily.length === 0 ? (
                  <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">No data yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={analytics.daily} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }}
                        tickFormatter={d => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} />
                      <YAxis yAxisId="rev" tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                      <YAxis yAxisId="bk" orientation="right" tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any, name: string) => name === "revenue" ? `₹${Number(v).toLocaleString("en-IN")}` : v}
                        labelFormatter={d => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} />
                      <Legend />
                      <Line yAxisId="rev" type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} dot={false} name="Revenue" />
                      <Line yAxisId="bk" type="monotone" dataKey="bookings" stroke="#2563eb" strokeWidth={2} dot={false} name="Bookings" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top routes */}
            <Card>
              <CardContent className="p-5">
                <p className="text-sm font-medium mb-4">Top Routes by Bookings</p>
                {!analytics || analytics.routes.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No data yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={analytics.routes} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis dataKey="route" type="category" tick={{ fontSize: 10 }} width={130} />
                      <Tooltip formatter={(v: any, name: string) => name === "revenue" ? `₹${Number(v).toLocaleString("en-IN")}` : v} />
                      <Legend />
                      <Bar dataKey="bookings" fill="#2563eb" name="Bookings" radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Trip type breakdown */}
            {analytics && analytics.tripTypes.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {analytics.tripTypes.map(t => (
                  <Card key={t.type}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground capitalize">{t.type}</p>
                      <p className="text-xl font-bold mt-1">{t.bookings} <span className="text-sm font-normal text-muted-foreground">trips</span></p>
                      <p className="text-sm text-emerald-700 font-medium">₹{t.revenue.toLocaleString("en-IN")}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="agent">
            <Card className="flex flex-col h-[600px]">
              <div className="flex items-center gap-3 px-5 py-4 border-b">
                <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Booking Agent</p>
                  <p className="text-xs text-muted-foreground">Search, confirm, assign drivers, cancel bookings</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {agentMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === "user"
                        ? "bg-violet-600 text-white rounded-br-sm"
                        : msg.isPending
                          ? "bg-slate-100 text-slate-400 italic rounded-bl-sm"
                          : "bg-slate-100 text-slate-800 rounded-bl-sm"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {/* Pending tool confirmation card */}
                {pendingTool && (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] w-full">
                      {renderToolCard(pendingTool)}
                    </div>
                  </div>
                )}

                <div ref={agentBottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t flex gap-2">
                <input
                  type="text"
                  value={agentInput}
                  onChange={e => setAgentInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAgentMessage(agentInput); } }}
                  placeholder="e.g. Show pending bookings for tomorrow…"
                  className="flex-1 border border-input rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                  disabled={agentChat.isPending || agentExecute.isPending}
                />
                <Button
                  size="icon"
                  className="bg-violet-600 hover:bg-violet-700 rounded-xl shrink-0"
                  onClick={() => sendAgentMessage(agentInput)}
                  disabled={!agentInput.trim() || agentChat.isPending || agentExecute.isPending}
                >
                  {agentChat.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </Card>
          </TabsContent>

          {/* ── WA Logs ─────────────────────────────────────────────── */}
          <TabsContent value="wa-logs" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">WhatsApp Message Log</h2>
              {waLogsData && <p className="text-sm text-muted-foreground">{waLogsData.total} total messages</p>}
            </div>
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-xs text-muted-foreground uppercase tracking-wide">
                      <th className="px-4 py-3">Date/Time</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Direction</th>
                      <th className="px-4 py-3">Template</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Booking</th>
                      <th className="px-4 py-3">Fallback SMS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!waLogsData && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
                    )}
                    {waLogsData?.logs.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No WhatsApp messages yet.</td></tr>
                    )}
                    {waLogsData?.logs.map(log => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{log.phone}</td>
                        <td className="px-4 py-3">
                          <Badge className={log.direction === "outbound" ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}>
                            {log.direction}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs">{log.templateName ?? <span className="text-muted-foreground">—</span>}</td>
                        <td className="px-4 py-3">
                          <Badge className={
                            log.waStatus === "read" ? "bg-green-100 text-green-700" :
                            log.waStatus === "delivered" ? "bg-emerald-100 text-emerald-700" :
                            log.waStatus === "sent" ? "bg-blue-100 text-blue-700" :
                            "bg-red-100 text-red-700"
                          }>
                            {log.waStatus ?? "—"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {log.bookingId ? <span className="font-medium">#{log.bookingId}</span> : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {log.fallbackSent ? <Badge className="bg-amber-100 text-amber-700">Sent</Badge> : <span className="text-muted-foreground">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
            {waLogsData && waLogsData.total > waLogsData.pageSize && (
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" size="sm" disabled={waLogsPage === 1} onClick={() => setWaLogsPage(p => p - 1)}>Previous</Button>
                <span className="text-sm text-muted-foreground">Page {waLogsPage} of {Math.ceil(waLogsData.total / waLogsData.pageSize)}</span>
                <Button variant="outline" size="sm" disabled={waLogsPage >= Math.ceil(waLogsData.total / waLogsData.pageSize)} onClick={() => setWaLogsPage(p => p + 1)}>Next</Button>
              </div>
            )}
          </TabsContent>

          {/* ── Live Ops Map ─────────────────────────────────────── */}
          <TabsContent value="live" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base">Live Trips Today</h3>
                <p className="text-xs text-muted-foreground">{liveTrips?.length ?? 0} active booking{(liveTrips?.length ?? 0) !== 1 ? "s" : ""} · refreshes every 30s</p>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetchLive()}>
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </Button>
            </div>

            {(!liveTrips || liveTrips.length === 0) ? (
              <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No active trips today.</CardContent></Card>
            ) : (
              <>
                {/* Map */}
                {liveTrips.some(t => t.driverLoc) && (
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      <div style={{ height: 380 }}>
                        <MapContainer center={[20.5937, 78.9629]} zoom={5} style={{ height: "100%", width: "100%" }}>
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution="© OpenStreetMap contributors" />
                          <MapFitBounds positions={liveTrips.filter(t => t.driverLoc).map(t => [t.driverLoc!.lat, t.driverLoc!.lng])} />
                          {liveTrips.map(t => t.driverLoc ? (
                            <Marker key={t.id} position={[t.driverLoc.lat, t.driverLoc.lng]} icon={greenIcon}>
                              <Popup>
                                <strong>#{t.id} {t.customerName}</strong><br />
                                {t.fromCity} → {t.toCity}<br />
                                {t.driverName && <>Driver: {t.driverName}<br /></>}
                                {t.driverPhone && <a href={`tel:+91${t.driverPhone}`}>+91-{t.driverPhone}</a>}
                              </Popup>
                            </Marker>
                          ) : null)}
                        </MapContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Trip list */}
                <div className="space-y-3">
                  {liveTrips.map(trip => (
                    <Card key={trip.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
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
                            <p className="text-xs text-muted-foreground">{trip.fromCity} → {trip.toCity} · {new Date(trip.pickupDate!).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                            {trip.driverName && (
                              <p className="text-xs text-green-700 mt-1">👨‍✈️ {trip.driverName}{trip.driverPhone && ` · +91-${trip.driverPhone}`}</p>
                            )}
                            {trip.pickupAddress && <p className="text-xs text-muted-foreground mt-0.5">📍 {trip.pickupAddress}</p>}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <Badge className={`${statusColors[trip.status as BookingStatus]} text-xs border-0`}>
                              {trip.status.replace("_", " ")}
                            </Badge>
                            {trip.driverLoc ? (
                              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">📍 Live GPS</span>
                            ) : (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">No GPS</span>
                            )}
                            {trip.tripPin && (
                              <span className="text-[10px] font-mono bg-amber-50 text-amber-700 px-2 py-0.5 rounded">PIN: {trip.tripPin}</span>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
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

      {/* ── Danger Zone OTP Modal ─────────────────────────────────── */}
      <Dialog open={clearModalOpen} onOpenChange={open => { if (!open) { setClearModalOpen(false); setClearOtpSent(false); setClearOtp(""); setClearDone(null); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              {clearDone ? "Data Deleted" : "Confirm Data Deletion"}
            </DialogTitle>
          </DialogHeader>

          {clearDone ? (
            <div className="space-y-3">
              <div className="bg-red-50 rounded-lg p-3 text-sm text-red-700">
                <p className="font-semibold mb-1">Permanently deleted:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {clearDone.map(d => <li key={d} className="capitalize">{d}</li>)}
                </ul>
              </div>
              <Button className="w-full" onClick={() => { setClearModalOpen(false); setClearDone(null); }}>Done</Button>
            </div>
          ) : !clearOtpSent ? (
            <div className="space-y-3">
              <div className="bg-red-50 rounded-lg p-3 text-sm text-red-800">
                <p>You are about to permanently delete:</p>
                <p className="font-semibold mt-1">
                  {{
                    bookings: "All bookings & revenue data",
                    expenses: "All expense records",
                    searches: "All search analytics",
                    reviews: "All car reviews",
                    all: "ALL data — bookings, expenses, analytics & reviews",
                  }[clearCategory]}
                </p>
                <p className="mt-2 text-red-600 font-medium">This cannot be undone.</p>
              </div>
              <p className="text-sm text-muted-foreground">An OTP will be sent to your registered mobile number to confirm this action.</p>
              {sendClearOtp.error && <p className="text-xs text-red-600">{sendClearOtp.error.message}</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setClearModalOpen(false)}>Cancel</Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={sendClearOtp.isPending}
                  onClick={() => sendClearOtp.mutate({ category: clearCategory })}
                >
                  {sendClearOtp.isPending ? "Sending…" : "Send OTP"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                OTP sent to <span className="font-semibold text-slate-700">+91 {clearMaskedPhone}</span>. Enter it below to confirm deletion.
              </p>
              <Input
                placeholder="6-digit OTP"
                maxLength={6}
                value={clearOtp}
                onChange={e => setClearOtp(e.target.value.replace(/\D/g, ""))}
                className="text-center text-lg tracking-widest font-mono h-12"
              />
              {clearData.error && <p className="text-xs text-red-600">{clearData.error.message}</p>}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => { setClearOtpSent(false); sendClearOtp.reset(); }}>Resend OTP</Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  disabled={clearOtp.length !== 6 || clearData.isPending}
                  onClick={() => clearData.mutate({ category: clearCategory, otp: clearOtp })}
                >
                  {clearData.isPending ? "Deleting…" : "Delete Now"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
