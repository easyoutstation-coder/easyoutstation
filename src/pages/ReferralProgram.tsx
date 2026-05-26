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

// ─── Animated counter ────────────────────────────────────────────────────────
function AnimatedNumber({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const start = prev.current;
    const end = value;
    prev.current = end;
    if (start === end) return;
    const duration = 600;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{prefix}{display.toLocaleString("en-IN")}{suffix}</>;
}

// ─── Phone notification mockup ────────────────────────────────────────────────
function PhoneMockup({ amount }: { amount: number }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 700),
      setTimeout(() => setStep(2), 2000),
      setTimeout(() => setStep(3), 3400),
      setTimeout(() => { setStep(0); setTimeout(() => setStep(1), 500); }, 5800),
    ];
    return () => timers.forEach(clearTimeout);
  }, [amount]);

  return (
    <div className="relative w-[240px] sm:w-[260px] mx-auto select-none">
      <div className="relative bg-[#0a0a0a] rounded-[2.4rem] p-2.5 shadow-2xl border border-white/10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[72px] h-5 bg-[#0a0a0a] rounded-b-2xl z-10" />
        <div className="bg-[#111827] rounded-[2rem] overflow-hidden" style={{ height: 420 }}>
          <div className="flex items-center justify-between px-5 pt-7 pb-1.5">
            <span className="text-white text-xs font-semibold">9:41</span>
            <div className="flex items-center gap-1">
              <div className="flex gap-[2px] items-end h-3">
                {[2,3,4,4].map((h,i) => <div key={i} className="w-[3px] bg-white rounded-sm" style={{ height: h*3 }} />)}
              </div>
              <svg className="w-4 h-3 ml-1" viewBox="0 0 24 12" fill="none">
                <rect x="0.75" y="0.75" width="21.5" height="10.5" rx="2" stroke="white" strokeWidth="1.5"/>
                <rect x="2" y="2" width="17" height="8" rx="1" fill="white"/>
                <path d="M23 4v4a2 2 0 000-4z" fill="white"/>
              </svg>
            </div>
          </div>

          <div className="px-2.5 pt-1 space-y-2">
            <div className={`transition-all duration-700 ${step >= 1 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"}`}>
              <div className="bg-white/10 backdrop-blur rounded-2xl p-3 border border-white/10">
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center shrink-0 text-sm">🎁</div>
                  <div>
                    <p className="text-white text-[11px] font-semibold">EasyOutstation</p>
                    <p className="text-white/70 text-[11px] leading-tight mt-0.5">₹{amount} credit added! Your friend just joined.</p>
                    <p className="text-white/35 text-[10px] mt-1">now</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`transition-all duration-700 delay-200 ${step >= 2 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"}`}>
              <div className="bg-white/8 backdrop-blur rounded-2xl p-3 border border-white/10">
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shrink-0 text-[11px]">✉️</div>
                  <div>
                    <p className="text-white text-[11px] font-semibold">EasyOutstation</p>
                    <p className="text-white/70 text-[11px] leading-tight mt-0.5">First ride done! ₹{amount} is now in your wallet. Valid 90 days.</p>
                    <p className="text-white/35 text-[10px] mt-1">now</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`transition-all duration-700 delay-400 ${step >= 3 ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-3"}`}>
              <div className="bg-white/8 backdrop-blur rounded-2xl p-3 border border-white/10">
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#25D366] flex items-center justify-center shrink-0 text-[11px]">💬</div>
                  <div>
                    <p className="text-white text-[11px] font-semibold">WhatsApp</p>
                    <p className="text-white/70 text-[11px] leading-tight mt-0.5">Rahul: "Bhai thanks! Just saved ₹{amount} on Manali trip 🙌"</p>
                    <p className="text-white/35 text-[10px] mt-1">now</p>
                  </div>
                </div>
              </div>
            </div>

            <div className={`text-center pt-4 transition-opacity duration-500 ${step === 0 ? "opacity-100" : "opacity-0"}`}>
              <p className="text-white/20 text-4xl font-thin tabular-nums">9:41</p>
              <p className="text-white/15 text-[11px] mt-1">Monday, 26 May</p>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 rounded-[2.4rem] bg-blue-500/15 blur-3xl -z-10 scale-110" />
    </div>
  );
}

