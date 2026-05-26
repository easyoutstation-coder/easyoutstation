import { useSeo } from "@/hooks/useSeo";
import { useNavigate } from "react-router";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";

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

  const [referralCopied, setReferralCopied] = useState(false);

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
    const text = `Book your outstation cab with EasyOutstation and get ₹200 off! Fixed fares, verified drivers. Use my referral link: ${referralLink}`;
    if (navigator.share) {
      await navigator.share({ title: "EasyOutstation — ₹200 off!", text, url: referralLink });
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
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-4 gap-8">
            {/* Sidebar */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingName ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={nameInput}
                            onChange={e => setNameInput(e.target.value)}
                            className="h-7 text-sm px-2"
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === "Enter" && nameInput.trim()) updateProfileMutation.mutate({ name: nameInput.trim() });
                              if (e.key === "Escape") setEditingName(false);
                            }}
                          />
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
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </button>
                    <button
                      onClick={() => navigate("/cars")}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <Car className="w-4 h-4" />
                      Browse Cars
                    </button>
                    <button
                      onClick={() => navigate("/")}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <Search className="w-4 h-4" />
                      Search Rides
                    </button>
                    <button
                      onClick={() => navigate("/referral")}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
                    >
                      <Gift className="w-4 h-4" />
                      Refer & Earn
                    </button>
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <div className="text-xs text-muted-foreground mb-2">Contact</div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        easyoutstation@gmail.com
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{upcomingBookings.length}</div>
                    <div className="text-xs text-muted-foreground">Upcoming Trips</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{pastBookings.length}</div>
                    <div className="text-xs text-muted-foreground">Completed Trips</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold">{recentSearches?.length || 0}</div>
                    <div className="text-xs text-muted-foreground">Recent Searches</div>
                  </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="text-2xl font-bold text-green-700">₹{referralStats?.balance ?? 0}</div>
                    <div className="text-xs text-green-600">Referral Credits</div>
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
                          <div className="flex flex-col sm:flex-row gap-4">
                            <div className="w-full sm:w-32 h-24 rounded-xl overflow-hidden bg-muted shrink-0">
                              <img
                                src={booking.car?.imageUrl || "/cars/toyota-innova.jpg"}
                                alt={booking.car?.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h4 className="font-semibold">{booking.car?.name || "Car Rental"}</h4>
                                  <p className="text-xs text-muted-foreground">
                                    {booking.fromCity} → {booking.toCity}
                                  </p>
                                </div>
                                <Badge
                                  className={
                                    booking.status === "confirmed"
                                      ? "bg-green-100 text-green-700 hover:bg-green-100"
                                      : booking.status === "pending"
                                      ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                                      : booking.status === "cancelled"
                                      ? "bg-red-100 text-red-700 hover:bg-red-100"
                                      : "bg-slate-100 text-slate-700 hover:bg-slate-100"
                                  }
                                >
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mb-2">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(booking.pickupDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                  {booking.returnDate && ` → ${new Date(booking.returnDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}${(booking as any).returnTime ? ` at ${(() => { const [h, m] = ((booking as any).returnTime as string).split(":").map(Number); return `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`; })()}` : ""}`}
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {booking.totalKm} km
                                </span>
                                <span className="flex items-center gap-1">
                                  <Car className="w-3 h-3" />
                                  {booking.tripType.replace("_", " ")}
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-primary">
                                  ₹{parseFloat(booking.totalPrice.toString()).toLocaleString()}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/booking/${booking.id}`)}
                                  className="text-xs"
                                >
                                  Details
                                  <ChevronRight className="w-3 h-3 ml-1" />
                                </Button>
                              </div>
                            </div>
                          </div>
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
                              <p className="text-xs text-slate-500">Share and earn ₹200 for every friend who completes their first ride</p>
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

                      {/* Points balance */}
                      <div className="grid grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">₹{referralStats?.balance ?? 0}</div>
                            <div className="text-xs text-muted-foreground mt-1">Credits Available</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold">{referralStats?.referrals.length ?? 0}</div>
                            <div className="text-xs text-muted-foreground mt-1">Friends Referred</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold">
                              {referralStats?.referrals.filter(r => r.status === "points_allocated").length ?? 0}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">Rides Rewarded</div>
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
                            <p className="text-sm text-muted-foreground mb-4">Share your link to start earning ₹200 per friend.</p>
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
    </div>
  );
}
