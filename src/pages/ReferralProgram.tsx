import { useEffect, useState, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useSeo } from "@/hooks/useSeo";
import {
  Gift, Users, CheckCircle, ArrowRight,
  Clock, Zap, Share2, Copy, ChevronDown, Star, Shield,
} from "lucide-react";

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 hover:text-primary transition-colors"
      >
        <span className="font-medium text-slate-900">{q}</span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="text-slate-600 text-sm pb-5 leading-relaxed">{a}</p>}
    </div>
  );
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const end = value;
    prev.current = end;
    if (start === end) return;
    const duration = 500;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{display.toLocaleString("en-IN")}</>;
}

function NotificationMockup({ amount }: { amount: number }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStep(1), 600);
    const t2 = setTimeout(() => setStep(2), 1800);
    const t3 = setTimeout(() => setStep(3), 3200);
    const t4 = setTimeout(() => { setStep(0); setTimeout(() => setStep(1), 400); }, 5500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [amount]);

  return (
    <div className="relative w-[280px] mx-auto select-none">
      {/* Phone frame */}
      <div className="relative bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl shadow-slate-900/50 border-4 border-slate-700">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-6 bg-slate-900 rounded-b-2xl z-10" />
        <div className="bg-slate-800 rounded-[2rem] overflow-hidden" style={{ height: "480px" }}>
          {/* Status bar */}
          <div className="flex items-center justify-between px-5 pt-8 pb-2">
            <span className="text-white text-xs font-semibold">9:41</span>
            <div className="flex items-center gap-1">
              <div className="flex gap-0.5 items-end h-3">
                {[2,3,4,4].map((h,i) => <div key={i} className="w-1 bg-white rounded-sm" style={{ height: `${h*3}px` }} />)}
              </div>
              <svg className="w-4 h-3 text-white fill-white ml-1" viewBox="0 0 24 12"><rect x="0" y="0" width="22" height="12" rx="2" stroke="white" strokeWidth="1.5" fill="none"/><rect x="1.5" y="1.5" width="18" height="9" rx="1" fill="white"/><path d="M23 4v4a2 2 0 000-4z" fill="white"/></svg>
            </div>
          </div>

          {/* Lock screen background */}
          <div className="relative px-3 pt-2">
            {/* Notification sliding in */}
            <div className={`transition-all duration-700 ease-out ${step >= 1 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}>
              <div className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 mb-2 border border-white/10">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                    <span className="text-white text-sm">🎁</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-xs font-semibold">EasyOutstation</p>
                    <p className="text-white/80 text-xs mt-0.5 leading-relaxed">
                      ₹{amount} referral credit added to your account!
                    </p>
                    <p className="text-white/50 text-[10px] mt-1">now</p>
                  </div>
                </div>
              </div>
            </div>

            {/* SMS notification */}
            <div className={`transition-all duration-700 ease-out delay-300 ${step >= 2 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 mb-2 border border-white/10">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs">✉️</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-xs font-semibold">EasyOutstation</p>
                    <p className="text-white/80 text-xs mt-0.5 leading-relaxed">
                      Your friend completed their first ride! ₹{amount} is now in your account. Valid 90 days.
                    </p>
                    <p className="text-white/50 text-[10px] mt-1">now</p>
                  </div>
                </div>
              </div>
            </div>

            {/* WhatsApp message being sent */}
            <div className={`transition-all duration-700 ease-out delay-500 ${step >= 3 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#25D366] flex items-center justify-center shrink-0">
                    <span className="text-white text-xs">💬</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-xs font-semibold">WhatsApp</p>
                    <p className="text-white/80 text-xs mt-0.5 leading-relaxed">
                      Rahul: "Bhai thanks for the referral link, just saved ₹100 on Manali trip! 🙌"
                    </p>
                    <p className="text-white/50 text-[10px] mt-1">now</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Clock in center */}
            <div className={`text-center mt-6 transition-opacity duration-500 ${step === 0 ? "opacity-100" : "opacity-0"}`}>
              <p className="text-white/30 text-5xl font-thin">9:41</p>
              <p className="text-white/20 text-xs mt-1">Monday, 26 May</p>
            </div>
          </div>
        </div>
      </div>

      {/* Glow */}
      <div className="absolute inset-0 rounded-[2.5rem] bg-blue-500/10 blur-2xl -z-10 scale-110" />
    </div>
  );
}

const REFERRAL_FAQS = [
  { q: "When do I get my ₹100 credit?", a: "Your ₹100 credit is added to your account within 24 hours of your referred friend completing their first ride with EasyOutstation. You'll receive an email and SMS confirmation." },
  { q: "Is there a limit on how many people I can refer?", a: "No limit at all. You can refer as many friends, family members, and colleagues as you like. Every completed referral earns you ₹100 — they accumulate in your dashboard." },
  { q: "Do credits expire?", a: "Yes. Referral credits are valid for 90 days from the date they are added to your account. You can view your credit balance and expiry dates in your dashboard." },
  { q: "What counts as a 'completed ride'?", a: "A completed ride is one that is confirmed, taken, and marked complete by our team. Cancelled or refunded bookings do not qualify for referral credits." },
  { q: "How do I use my referral credits?", a: "Credits are applied automatically when you make your next booking. The ₹100 will be deducted from your total fare. You can check your balance anytime in your dashboard." },
  { q: "Can I refer someone who already has an EasyOutstation account?", a: "Yes, but the referral is only credited once per user — specifically when a new user makes their first completed ride using your referral link." },
  { q: "What if my friend signed up but hasn't booked yet?", a: "The referral stays active. As soon as your friend completes their first ride, your credit will be processed within 24 hours." },
];

const TRIPS = [
  { destination: "Delhi → Shimla", fare: 4450 },
  { destination: "Delhi → Jaipur", fare: 3450 },
  { destination: "Delhi → Manali", fare: 6730 },
  { destination: "Delhi → Agra", fare: 2200 },
  { destination: "Delhi → Rishikesh", fare: 3300 },
];

export default function ReferralProgram() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [refApplied, setRefApplied] = useState(false);
  const [friends, setFriends] = useState(3);
  const [manualCode, setManualCode] = useState("");
  const [manualCodeError, setManualCodeError] = useState("");

  const { data: program } = trpc.referral.getProgram.useQuery();
  const { data: myStats } = trpc.referral.getMyStats.useQuery(undefined, { enabled: !!user });
  const { data: myCode } = trpc.referral.getMyCode.useQuery(undefined, { enabled: !!user });
  const applyCode = trpc.referral.applyReferralCode.useMutation({
    onSuccess: () => { setRefApplied(true); setManualCodeError(""); setManualCode(""); },
    onError: (e) => setManualCodeError(e.message),
  });

  const inboundRef = searchParams.get("ref");
  const referralLink = myCode?.code
    ? `https://easyoutstation.com/referral?ref=${myCode.code}`
    : "https://easyoutstation.com/referral";

  const baseEarnings = friends * 100;
  const milestoneBonus = friends >= 10 ? 200 : 0;
  const totalEarnings = baseEarnings + milestoneBonus;
  const closestTrip = TRIPS.reduce((best, t) => Math.abs(t.fare - totalEarnings) < Math.abs(best.fare - totalEarnings) ? t : best);

  useSeo({
    title: "Refer & Earn ₹100 | EasyOutstation Referral Program",
    description: "Invite friends to EasyOutstation and earn ₹100 travel credit when they complete their first outstation ride. No limit on referrals.",
    canonical: "https://www.easyoutstation.com/referral",
  });

  useEffect(() => {
    if (inboundRef) localStorage.setItem("eo_ref", inboundRef);
  }, [inboundRef]);

  useEffect(() => {
    if (!user) return;
    const storedRef = localStorage.getItem("eo_ref");
    if (!storedRef || refApplied) return;
    applyCode.mutate({ code: storedRef }, {
      onSettled: () => localStorage.removeItem("eo_ref"),
    });
  }, [user]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = async () => {
    const text = `Book your outstation cab with EasyOutstation and get ₹100 off! Fixed fares, verified drivers, zero hidden charges. Use my link: ${referralLink}`;
    if (navigator.share) {
      await navigator.share({ title: "EasyOutstation — ₹100 off for you!", text, url: referralLink });
    } else {
      handleCopy();
    }
  };

  if (program && !program.enabled) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />
        <main className="pt-20 flex items-center justify-center min-h-[60vh]">
          <div className="text-center px-4">
            <Gift className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-700 mb-2">Referral Program Coming Soon</h1>
            <p className="text-slate-500">Our referral program is currently paused. Check back soon!</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-16">

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="relative bg-gradient-to-br from-[#0B2447] via-[#19376D] to-[#1e4a8a] overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #ffffff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #ffffff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="relative max-w-5xl mx-auto px-4 py-24 text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 text-white text-xs font-semibold uppercase tracking-widest px-4 py-2 rounded-full mb-8 border border-white/20">
              <Gift className="w-3.5 h-3.5" />
              Referral Program
            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-white mb-6 font-['DM_Serif_Display'] leading-tight">
              {program?.headline ?? "Give ₹100. Get ₹100."}
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-10 leading-relaxed">
              {program?.subheadline ?? "Invite friends to EasyOutstation. When they complete their first ride, you both earn ₹100 travel credit."}
            </p>

            {user && myCode?.code ? (
              <div className="max-w-lg mx-auto">
                <div className="bg-white/10 border border-white/20 rounded-2xl p-5 mb-4 backdrop-blur-sm">
                  <p className="text-blue-200 text-xs uppercase tracking-widest mb-2">Your referral link</p>
                  <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-3 mb-4">
                    <span className="text-white text-sm truncate flex-1">{referralLink}</span>
                    <button onClick={handleCopy} className="text-blue-200 hover:text-white transition-colors shrink-0">
                      {copied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={handleCopy} variant="outline" className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white">
                      <Copy className="w-4 h-4 mr-2" />
                      {copied ? "Copied!" : "Copy Link"}
                    </Button>
                    <Button onClick={handleShare} className="flex-1 bg-white hover:bg-blue-50 text-[#19376D] font-semibold">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
                {myStats && myStats.balance > 0 && (
                  <div className="bg-green-500/20 border border-green-400/30 rounded-xl px-5 py-3 text-green-300 text-sm font-medium">
                    ✓ You have ₹{myStats.balance} in referral credits
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  onClick={() => navigate("/login?redirect=/referral")}
                  className="bg-white hover:bg-blue-50 text-[#19376D] font-semibold px-8 py-6 text-base rounded-xl"
                >
                  Start Referring — It's Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                  className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-base rounded-xl"
                >
                  How It Works
                </Button>
              </div>
            )}
          </div>
        </section>

        {/* ── Stats Bar ────────────────────────────────────────────── */}
        <section className="bg-slate-900 border-b border-slate-800">
          <div className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-3 gap-4 text-center">
            {[
              { value: "₹100", label: "You earn per referral" },
              { value: "₹100", label: "Your friend saves" },
              { value: "90 days", label: "Credit validity" },
            ].map(s => (
              <div key={s.label}>
                <div className="text-2xl sm:text-3xl font-bold text-white font-['DM_Serif_Display']">{s.value}</div>
                <div className="text-xs text-slate-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── How It Works ─────────────────────────────────────────── */}
        <section id="how-it-works" className="py-20 px-4 bg-slate-50">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Simple Process</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-['DM_Serif_Display']">How It Works</h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-8 relative">
              <div className="hidden sm:block absolute top-10 left-[calc(16.66%+1rem)] right-[calc(16.66%+1rem)] h-px bg-gradient-to-r from-blue-200 via-blue-400 to-blue-200" />
              {(program?.howItWorks ?? ["Share your link", "Friend completes first ride", "You both earn ₹100"]).map((step, i) => (
                <div key={i} className="text-center relative">
                  <div className="w-20 h-20 rounded-2xl bg-white shadow-md border border-slate-100 flex items-center justify-center mx-auto mb-5">
                    <span className="text-2xl font-bold text-[#19376D]">{i + 1}</span>
                  </div>
                  <p className="text-slate-700 font-medium leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Apply a Referral Code (for non-referred logged-in users) ── */}
        {user && !myStats?.hasBeenReferred && (
          <section className="py-10 px-4 bg-amber-50 border-y border-amber-100">
            <div className="max-w-xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
                <Gift className="w-3.5 h-3.5" />
                Have a referral code?
              </div>
              <p className="text-slate-600 text-sm mb-5">
                Enter a friend's code below. You'll both earn <strong>₹100 credit</strong> after your first completed ride.
                <span className="ml-1 text-amber-700 font-medium">(One-time use — each account can apply only one code)</span>
              </p>
              {applyCode.isSuccess || refApplied ? (
                <div className="flex items-center justify-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-6 py-4 text-green-700 font-medium">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                  Code applied! Your ₹100 credit will be added within 24 hours of your first completed ride.
                </div>
              ) : (
                <>
                  <div className="flex gap-2 max-w-sm mx-auto">
                    <input
                      type="text"
                      value={manualCode}
                      onChange={e => { setManualCode(e.target.value.toUpperCase()); setManualCodeError(""); }}
                      placeholder="e.g. EOAB1234"
                      maxLength={20}
                      className="flex-1 border border-amber-200 rounded-xl px-4 py-3 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    />
                    <Button
                      onClick={() => { if (manualCode.length >= 6) applyCode.mutate({ code: manualCode }); }}
                      disabled={manualCode.length < 6 || applyCode.isPending}
                      className="bg-amber-500 hover:bg-amber-600 text-white px-6 rounded-xl shrink-0"
                    >
                      {applyCode.isPending ? "Applying…" : "Apply"}
                    </Button>
                  </div>
                  {manualCodeError && <p className="text-xs text-red-500 mt-2">{manualCodeError}</p>}
                </>
              )}
            </div>
          </section>
        )}
        {user && myStats?.hasBeenReferred && (
          <section className="py-6 px-4 bg-green-50 border-y border-green-100">
            <div className="max-w-xl mx-auto flex items-center justify-center gap-2 text-green-700 text-sm font-medium">
              <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
              You've already applied a referral code. Credits will be added after your first completed ride.
            </div>
          </section>
        )}

        {/* ── Earnings Calculator + Phone Mockup ───────────────────── */}
        <section className="py-20 px-4 bg-gradient-to-br from-[#0B2447] via-[#19376D] to-[#0f3460] overflow-hidden relative">
          {/* Background dots */}
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

          <div className="relative max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-300 mb-3">See Your Potential</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-white font-['DM_Serif_Display']">How much can you earn?</h2>
              <p className="text-blue-200 mt-3 text-sm">Drag the slider to see your earnings grow in real time</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Calculator */}
              <div className="bg-white/10 border border-white/15 rounded-3xl p-8 backdrop-blur-sm">
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-blue-200 text-sm font-medium">Friends you refer</span>
                    <span className="text-white font-bold text-lg">{friends} {friends === 1 ? "friend" : "friends"}</span>
                  </div>
                  <input
                    type="range" min={1} max={20} value={friends}
                    onChange={e => setFriends(+e.target.value)}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{ background: `linear-gradient(to right, #60a5fa 0%, #60a5fa ${(friends - 1) / 19 * 100}%, rgba(255,255,255,0.2) ${(friends - 1) / 19 * 100}%, rgba(255,255,255,0.2) 100%)` }}
                  />
                  <div className="flex justify-between text-xs text-blue-300/60 mt-1.5">
                    <span>1</span><span>5</span><span>10</span><span>15</span><span>20</span>
                  </div>
                </div>

                {/* Earnings breakdown */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                    <span className="text-blue-200 text-sm">Base earnings</span>
                    <span className="text-white font-semibold">₹<AnimatedNumber value={baseEarnings} /></span>
                  </div>
                  <div className={`flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-500 ${friends >= 10 ? "bg-yellow-400/15 border border-yellow-400/30" : "bg-white/5"}`}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: friends >= 10 ? "#fbbf24" : "rgba(147,197,253,0.6)" }}>🏆 Milestone bonus</span>
                      {friends < 10 && <span className="text-xs text-blue-300/50">(at 10 referrals)</span>}
                      {friends >= 10 && <span className="text-xs text-yellow-400 font-semibold">Unlocked!</span>}
                    </div>
                    <span className={`font-semibold transition-colors ${friends >= 10 ? "text-yellow-400" : "text-blue-300/40"}`}>
                      +₹<AnimatedNumber value={milestoneBonus} />
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-400/30 rounded-2xl px-6 py-5 text-center mb-5">
                  <p className="text-blue-200 text-xs uppercase tracking-widest mb-1">Total you earn</p>
                  <p className="text-5xl font-bold text-white font-['DM_Serif_Display']">
                    ₹<AnimatedNumber value={totalEarnings} />
                  </p>
                </div>

                {/* Equivalent trip */}
                <div className="bg-white/5 rounded-xl px-4 py-3 text-center">
                  <p className="text-blue-200 text-xs">
                    That's almost a free{" "}
                    <span className="text-white font-semibold">{closestTrip.destination}</span>{" "}
                    cab worth <span className="text-white font-semibold">₹{closestTrip.fare.toLocaleString("en-IN")}</span>
                  </p>
                </div>

                {/* Progress to milestone */}
                {friends < 10 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-blue-300/70 mb-1.5">
                      <span>{friends} of 10 referrals</span>
                      <span>{10 - friends} more for ₹100 bonus</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full transition-all duration-500"
                        style={{ width: `${(friends / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Phone Mockup */}
              <div className="flex justify-center">
                <NotificationMockup amount={200} />
              </div>
            </div>
          </div>
        </section>

        {/* ── Value Props ──────────────────────────────────────────── */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Why Refer EasyOutstation</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-['DM_Serif_Display']">More than just a discount</h2>
              <p className="text-slate-500 mt-4 max-w-xl mx-auto">You're not just sharing a promo code. You're giving your friends access to verified drivers, fixed fares, and a cab service you trust.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Users, title: "Unlimited Referrals", desc: "No cap on how many people you refer. Every completed referral earns you ₹100." },
                { icon: Clock, title: "Credited in 24 Hours", desc: "Points are processed automatically within 24 hours of your friend's first completed ride." },
                { icon: Zap, title: "Instant Notification", desc: "Get email and SMS updates when someone joins using your link and when credits are added." },
                { icon: Shield, title: "No Expiry on Referrals", desc: "Your referral link never expires. If your friend books 6 months later, you still get credit." },
                { icon: Star, title: "Credits Stack Up", desc: "All your earnings accumulate. Refer 5 friends and save ₹500 on your next big trip." },
                { icon: Gift, title: "Both Sides Win", desc: "Your friend gets ₹100 credit too. Everyone benefits — no catches, no conditions." },
              ].map(f => (
                <div key={f.title} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5 text-[#19376D]" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── User Dashboard CTA (if logged in) ────────────────────── */}
        {user && myStats && (
          <section className="py-16 px-4 bg-gradient-to-r from-[#0B2447] to-[#19376D]">
            <div className="max-w-3xl mx-auto">
              <div className="bg-white/10 border border-white/20 rounded-3xl p-8 backdrop-blur-sm">
                <div className="grid sm:grid-cols-3 gap-6 text-center mb-8">
                  <div>
                    <div className="text-3xl font-bold text-white">{myStats.referrals.length}</div>
                    <div className="text-blue-200 text-sm mt-1">Referrals Made</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">₹{myStats.balance}</div>
                    <div className="text-blue-200 text-sm mt-1">Credits Available</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-white">
                      {myStats.referrals.filter(r => r.status === "points_allocated").length}
                    </div>
                    <div className="text-blue-200 text-sm mt-1">Rides Rewarded</div>
                  </div>
                </div>
                <div className="flex gap-3 justify-center flex-wrap">
                  <Button onClick={handleShare} className="bg-white text-[#19376D] hover:bg-blue-50 font-semibold px-8">
                    <Share2 className="w-4 h-4 mr-2" /> Share Your Link
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/dashboard")} className="border-white/30 text-white hover:bg-white/10">
                    View Dashboard
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── FAQ ──────────────────────────────────────────────────── */}
        <section className="py-20 px-4 bg-white">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Got Questions?</p>
              <h2 className="text-3xl font-bold text-slate-900 font-['DM_Serif_Display']">Referral Program FAQ</h2>
            </div>
            <div className="bg-slate-50 rounded-2xl px-6 py-2 border border-slate-100">
              {REFERRAL_FAQS.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
            </div>
          </div>
        </section>

        {/* ── Terms ─────────────────────────────────────────────────── */}
        <section className="py-12 px-4 bg-slate-50 border-t border-slate-100">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Terms & Conditions</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {program?.terms ?? "Referral credits of ₹100 are valid for 90 days from the date of credit. Credits are added within 24 hours of the referred friend's first completed ride. Credits are not applicable on cancelled trips. Credits cannot be transferred, encashed, or combined with other offers. EasyOutstation reserves the right to cancel referral credits in cases of fraudulent activity. EasyOutstation may modify or discontinue the referral program at any time with prior notice."}
            </p>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────── */}
        {!user && (
          <section className="py-20 px-4 bg-[#0B2447] text-center">
            <div className="max-w-xl mx-auto">
              <Gift className="w-12 h-12 text-blue-300 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-white mb-4 font-['DM_Serif_Display']">Start earning today</h2>
              <p className="text-blue-200 mb-8">Create a free account to get your referral link and start earning ₹100 per friend.</p>
              <Button
                onClick={() => navigate("/login?redirect=/referral")}
                className="bg-white hover:bg-blue-50 text-[#19376D] font-semibold px-10 py-6 text-base rounded-xl"
              >
                Create Free Account
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </section>
        )}

      </main>
      <Footer />
    </div>
  );
}
