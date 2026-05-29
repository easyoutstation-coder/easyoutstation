import { useState, useEffect } from "react";
import { Link } from "react-router";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSeo } from "@/hooks/useSeo";
import {
  Building2, Users, IndianRupee, Car, FileText, Phone, Mail,
  CheckCircle, Clock, AlertTriangle, LogIn, UserPlus, Copy,
  ChevronRight, TrendingUp, Calendar, ArrowRight, RefreshCw,
  Shield, Star, X,
} from "lucide-react";

// ── Login panel (shown when not authenticated) ─────────────────────────────
function LoginPanel() {
  const [tab, setTab] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState("");

  const loginWithPhone = trpc.auth.loginWithPhone.useMutation({
    onSuccess: () => window.location.reload(),
    onError: (e) => setError(e.message),
  });
  const loginEmail = trpc.auth.login.useMutation({
    onSuccess: () => window.location.reload(),
    onError: (e) => setError(e.message),
  });
  const signupEmail = trpc.auth.signup.useMutation({
    onSuccess: () => window.location.reload(),
    onError: (e) => setError(e.message),
  });

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardContent className="p-5 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-['DM_Serif_Display']">Corporate Portal</h2>
            <p className="text-sm text-slate-500 mt-1">Sign in to manage your company's travel</p>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
            <button onClick={() => setTab("phone")}
              className={`flex-1 text-sm font-medium py-2 rounded-lg transition-all ${tab === "phone" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
              Phone OTP
            </button>
            <button onClick={() => setTab("email")}
              className={`flex-1 text-sm font-medium py-2 rounded-lg transition-all ${tab === "email" ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
              Email + Password
            </button>
          </div>

          {tab === "phone" ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                Enter your mobile number and verify via OTP (same as your regular EasyOutstation account).
              </p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">+91</span>
                <Input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit mobile number" className="pl-12" maxLength={10} />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={phone.length !== 10 || loginWithPhone.isPending}
                onClick={() => {
                  setError("");
                  loginWithPhone.mutate({ phone });
                }}>
                {loginWithPhone.isPending ? "Signing in…" : "Continue with Phone"}
              </Button>
              <p className="text-xs text-center text-slate-400">OTP verified via your EasyOutstation account</p>
            </div>
          ) : (
            <div className="space-y-4">
              {isSignup && (
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />
              )}
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Work email address" />
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
              {error && <p className="text-xs text-red-500">{error}</p>}
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!email || !password || (isSignup && !name) || loginEmail.isPending || signupEmail.isPending}
                onClick={() => {
                  setError("");
                  if (isSignup) signupEmail.mutate({ name, email, password });
                  else loginEmail.mutate({ email, password });
                }}>
                {loginEmail.isPending || signupEmail.isPending ? "Please wait…" : isSignup ? "Create Account" : "Sign In"}
              </Button>
              <button onClick={() => { setIsSignup(!isSignup); setError(""); }}
                className="w-full text-xs text-center text-blue-600 hover:underline">
                {isSignup ? "Already have an account? Sign in" : "New to EasyOutstation? Create account"}
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Registration form (linked user, no corporate account yet) ──────────────
function RegisterForm({ onDone }: { onDone: () => void }) {
  const [companyName, setCompanyName] = useState("");
  const [gstin, setGstin] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  const register = trpc.corporate.registerAccount.useMutation({
    onSuccess: onDone,
    onError: (e) => setError(e.message),
  });

  return (
    <div className="max-w-lg mx-auto">
      <Card>
        <CardContent className="p-5 sm:p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Register Your Company</h2>
              <p className="text-xs text-slate-500">Takes 2 minutes — our team reviews within 24 hours</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 block">Company Name *</label>
              <Input value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Acme Corp Pvt. Ltd." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 block">GSTIN <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
                <Input value={gstin} onChange={e => setGstin(e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 block">Company Phone</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">+91</span>
                  <Input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Phone" className="pl-10" maxLength={10} />
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 block">Company Email</label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="accounts@company.com" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 block">Registered Address</label>
              <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Office address (for GST invoices)" />
            </div>

            {error && <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 font-semibold"
              disabled={!companyName || register.isPending}
              onClick={() => {
                setError("");
                register.mutate({ companyName, gstin: gstin || undefined, email: email || undefined, phone: phone || undefined, address: address || undefined });
              }}>
              {register.isPending ? "Submitting…" : "Submit for Approval →"}
            </Button>
            <p className="text-xs text-center text-slate-400">Our team reviews all applications within 24 hours and reaches out directly.</p>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs text-slate-500 font-semibold mb-2">Already have a join code?</p>
            <JoinCodeInput onDone={onDone} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function JoinCodeInput({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const join = trpc.corporate.joinAccount.useMutation({
    onSuccess: onDone,
    onError: (e) => setError(e.message),
  });
  return (
    <div className="flex gap-2">
      <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="8-char join code" maxLength={8} className="font-mono tracking-widest text-center" />
      <Button variant="outline" disabled={code.length < 4 || join.isPending}
        onClick={() => { setError(""); join.mutate({ joinCode: code }); }}>
        {join.isPending ? "…" : "Join"}
      </Button>
      {error && <span className="text-xs text-red-500 self-center">{error}</span>}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────
function Dashboard({ account, myRole, members, onRefresh }: {
  account: any; myRole: string; members: any[]; onRefresh: () => void;
}) {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [copied, setCopied] = useState(false);
  const [removeId, setRemoveId] = useState<number | null>(null);

  const { data: trips, refetch: refetchTrips } = trpc.corporate.getTrips.useQuery({ month: selectedMonth || undefined });
  const { data: statement } = trpc.corporate.getMonthlyStatement.useQuery();
  const removeMember = trpc.corporate.removeMember.useMutation({ onSuccess: onRefresh });
  const leaveAccount = trpc.corporate.leaveAccount.useMutation({ onSuccess: () => window.location.reload() });

  const totalSpend = trips?.reduce((s, t) => s + Number(t.totalPrice), 0) ?? 0;
  const confirmedTrips = trips?.filter(t => t.status !== "cancelled").length ?? 0;

  function copyCode() {
    navigator.clipboard.writeText(account.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700",
    confirmed: "bg-green-100 text-green-700",
    completed: "bg-blue-100 text-blue-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-900 font-['DM_Serif_Display']">{account.companyName}</h2>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${account.status === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {account.status === "active" ? "Active" : account.status === "pending" ? "Pending Approval" : "Suspended"}
            </span>
          </div>
          <p className="text-sm text-slate-500">{myRole === "admin" ? "Corporate Admin" : "Team Member"} · {members.length} member{members.length !== 1 ? "s" : ""}</p>
        </div>
        {myRole === "admin" && (
          <button onClick={copyCode}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:border-blue-300 hover:text-blue-700 transition-all">
            <Copy className="w-3.5 h-3.5" />
            Join Code: <span className="font-mono font-bold tracking-widest">{account.joinCode}</span>
            {copied && <CheckCircle className="w-3.5 h-3.5 text-green-600" />}
          </button>
        )}
      </div>

      {account.status === "pending" && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Account Under Review</p>
            <p className="text-xs text-amber-700 mt-0.5">Our team reviews all corporate applications within 24 hours. You'll receive an SMS and email once approved. Need faster? Call +91-9958556011.</p>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex overflow-x-auto h-auto gap-1 pb-1 no-scrollbar w-full justify-start">
          <TabsTrigger value="overview" className="gap-1.5 shrink-0"><TrendingUp className="w-3.5 h-3.5" />Overview</TabsTrigger>
          <TabsTrigger value="trips" className="gap-1.5 shrink-0"><Car className="w-3.5 h-3.5" />Trips</TabsTrigger>
          <TabsTrigger value="statement" className="gap-1.5 shrink-0"><FileText className="w-3.5 h-3.5" />Statement</TabsTrigger>
          {myRole === "admin" && <TabsTrigger value="team" className="gap-1.5 shrink-0"><Users className="w-3.5 h-3.5" />Team</TabsTrigger>}
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total Trips", value: confirmedTrips, icon: Car, color: "text-blue-600" },
              { label: "Total Spend", value: `₹${Math.round(totalSpend).toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-green-600" },
              { label: "Team Members", value: members.length, icon: Users, color: "text-purple-600" },
              { label: "This Month", value: statement?.[0]?.trips ?? 0, icon: Calendar, color: "text-amber-600" },
            ].map(s => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
                  <p className="text-xl font-bold text-slate-900">{s.value}</p>
                  <p className="text-xs text-slate-500">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Recent trips */}
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <p className="font-semibold text-sm">Recent Trips</p>
                <button onClick={() => setActiveTab("trips")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">View all <ChevronRight className="w-3 h-3" /></button>
              </div>
              {!trips || trips.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No trips yet. Book your first trip below.</p>
              ) : (
                <div className="divide-y">
                  {trips.slice(0, 5).map(t => (
                    <div key={t.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{t.fromCity} → {t.toCity}</p>
                        <p className="text-xs text-slate-500">{new Date(t.pickupDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} · {t.bookedByName || t.customerName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">₹{Number(t.totalPrice).toLocaleString("en-IN")}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusColors[t.status] || "bg-slate-100 text-slate-600"}`}>{t.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick book CTA */}
          {account.status === "active" && (
            <div className="flex items-center justify-between p-5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700">
              <div>
                <p className="text-white font-semibold">Need a cab for your team?</p>
                <p className="text-blue-200 text-sm mt-0.5">Book instantly — tagged to your corporate account.</p>
              </div>
              <Link to="/cars" className="shrink-0 bg-white text-blue-700 font-semibold px-5 py-2.5 rounded-xl text-sm hover:bg-blue-50 transition-all">
                Book Now →
              </Link>
            </div>
          )}

          {myRole === "admin" && (
            <Card className="border-slate-200">
              <CardContent className="p-5 space-y-3">
                <p className="text-sm font-semibold text-slate-700">Account Details</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
                  {account.gstin && <p><span className="text-slate-400">GSTIN:</span> {account.gstin}</p>}
                  {account.email && <p><span className="text-slate-400">Email:</span> {account.email}</p>}
                  {account.phone && <p><span className="text-slate-400">Phone:</span> +91-{account.phone}</p>}
                  {account.address && <p className="sm:col-span-2"><span className="text-slate-400">Address:</span> {account.address}</p>}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Trips ── */}
        <TabsContent value="trips" className="space-y-4 mt-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <p className="text-sm text-slate-500">{trips?.length ?? 0} trip{(trips?.length ?? 0) !== 1 ? "s" : ""} {selectedMonth ? `in ${new Date(selectedMonth + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}` : "total"}</p>
            <div className="flex gap-2">
              <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20">
                <option value="">All time</option>
                {statement?.map(s => <option key={s.month} value={s.month}>{s.label}</option>)}
              </select>
              <button onClick={() => refetchTrips()} className="text-slate-400 hover:text-slate-700"><RefreshCw className="w-4 h-4" /></button>
            </div>
          </div>

          {!trips || trips.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-slate-500">No trips found for this period.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {trips.map(t => (
                <Card key={t.id} className="hover:border-blue-200 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900 text-sm">{t.fromCity} → {t.toCity}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusColors[t.status] || "bg-slate-100"}`}>{t.status}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {new Date(t.pickupDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          {" · "}{t.bookedByName || t.customerName}
                          {t.driverName && ` · Driver: ${t.driverName}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-slate-900">₹{Number(t.totalPrice).toLocaleString("en-IN")}</p>
                        <p className="text-xs text-slate-400">{t.totalKm} km · #{t.id}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Statement ── */}
        <TabsContent value="statement" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">Monthly spend summary for GST reimbursement</p>
          </div>
          {!statement || statement.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-sm text-slate-500">No statements yet.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {statement.map(s => (
                <Card key={s.month} className="hover:border-blue-200 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{s.label}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{s.trips} trip{s.trips !== 1 ? "s" : ""}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-slate-900">₹{Math.round(s.spend).toLocaleString("en-IN")}</p>
                        <button onClick={() => { setSelectedMonth(s.month); setActiveTab("trips"); }}
                          className="text-xs text-blue-600 hover:underline mt-0.5">View trips →</button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-50 border border-blue-100 text-sm text-blue-800">
                <Mail className="w-4 h-4 shrink-0" />
                Need a detailed GST invoice for a specific month? Email us at <a href="mailto:easyoutstation@gmail.com" className="font-semibold hover:underline ml-1">easyoutstation@gmail.com</a>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Team ── */}
        {myRole === "admin" && (
          <TabsContent value="team" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{members.length} member{members.length !== 1 ? "s" : ""} in your account</p>
            </div>

            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">Share Join Code</p>
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="font-mono font-bold text-lg tracking-widest text-blue-700 flex-1">{account.joinCode}</span>
                  <button onClick={copyCode} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-700 font-medium">
                    {copied ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="text-xs text-slate-500">Share this code with team members. They log in at easyoutstation.com/corporate-portal and enter this code to join.</p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              {members.map(m => (
                <Card key={m.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{m.name || "Unnamed"}</p>
                      <p className="text-xs text-slate-500">{m.phone ? `+91 ${m.phone}` : ""}{m.email ? ` · ${m.email}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.corporateRole === "admin" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                        {m.corporateRole === "admin" ? "Admin" : "Member"}
                      </span>
                      {m.corporateRole !== "admin" && (
                        <button onClick={() => setRemoveId(m.id)} className="text-red-400 hover:text-red-600">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {removeId && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm flex items-center justify-between gap-3">
                <p className="text-red-800">Remove this member from your corporate account?</p>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setRemoveId(null)}>Cancel</Button>
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white"
                    disabled={removeMember.isPending}
                    onClick={() => { removeMember.mutate({ userId: removeId }); setRemoveId(null); }}>
                    Remove
                  </Button>
                </div>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100">
              <button onClick={() => { if (confirm("Leave your corporate account? You will lose access to company trip history.")) leaveAccount.mutate(); }}
                className="text-xs text-slate-400 hover:text-red-500 transition-colors">
                Leave corporate account
              </button>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function CorporatePortal() {
  useSeo({
    title: "Corporate Portal | EasyOutstation — Business Travel Dashboard",
    description: "Manage your company's outstation travel on EasyOutstation. View trip history, monthly statements, GST invoices, and manage your team.",
    canonical: "https://www.easyoutstation.com/corporate-portal",
  });

  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: accountData, isLoading: accountLoading, refetch } = trpc.corporate.getMyAccount.useQuery(undefined, { enabled: isAuthenticated });

  const isLoading = authLoading || (isAuthenticated && accountLoading);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="pt-20">
        {/* Hero bar */}
        <div className="bg-slate-900 py-10 px-4">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Corporate Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white font-['DM_Serif_Display']">Business Travel, Organised.</h1>
              <p className="text-slate-400 text-sm mt-1">Track trips, manage your team, and download monthly statements — all in one place.</p>
            </div>
            <div className="hidden sm:flex gap-4 text-center shrink-0">
              {[
                { label: "GST Invoices", icon: FileText },
                { label: "Team Management", icon: Users },
                { label: "Monthly Reports", icon: TrendingUp },
              ].map(f => (
                <div key={f.label} className="flex flex-col items-center gap-1">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <f.icon className="w-5 h-5 text-blue-300" />
                  </div>
                  <p className="text-[10px] text-slate-400 whitespace-nowrap">{f.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-10">
          {isLoading ? (
            <div className="text-center py-20 text-slate-400 text-sm">Loading…</div>
          ) : !isAuthenticated ? (
            <LoginPanel />
          ) : !accountData ? (
            <RegisterForm onDone={() => refetch()} />
          ) : (
            <Dashboard
              account={accountData.account}
              myRole={accountData.myRole}
              members={accountData.members}
              onRefresh={() => refetch()}
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