// ─── FAQ accordion ────────────────────────────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/8 last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-4 sm:py-5 text-left gap-4 group">
        <span className="font-medium text-slate-200 text-sm group-hover:text-white transition-colors">{q}</span>
        <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-300 ${open ? "rotate-180 text-blue-400" : ""}`} />
      </button>
      {open && <p className="text-slate-400 text-sm pb-4 sm:pb-5 leading-relaxed">{a}</p>}
    </div>
  );
}

const FAQS = [
  { q: "When do I get my ₹100 credit?", a: "Your ₹100 credit is added within 24 hours of your referred friend completing their first ride. You'll get an email and SMS confirmation." },
  { q: "Is there a limit on how many people I can refer?", a: "No limit. Refer as many friends as you like — every completed referral earns you ₹100. Credits accumulate in your dashboard." },
  { q: "Do credits expire?", a: "Yes. Referral credits are valid for 90 days from the date they're added. Check your balance and expiry dates in your dashboard." },
  { q: "What counts as a completed ride?", a: "A confirmed trip that is taken and marked complete by our team. Cancelled or refunded bookings do not qualify." },
  { q: "How do I use my referral credits?", a: "Credits are applied automatically on your next booking and deducted from the total fare." },
  { q: "Can I apply someone else's referral code?", a: "Yes — each account can apply exactly one referral code. You'll get ₹100 credit after your first completed ride." },
  { q: "What if my friend signed up but hasn't booked yet?", a: "The referral stays active. As soon as they complete their first ride, your credit is processed within 24 hours." },
];

const TRIPS = [
  { destination: "Delhi → Jaipur", fare: 3450 },
  { destination: "Delhi → Shimla", fare: 4450 },
  { destination: "Delhi → Rishikesh", fare: 3300 },
  { destination: "Delhi → Manali", fare: 6730 },
  { destination: "Delhi → Agra", fare: 2200 },
];

// ─── Floating activity pill ───────────────────────────────────────────────────
const ACTIVITY = [
  "Priya from Gurgaon just earned ₹100",
  "Rahul referred 3 friends this week",
  "Ankit from Noida just earned ₹100",
  "Sneha used her credit on Delhi→Manali",
  "Vikram's friend just completed their first ride",
];

function ActivityTicker() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const iv = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIdx(i => (i + 1) % ACTIVITY.length); setVisible(true); }, 400);
    }, 3500);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className="inline-flex items-center gap-2 bg-white/8 border border-white/10 rounded-full px-4 py-2 text-xs text-slate-300 overflow-hidden max-w-full">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
      <span className={`transition-all duration-400 truncate ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}>
        {ACTIVITY[idx]}
      </span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
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

  const amount = program?.referrerAmount ?? 100;
  const inboundRef = searchParams.get("ref");
  const referralLink = myCode?.code
    ? `https://easyoutstation.com/referral?ref=${myCode.code}`
    : "https://easyoutstation.com/referral";

  const baseEarnings = friends * amount;
  const milestoneBonus = friends >= 10 ? 200 : 0;
  const totalEarnings = baseEarnings + milestoneBonus;
  const closestTrip = TRIPS.reduce((best, t) =>
    Math.abs(t.fare - totalEarnings) < Math.abs(best.fare - totalEarnings) ? t : best
  );

  useSeo({
    title: `Refer & Earn ₹${amount} | EasyOutstation Referral Program`,
    description: `Invite friends to EasyOutstation and earn ₹${amount} travel credit when they complete their first outstation ride. No limit on referrals.`,
    canonical: "https://www.easyoutstation.com/referral",
  });

  useEffect(() => {
    if (inboundRef) localStorage.setItem("eo_ref", inboundRef);
  }, [inboundRef]);

  useEffect(() => {
    if (!user) return;
    const storedRef = localStorage.getItem("eo_ref");
    if (!storedRef || refApplied) return;
    applyCode.mutate({ code: storedRef }, { onSettled: () => localStorage.removeItem("eo_ref") });
  }, [user]);

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = async () => {
    const text = `Book your outstation cab with EasyOutstation and get ₹${amount} off! Fixed fares, verified drivers, zero hidden charges. Use my link: ${referralLink}`;
    if (navigator.share) {
      await navigator.share({ title: `EasyOutstation — ₹${amount} off for you!`, text, url: referralLink });
    } else {
      handleCopy();
    }
  };

  if (program && !program.enabled) {
    return (
      <div className="min-h-screen bg-[#050e1a]">
        <Navbar />
        <main className="pt-24 flex items-center justify-center min-h-[60vh]">
          <div className="text-center px-4">
            <Gift className="w-14 h-14 text-slate-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Referral Program Coming Soon</h1>
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
      <main>

        {/* ─────────────────────────────────────────────────────────────────────
            HERO
        ───────────────────────────────────────────────────────────────────── */}
        <section className="relative min-h-screen bg-[#050e1a] overflow-hidden flex flex-col">
          {/* Gradient orbs */}
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[100px] pointer-events-none" />
          <div className="absolute top-[40%] left-[50%] w-[300px] h-[300px] rounded-full bg-blue-400/5 blur-[80px] pointer-events-none" />

          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.035]" style={{
            backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "36px 36px",
          }} />

          <div className="relative flex-1 flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 w-full">
              <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">

                {/* Left col */}
                <div>
                  {/* Pill */}
                  <div className="inline-flex items-center gap-2 border border-white/10 bg-white/5 text-blue-300 text-[11px] font-bold uppercase tracking-[0.15em] px-4 py-2 rounded-full mb-6 sm:mb-8">
                    <Gift className="w-3 h-3" />
                    Referral Program
                  </div>

                  {/* Headline — clear, plain language */}
                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight mb-5 sm:mb-6 font-['DM_Serif_Display']">
                    Invite a Friend.
                    <br />
                    <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-blue-400 bg-clip-text text-transparent">
                      You Both Get
                    </span>
                    <br />
                    ₹{amount} Off.
                  </h1>

                  {/* Plain-English explanation */}
                  <p className="text-base sm:text-lg text-slate-400 leading-relaxed mb-6 sm:mb-8 max-w-md">
                    Share your personal link with a friend. When they complete their first outstation trip,{" "}
                    <span className="text-white font-semibold">₹{amount} travel credit lands in both accounts</span>{" "}
                    — automatically, within 24 hours.
                  </p>

                  {/* Activity ticker */}
                  <div className="mb-6 sm:mb-8">
                    <ActivityTicker />
                  </div>

                  {/* CTA block */}
                  {user && myCode?.code ? (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-5 max-w-md">
                      <p className="text-slate-400 text-xs uppercase tracking-widest mb-3 font-medium">Your referral link</p>
                      <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 sm:px-4 py-3 mb-4">
                        <span className="text-slate-300 text-xs sm:text-sm truncate flex-1 font-mono">{referralLink}</span>
                        <button onClick={handleCopy} className="shrink-0 transition-colors">
                          {copied
                            ? <CheckCircle className="w-4 h-4 text-emerald-400" />
                            : <Copy className="w-4 h-4 text-slate-400 hover:text-white" />}
                        </button>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleCopy}
                          className="flex-1 flex items-center justify-center gap-2 border border-white/15 text-slate-200 hover:bg-white/5 text-sm font-medium py-3 rounded-xl transition-all"
                        >
                          <Copy className="w-4 h-4" />
                          {copied ? "Copied!" : "Copy Link"}
                        </button>
                        <button
                          onClick={handleShare}
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-3 rounded-xl transition-all"
                        >
                          <Share2 className="w-4 h-4" />
                          Share Now
                        </button>
                      </div>
                      <p className="text-center text-xs text-slate-600 mt-3 font-mono">
                        Code: <span className="text-slate-400 font-bold">{myCode.code}</span>
                      </p>
                      {myStats && myStats.balance > 0 && (
                        <div className="mt-3 flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-emerald-400 text-xs font-medium">
                          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                          You have ₹{myStats.balance} in referral credits
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                      <button
                        onClick={() => navigate("/login?redirect=/referral")}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-7 py-4 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] text-base"
                      >
                        Get My Referral Link
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                        className="flex items-center justify-center gap-2 border border-white/15 text-slate-300 hover:bg-white/5 px-6 py-4 rounded-xl transition-all text-base"
                      >
                        How It Works
                      </button>
                    </div>
                  )}
                </div>

                {/* Right col — phone */}
                <div className="hidden lg:flex justify-center items-center">
                  <PhoneMockup amount={amount} />
                </div>
              </div>
            </div>
          </div>

          {/* Stats strip at bottom of hero */}
          <div className="relative border-t border-white/5 bg-white/2">
            <div className="max-w-7xl mx-auto px-4 py-4 sm:py-5 grid grid-cols-3 gap-3 sm:gap-4 text-center">
              {[
                { val: `₹${amount}`, label: "You earn per referral" },
                { val: `₹${amount}`, label: "Your friend saves" },
                { val: "90 days", label: "Credit validity" },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-lg sm:text-2xl font-black text-white font-['DM_Serif_Display']">{s.val}</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 uppercase tracking-wider leading-tight">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────────
            HOW IT WORKS
        ───────────────────────────────────────────────────────────────────── */}
        <section id="how-it-works" className="py-12 sm:py-20 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10 sm:mb-14">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 mb-3">How It Works</p>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['DM_Serif_Display'] tracking-tight">
                3 Simple Steps to Free Rides
              </h2>
              <p className="text-slate-500 mt-3 text-sm max-w-lg mx-auto">No complicated process. Share a link, your friend books, you both get credited.</p>
            </div>

            {/* Share / Both Earn cards */}
            <div className="flex flex-col sm:flex-row items-stretch gap-0 mb-12 sm:mb-16 rounded-3xl overflow-hidden shadow-xl border border-slate-100">
              <div className="flex-1 bg-gradient-to-br from-[#0B2447] to-[#19376D] p-6 sm:p-10 text-white">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mb-4 sm:mb-5 text-xl sm:text-2xl">🔗</div>
                <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-2">You do</p>
                <p className="text-2xl sm:text-3xl font-black font-['DM_Serif_Display'] mb-2 sm:mb-3">Share Your Link</p>
                <p className="text-blue-200 text-sm leading-relaxed">
                  Copy your unique link and send it to a friend planning an outstation trip. Takes 10 seconds.
                </p>
              </div>

              {/* Connector */}
              <div className="flex items-center justify-center bg-slate-50 px-4 py-5 sm:py-0 sm:px-6">
                <div className="flex sm:flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                    <ArrowRight className="w-5 h-5 text-white rotate-0 sm:rotate-90" />
                  </div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold text-center">After first ride</p>
                </div>
              </div>

              <div className="flex-1 bg-gradient-to-br from-emerald-600 to-teal-700 p-6 sm:p-10 text-white">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center mb-4 sm:mb-5 text-xl sm:text-2xl">🎉</div>
                <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-2">You both get</p>
                <p className="text-2xl sm:text-3xl font-black font-['DM_Serif_Display'] mb-2 sm:mb-3">₹{amount} Credit Each</p>
                <p className="text-emerald-100 text-sm leading-relaxed">
                  After their first completed trip, ₹{amount} is automatically added to both accounts within 24 hours.
                </p>
              </div>
            </div>

            {/* Steps */}
            <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
              {(program?.howItWorks ?? [
                "Copy your unique referral link from your dashboard",
                "Share it with friends, family, or travel groups",
                `When they complete their first ride, you both earn ₹${amount} credit`,
              ]).map((step, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0 shadow-md shadow-blue-100">
                    <span className="text-white text-sm font-black">{i + 1}</span>
                  </div>
                  <div className="pt-1">
                    <p className="text-slate-700 text-sm font-medium leading-relaxed">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────────
            APPLY CODE — for non-referred logged-in users
        ───────────────────────────────────────────────────────────────────── */}
        {user && !myStats?.hasBeenReferred && (
          <section className="py-10 sm:py-14 px-4 bg-slate-50 border-y border-slate-100">
            <div className="max-w-lg mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 text-[11px] font-bold uppercase tracking-[0.15em] px-3 py-1.5 rounded-full mb-4">
                <Gift className="w-3 h-3" />
                Got a friend's code?
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Apply it to get ₹{amount} off your first trip</h3>
              <p className="text-slate-500 text-sm mb-5">
                Enter the referral code your friend shared with you. You'll get ₹{amount} credit after your first completed ride.{" "}
                <span className="text-amber-700 font-semibold">One use per account.</span>
              </p>
              {applyCode.isSuccess || refApplied ? (
                <div className="flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-6 py-4 text-emerald-700 font-medium text-sm">
                  <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                  Code applied! ₹{amount} credit will land within 24 hrs of your first completed ride.
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualCode}
                      onChange={e => { setManualCode(e.target.value.toUpperCase()); setManualCodeError(""); }}
                      placeholder="e.g. EOAB1234"
                      maxLength={20}
                      className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                    />
                    <Button
                      onClick={() => { if (manualCode.length >= 6) applyCode.mutate({ code: manualCode }); }}
                      disabled={manualCode.length < 6 || applyCode.isPending}
                      className="bg-amber-500 hover:bg-amber-400 text-white px-6 rounded-xl shrink-0 font-semibold"
                    >
                      {applyCode.isPending ? "Applying…" : "Apply"}
                    </Button>
                  </div>
                  {manualCodeError && <p className="text-xs text-red-500 mt-2 text-left">{manualCodeError}</p>}
                </>
              )}
            </div>
          </section>
        )}
        {user && myStats?.hasBeenReferred && (
          <section className="py-5 px-4 bg-emerald-50 border-y border-emerald-100">
            <div className="max-w-lg mx-auto flex items-center justify-center gap-2 text-emerald-700 text-sm font-medium">
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              You've applied a referral code. ₹{amount} credit will be added after your first completed ride.
            </div>
          </section>
        )}

        {/* ─────────────────────────────────────────────────────────────────────
            EARNINGS CALCULATOR
        ───────────────────────────────────────────────────────────────────── */}
        <section className="py-12 sm:py-20 px-4 bg-[#050e1a] relative overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-blue-600/8 blur-[100px] pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full bg-violet-600/8 blur-[100px] pointer-events-none" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

          <div className="relative max-w-5xl mx-auto">
            <div className="text-center mb-10 sm:mb-14">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-3">See Your Potential</p>
              <h2 className="text-3xl sm:text-4xl font-black text-white font-['DM_Serif_Display'] tracking-tight">How much can you earn?</h2>
              <p className="text-slate-500 mt-3 text-sm">Drag the slider to see how credits add up.</p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 sm:gap-10 items-center">
              {/* Calculator card */}
              <div className="bg-white/5 border border-white/8 rounded-3xl p-5 sm:p-8 backdrop-blur-sm">
                {/* Slider */}
                <div className="mb-6 sm:mb-8">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-slate-400 text-sm">Friends you refer</span>
                    <span className="text-white font-bold text-base">{friends} {friends === 1 ? "friend" : "friends"}</span>
                  </div>
                  <input
                    type="range" min={1} max={20} value={friends}
                    onChange={e => setFriends(+e.target.value)}
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, #3b82f6 0%, #8b5cf6 ${(friends-1)/19*100}%, rgba(255,255,255,0.1) ${(friends-1)/19*100}%, rgba(255,255,255,0.1) 100%)`,
                    }}
                  />
                  <div className="flex justify-between text-[11px] text-slate-600 mt-2">
                    <span>1</span><span>5</span><span>10</span><span>15</span><span>20</span>
                  </div>
                </div>

                {/* Breakdown */}
                <div className="space-y-2.5 mb-5 sm:mb-6">
                  <div className="flex items-center justify-between bg-white/4 rounded-xl px-4 py-3">
                    <span className="text-slate-400 text-sm">Base earnings</span>
                    <span className="text-white font-semibold">₹<AnimatedNumber value={baseEarnings} /></span>
                  </div>
                  <div className={`flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-500 ${friends >= 10 ? "bg-yellow-400/10 border border-yellow-400/20" : "bg-white/4"}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm transition-colors ${friends >= 10 ? "text-yellow-400" : "text-slate-500"}`}>🏆 Milestone bonus</span>
                      {friends < 10
                        ? <span className="text-[11px] text-slate-600">{10 - friends} more to unlock</span>
                        : <span className="text-[11px] text-yellow-400 font-bold">Unlocked!</span>}
                    </div>
                    <span className={`font-semibold transition-colors ${friends >= 10 ? "text-yellow-400" : "text-slate-600"}`}>
                      +₹<AnimatedNumber value={milestoneBonus} />
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="bg-gradient-to-r from-blue-600/20 to-violet-600/20 border border-blue-500/20 rounded-2xl px-6 py-5 text-center mb-4">
                  <p className="text-slate-400 text-[11px] uppercase tracking-widest mb-1">You earn</p>
                  <p className="text-4xl sm:text-5xl font-black text-white font-['DM_Serif_Display']">
                    ₹<AnimatedNumber value={totalEarnings} />
                  </p>
                </div>

                <div className="bg-white/4 rounded-xl px-4 py-3 text-center">
                  <p className="text-slate-400 text-xs">
                    Almost a free{" "}
                    <span className="text-white font-semibold">{closestTrip.destination}</span>{" "}
                    cab — worth ₹{closestTrip.fare.toLocaleString("en-IN")}
                  </p>
                </div>

                {friends < 10 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-[11px] text-slate-600 mb-1.5">
                      <span>{friends} of 10 referrals</span>
                      <span>{10 - friends} more for ₹200 bonus</span>
                    </div>
                    <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
                        style={{ width: `${(friends / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Phone mockup */}
              <div className="flex justify-center">
                <PhoneMockup amount={amount} />
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────────
            VALUE PROPS — why EasyOutstation
        ───────────────────────────────────────────────────────────────────── */}
        <section className="py-12 sm:py-20 px-4 bg-white">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10 sm:mb-14">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 mb-3">Why Refer Us</p>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-['DM_Serif_Display'] tracking-tight">Your friends will thank you</h2>
              <p className="text-slate-500 mt-3 sm:mt-4 text-sm max-w-lg mx-auto">
                You're giving your friends verified drivers, fixed fares, and a service you already trust.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {[
                { icon: Users, title: "No Limit on Referrals", desc: `Refer as many friends as you like. Every completed referral earns you ₹${amount}. Refer 20 friends, earn ₹${20*amount}.` },
                { icon: Clock, title: "Credit in 24 Hours", desc: "Points are added automatically within 24 hours of your friend's first completed ride. No claiming needed." },
                { icon: Zap, title: "Instant Notifications", desc: "SMS and email updates when someone joins your link — and again when your credit is added." },
                { icon: Shield, title: "Your Link Never Expires", desc: "Your referral link works forever. If a friend books 6 months later, you still get credit." },
                { icon: Star, title: "Credits Stack Up", desc: `Refer 5 friends and save ₹${5*amount} on your next big trip. Refer 10 and unlock a ₹200 bonus.` },
                { icon: Gift, title: "Your Friend Saves Too", desc: `Your friend gets ₹${amount} credit as well — not just you. No one loses. No hidden conditions.` },
              ].map(f => (
                <div key={f.title} className="bg-slate-50 rounded-2xl p-5 sm:p-6 border border-slate-100 hover:shadow-lg hover:border-blue-100 hover:-translate-y-1 transition-all duration-200">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1.5 text-sm sm:text-base">{f.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────────
            LOGGED-IN STATS (if user has referrals)
        ───────────────────────────────────────────────────────────────────── */}
        {user && myStats && (
          <section className="py-12 sm:py-16 px-4 bg-[#050e1a] relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />
            <div className="relative max-w-3xl mx-auto">
              <div className="bg-white/5 border border-white/8 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
                <p className="text-slate-400 text-xs uppercase tracking-widest text-center mb-6 font-bold">Your Referral Summary</p>
                <div className="grid grid-cols-3 gap-4 sm:gap-6 text-center mb-6 sm:mb-8">
                  <div>
                    <div className="text-3xl sm:text-4xl font-black text-white font-['DM_Serif_Display']">{myStats.referrals.length}</div>
                    <div className="text-slate-500 text-xs mt-1 uppercase tracking-wider">Referred</div>
                  </div>
                  <div>
                    <div className="text-3xl sm:text-4xl font-black text-white font-['DM_Serif_Display']">₹{myStats.balance}</div>
                    <div className="text-slate-500 text-xs mt-1 uppercase tracking-wider">Credits</div>
                  </div>
                  <div>
                    <div className="text-3xl sm:text-4xl font-black text-white font-['DM_Serif_Display']">
                      {myStats.referrals.filter(r => r.status === "points_allocated").length}
                    </div>
                    <div className="text-slate-500 text-xs mt-1 uppercase tracking-wider">Rewarded</div>
                  </div>
                </div>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button onClick={handleShare} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 sm:px-7 py-3 rounded-xl transition-all text-sm">
                    <Share2 className="w-4 h-4" />
                    Share Your Link
                  </button>
                  <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 border border-white/15 text-slate-300 hover:bg-white/5 px-6 sm:px-7 py-3 rounded-xl transition-all text-sm">
                    View Dashboard
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ─────────────────────────────────────────────────────────────────────
            FAQ
        ───────────────────────────────────────────────────────────────────── */}
        <section className="py-12 sm:py-20 px-4 bg-[#050e1a] border-t border-white/5">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-8 sm:mb-12">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-3">Got Questions?</p>
              <h2 className="text-3xl sm:text-4xl font-black text-white font-['DM_Serif_Display'] tracking-tight">FAQ</h2>
            </div>
            <div className="bg-white/4 border border-white/8 rounded-3xl px-4 sm:px-6 py-2">
              {FAQS.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────────
            TERMS
        ───────────────────────────────────────────────────────────────────── */}
        <section className="py-8 sm:py-10 px-4 bg-[#030810] border-t border-white/5">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">Terms & Conditions</h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              {program?.terms ?? `Referral credits of ₹${amount} are valid for 90 days from the date of credit. Credits are added within 24 hours of the referred friend's first completed ride. Credits are not applicable on cancelled trips. Credits cannot be transferred, encashed, or combined with other offers. Each account can apply a referral code only once. EasyOutstation reserves the right to cancel referral credits in cases of fraudulent activity and may modify or discontinue the referral program at any time with prior notice.`}
            </p>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────────
            FINAL CTA (non-logged-in)
        ───────────────────────────────────────────────────────────────────── */}
        {!user && (
          <section className="py-16 sm:py-24 px-4 bg-[#050e1a] border-t border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-blue-600/10 blur-[100px] pointer-events-none" />
            <div className="relative max-w-xl mx-auto text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-blue-600/15 border border-blue-500/20 flex items-center justify-center mx-auto mb-5 sm:mb-6">
                <Gift className="w-7 h-7 sm:w-8 sm:h-8 text-blue-400" />
              </div>
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-3 sm:mb-4 font-['DM_Serif_Display'] tracking-tight">
                Start earning today
              </h2>
              <p className="text-slate-400 mb-8 sm:mb-10 text-sm sm:text-base">
                Create a free account and get your referral link in seconds.
                <br />Earn ₹{amount} for every friend who completes their first ride.
              </p>
              <button
                onClick={() => navigate("/login?redirect=/referral")}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 sm:px-10 py-4 rounded-xl text-base transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-900/40"
              >
                Create Free Account
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </section>
        )}

      </main>
      <Footer />
    </div>
  );
}
