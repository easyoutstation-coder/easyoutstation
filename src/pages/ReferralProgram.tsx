import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { useSeo } from "@/hooks/useSeo";
import {
  Gift, Users, CheckCircle, ArrowRight, Star, Shield,
  Clock, Zap, Share2, Copy, ChevronDown, TrendingUp, Award, Heart,
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

const REFERRAL_FAQS = [
  { q: "When do I get my ₹200 credit?", a: "Your ₹200 credit is added to your account within 24 hours of your referred friend completing their first ride with EasyOutstation. You'll receive an email and SMS confirmation." },
  { q: "Is there a limit on how many people I can refer?", a: "No limit at all. You can refer as many friends, family members, and colleagues as you like. Every completed referral earns you ₹200 — they accumulate in your dashboard." },
  { q: "Do credits expire?", a: "Yes. Referral credits are valid for 90 days from the date they are added to your account. You can view your credit balance and expiry dates in your dashboard." },
  { q: "What counts as a 'completed ride'?", a: "A completed ride is one that is confirmed, taken, and marked complete by our team. Cancelled or refunded bookings do not qualify for referral credits." },
  { q: "How do I use my referral credits?", a: "Credits are applied automatically when you make your next booking. The ₹200 will be deducted from your total fare. You can check your balance anytime in your dashboard." },
  { q: "Can I refer someone who already has an EasyOutstation account?", a: "Yes, but the referral is only credited once per user — specifically when a new user makes their first completed ride using your referral link." },
  { q: "What if my friend signed up but hasn't booked yet?", a: "The referral stays active. As soon as your friend completes their first ride, your credit will be processed within 24 hours." },
];

const SUGGESTED_FEATURES = [
  { icon: TrendingUp, title: "Milestone Bonuses", desc: "Earn ₹500 bonus at 5 referrals, ₹1,500 at 10, ₹3,500 at 20 — rewarding your most loyal advocates." },
  { icon: Award, title: "Referral Leaderboard", desc: "See where you rank among top referrers. Top 3 each month win free rides." },
  { icon: Star, title: "Festive Multipliers", desc: "Double points during Diwali, Holi, and summer peak season." },
  { icon: Heart, title: "Points for Reviews", desc: "Earn ₹50 credit for every verified review you leave after a trip." },
  { icon: Shield, title: "Corporate Referral Track", desc: "Special higher rewards for referring businesses that book regular employee travel." },
  { icon: Zap, title: "Referral Streaks", desc: "Refer 3 people in a month and unlock a ₹200 streak bonus on top of your regular credits." },
];

export default function ReferralProgram() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [refApplied, setRefApplied] = useState(false);

  const { data: program } = trpc.referral.getProgram.useQuery();
  const { data: myStats } = trpc.referral.getMyStats.useQuery(undefined, { enabled: !!user });
  const { data: myCode } = trpc.referral.getMyCode.useQuery(undefined, { enabled: !!user });
  const applyCode = trpc.referral.applyReferralCode.useMutation({ onSuccess: () => setRefApplied(true) });

  const inboundRef = searchParams.get("ref");
  const referralLink = myCode?.code
    ? `https://easyoutstation.com/referral?ref=${myCode.code}`
    : "https://easyoutstation.com/referral";

  useSeo({
    title: "Refer & Earn ₹200 | EasyOutstation Referral Program",
    description: "Invite friends to EasyOutstation and earn ₹200 travel credit when they complete their first outstation ride. No limit on referrals.",
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
    const text = `Book your outstation cab with EasyOutstation and get ₹200 off! Fixed fares, verified drivers, zero hidden charges. Use my link: ${referralLink}`;
    if (navigator.share) {
      await navigator.share({ title: "EasyOutstation — ₹200 off for you!", text, url: referralLink });
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
              {program?.headline ?? "Give ₹200. Get ₹200."}
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-10 leading-relaxed">
              {program?.subheadline ?? "Invite friends to EasyOutstation. When they complete their first ride, you both earn ₹200 travel credit."}
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
              { value: "₹200", label: "You earn per referral" },
              { value: "₹200", label: "Your friend saves" },
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
              {(program?.howItWorks ?? ["Share your link", "Friend completes first ride", "You both earn ₹200"]).map((step, i) => (
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
                { icon: Users, title: "Unlimited Referrals", desc: "No cap on how many people you refer. Every completed referral earns you ₹200." },
                { icon: Clock, title: "Credited in 24 Hours", desc: "Points are processed automatically within 24 hours of your friend's first completed ride." },
                { icon: Zap, title: "Instant Notification", desc: "Get email and SMS updates when someone joins using your link and when credits are added." },
                { icon: Shield, title: "No Expiry on Referrals", desc: "Your referral link never expires. If your friend books 6 months later, you still get credit." },
                { icon: Star, title: "Credits Stack Up", desc: "All your earnings accumulate. Refer 5 friends and save ₹1,000 on your next big trip." },
                { icon: Gift, title: "Both Sides Win", desc: "Your friend gets ₹200 credit too. Everyone benefits — no catches, no conditions." },
              ].map(f => (
                <div key={f.title} className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
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

        {/* ── Suggested Future Features ─────────────────────────────── */}
        <section className="py-20 px-4 bg-slate-50">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Coming Soon</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 font-['DM_Serif_Display']">More Rewards on the Way</h2>
              <p className="text-slate-500 mt-4 max-w-xl mx-auto">We're building more ways for loyal customers to earn. Here's what's coming.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {SUGGESTED_FEATURES.map(f => (
                <div key={f.title} className="bg-white rounded-2xl p-6 border border-slate-100 opacity-80 relative overflow-hidden">
                  <div className="absolute top-3 right-3 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">Soon</div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                    <f.icon className="w-5 h-5 text-blue-500" />
                  </div>
                  <h3 className="font-semibold text-slate-800 mb-2">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

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
              {program?.terms ?? "Referral credits of ₹200 are valid for 90 days from the date of credit. Credits are added within 24 hours of the referred friend's first completed ride. Credits are not applicable on cancelled trips. Credits cannot be transferred, encashed, or combined with other offers. EasyOutstation reserves the right to cancel referral credits in cases of fraudulent activity. EasyOutstation may modify or discontinue the referral program at any time with prior notice."}
            </p>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────────── */}
        {!user && (
          <section className="py-20 px-4 bg-[#0B2447] text-center">
            <div className="max-w-xl mx-auto">
              <Gift className="w-12 h-12 text-blue-300 mx-auto mb-6" />
              <h2 className="text-3xl font-bold text-white mb-4 font-['DM_Serif_Display']">Start earning today</h2>
              <p className="text-blue-200 mb-8">Create a free account to get your referral link and start earning ₹200 per friend.</p>
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
