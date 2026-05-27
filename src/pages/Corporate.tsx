import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { trpc } from "@/providers/trpc";
import { useSeo } from "@/hooks/useSeo";
import {
  Building2, Users, FileText, Headphones, Shield, Zap,
  ArrowRight, CheckCircle, Loader2, MapPin, Clock,
  Briefcase, Plane, Car, Star, ChevronDown,
} from "lucide-react";

// ─── Animation keyframes injected once ────────────────────────────────────────
const STYLES = `
  @keyframes eo-fadeUp {
    from { opacity: 0; transform: translateY(28px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes eo-float {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-10px); }
  }
  @keyframes eo-float2 {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-14px); }
  }
  @keyframes eo-orb {
    0%,100% { opacity: 0.09; transform: scale(1); }
    50%      { opacity: 0.16; transform: scale(1.06); }
  }
  @keyframes eo-marquee {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  @keyframes eo-shimmer {
    0%   { transform: translateX(-200%); }
    100% { transform: translateX(200%); }
  }
  @keyframes eo-gradText {
    0%,100% { background-position: 0% 50%; }
    50%      { background-position: 100% 50%; }
  }
  @keyframes eo-lineGrow {
    from { width: 0%; }
    to   { width: 100%; }
  }
  .eo-fadeUp   { animation: eo-fadeUp 0.75s cubic-bezier(0.16,1,0.3,1) both; }
  .eo-float    { animation: eo-float  4s ease-in-out infinite; }
  .eo-float2   { animation: eo-float2 5.5s ease-in-out infinite 0.8s; }
  .eo-orb      { animation: eo-orb    7s ease-in-out infinite; }
  .eo-marquee  { animation: eo-marquee 36s linear infinite; }
  .eo-gradText {
    background-size: 200% 200%;
    animation: eo-gradText 5s ease infinite;
  }
  .eo-shimmer-card::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.04) 50%, transparent 60%);
    animation: eo-shimmer 3.5s ease-in-out infinite;
    pointer-events: none;
  }
`;

// ─── Scroll-reveal hook ───────────────────────────────────────────────────────
function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function AnimCounter({ to, prefix = "", suffix = "" }: { to: number; prefix?: string; suffix?: string }) {
  const [val, setVal] = useState(0);
  const { ref, visible } = useInView(0.5);
  useEffect(() => {
    if (!visible) return;
    const dur = 1200;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(to * ease));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [visible, to]);
  return <span ref={ref}>{prefix}{val.toLocaleString("en-IN")}{suffix}</span>;
}

// ─── Reveal wrapper ────────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, visible } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/8 last:border-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left gap-4 group">
        <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">{q}</span>
        <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform duration-300 ${open ? "rotate-180 text-blue-400" : ""}`} />
      </button>
      {open && <p className="text-slate-400 text-sm pb-5 leading-relaxed">{a}</p>}
    </div>
  );
}

const FAQS = [
  { q: "How is corporate pricing different from standard rates?", a: "Corporate accounts get negotiated flat rates based on trip volume, fixed monthly billing cycles, and priority driver allocation — all discussed during onboarding. No pricing is disclosed publicly to protect partner terms." },
  { q: "Can employees book directly without upfront payment?", a: "Yes. Once your corporate account is set up, whitelisted employees can book and the cost is billed to the company account at the end of the month with a GST invoice." },
  { q: "How quickly can we get a corporate account activated?", a: "Typically within 24–48 hours of submitting your inquiry. Our account manager will call you, understand your requirements, and share a custom proposal." },
  { q: "Do you provide GST invoices for every trip?", a: "Yes, 100%. Every trip generates a GST-compliant invoice that you can use for expense reimbursements and accounting." },
  { q: "What types of trips do you cover for businesses?", a: "Daily office commutes, airport and station transfers, outstation offsites, client pickups, event logistics, and any ad-hoc travel your team needs." },
];

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function Corporate() {

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [designation, setDesignation] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [requirement, setRequirement] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useSeo({
    title: "Corporate Cab Service Delhi | EasyOutstation for Business",
    description: "Dedicated outstation cab service for businesses in Delhi NCR. GST invoices, dedicated account manager, employee transport, flexible billing. Request a custom quote.",
    canonical: "https://www.easyoutstation.com/corporate",
  });

  const enquiry = trpc.admin.submitCorporateEnquiry.useMutation({
    onSuccess: () => setDone(true),
    onError: (e) => setError(e.message || "Something went wrong. Please try again."),
  });

  const handleSubmit = () => {
    setError("");
    if (!name.trim() || name.trim().length < 2) { setError("Please enter your full name."); return; }
    if (!phone || phone.length !== 10) { setError("Please enter a valid 10-digit mobile number."); return; }
    if (!company.trim() || company.trim().length < 2) { setError("Please enter your company name."); return; }
    enquiry.mutate({
      name: name.trim(),
      phone,
      company: company.trim(),
      designation: designation || undefined,
      teamSize: teamSize || undefined,
      requirement: requirement || undefined,
      message: message || undefined,
    });
  };

  const scrollToForm = () => document.getElementById("quote-form")?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div className="min-h-screen bg-[#030810]">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <Navbar />

      <main>
        {/* ══════════════════════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════════════════════ */}
        <section className="relative min-h-screen bg-[#030810] overflow-hidden flex flex-col">
          {/* Animated orbs */}
          <div className="eo-orb absolute top-[-15%] left-[-8%] w-[700px] h-[700px] rounded-full bg-blue-600/10 blur-[130px] pointer-events-none" />
          <div className="eo-orb absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full bg-violet-600/10 blur-[110px] pointer-events-none" style={{ animationDelay: "2s" }} />
          <div className="eo-orb absolute top-[45%] left-[40%] w-[350px] h-[350px] rounded-full bg-blue-400/5 blur-[90px] pointer-events-none" style={{ animationDelay: "1s" }} />

          {/* Dot grid */}
          <div className="absolute inset-0 opacity-[0.028]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "36px 36px" }} />

          {/* Diagonal grid lines */}
          <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "linear-gradient(45deg, #ffffff 1px, transparent 1px), linear-gradient(-45deg, #ffffff 1px, transparent 1px)", backgroundSize: "80px 80px" }} />

          <div className="relative flex-1 flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 w-full">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

                {/* Left */}
                <div>
                  {/* Badge */}
                  <div className="eo-fadeUp inline-flex items-center gap-2.5 border border-blue-500/25 bg-blue-500/8 text-blue-300 text-[11px] font-bold uppercase tracking-[0.18em] px-4 py-2 rounded-full mb-8">
                    <Building2 className="w-3.5 h-3.5" />
                    Corporate & Enterprise
                  </div>

                  {/* Headline */}
                  <h1 className="eo-fadeUp text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.05] tracking-tight mb-6 font-['DM_Serif_Display']" style={{ animationDelay: "80ms" }}>
                    Your Team Travels.
                    <br />
                    <span
                      className="eo-gradText bg-gradient-to-r from-blue-400 via-violet-400 to-blue-300 bg-clip-text text-transparent"
                    >
                      We Handle the Rest.
                    </span>
                  </h1>

                  <p className="eo-fadeUp text-base sm:text-lg text-slate-400 leading-relaxed mb-8 max-w-lg" style={{ animationDelay: "160ms" }}>
                    Dedicated fleet management, GST-compliant invoicing, and a single account manager for all your company's outstation and local travel — at custom corporate rates.
                  </p>

                  {/* CTA */}
                  <div className="eo-fadeUp mb-10" style={{ animationDelay: "240ms" }}>
                    <button
                      onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                      className="flex items-center gap-2 border border-white/15 text-slate-300 hover:bg-white/5 px-6 py-3.5 rounded-xl transition-all text-sm"
                    >
                      See How It Works
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Trust micro-badges */}
                  <div className="eo-fadeUp flex flex-wrap gap-2" style={{ animationDelay: "320ms" }}>
                    {["GST Invoices Included", "No Pricing Online — Custom Rates", "24–48 hr Account Setup", "Dedicated Manager"].map((t, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 bg-white/5 border border-white/8 px-3 py-1.5 rounded-full">
                        <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right — Enquiry Form */}
                <div id="quote-form" className="eo-fadeUp" style={{ animationDelay: "200ms" }}>
                  <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
                    {done ? (
                      <div className="py-10 text-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mx-auto">
                          <CheckCircle className="w-7 h-7 text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white font-['DM_Serif_Display']">Enquiry Received</h3>
                        <p className="text-slate-400 text-sm">
                          Your account manager will call <strong className="text-white">+91-{phone}</strong> within a few hours with a custom proposal.
                        </p>
                        <div className="bg-blue-600/10 border border-blue-500/20 rounded-2xl px-5 py-4 text-sm text-blue-300 text-left">
                          In the meantime, WhatsApp us at <strong>+91-87965 64111</strong> for any urgent queries.
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="mb-2">
                          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-1">Get a Custom Quote</p>
                          <h2 className="text-lg font-bold text-white font-['DM_Serif_Display']">Request a Corporate Account</h2>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Full Name *</label>
                            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                              className="w-full h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Mobile *</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">+91</span>
                              <input value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit number" maxLength={10}
                                className="w-full h-10 pl-11 pr-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition" />
                            </div>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Company *</label>
                            <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company or organisation"
                              className="w-full h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Designation</label>
                            <input value={designation} onChange={e => setDesignation(e.target.value)} placeholder="e.g. HR Manager"
                              className="w-full h-10 px-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition" />
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Team Size</label>
                            <select value={teamSize} onChange={e => setTeamSize(e.target.value)}
                              className="w-full h-10 px-3 rounded-xl border border-white/10 bg-[#0d1e35] text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition appearance-none cursor-pointer">
                              <option value="">Select size</option>
                              <option value="1–10">1–10 employees</option>
                              <option value="11–50">11–50 employees</option>
                              <option value="51–200">51–200 employees</option>
                              <option value="200+">200+ employees</option>
                            </select>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Requirement</label>
                            <select value={requirement} onChange={e => setRequirement(e.target.value)}
                              className="w-full h-10 px-3 rounded-xl border border-white/10 bg-[#0d1e35] text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition appearance-none cursor-pointer">
                              <option value="">Select type</option>
                              <option value="Daily office commutes">Daily office commutes</option>
                              <option value="Airport & station transfers">Airport & station transfers</option>
                              <option value="Outstation offsites">Outstation offsites</option>
                              <option value="Client & guest pickups">Client & guest pickups</option>
                              <option value="Event logistics">Event logistics</option>
                              <option value="Mixed / all of the above">Mixed / all of the above</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Additional Details</label>
                          <textarea value={message} onChange={e => setMessage(e.target.value)}
                            placeholder="e.g. 15 employees, daily Noida → Gurugram, Mon–Fri, 8 AM..."
                            className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition min-h-[72px] resize-none" />
                        </div>

                        {error && (
                          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">{error}</p>
                        )}

                        <button onClick={handleSubmit} disabled={enquiry.isPending}
                          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-semibold py-3.5 rounded-xl transition-all hover:scale-[1.01] active:scale-[0.99] text-sm shadow-lg shadow-blue-900/30">
                          {enquiry.isPending
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                            : <>Submit Corporate Enquiry <ArrowRight className="w-4 h-4" /></>}
                        </button>

                        <p className="text-center text-[11px] text-slate-600">
                          We'll call you back within a few hours.{" "}
                          <a href="https://wa.me/918796564111?text=Hi%2C+I'd+like+to+enquire+about+a+corporate+account." target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:text-emerald-400 transition-colors font-medium">WhatsApp us</a>
                          {" "}for urgent queries.
                        </p>
                        <p className="text-center text-[11px] text-slate-500 pt-1">
                          Already a client?{" "}
                          <a href="/corporate-portal" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Access your portal →</a>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>

          {/* Bottom stats bar */}
          <div className="relative border-t border-white/5 bg-white/[0.015]">
            <div className="max-w-7xl mx-auto px-4 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              {[
                { val: "500+", label: "Corporate trips completed" },
                { val: "100%", label: "GST invoice coverage" },
                { val: "60 min", label: "Driver assignment" },
                { val: "24/7", label: "Dedicated support line" },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-xl sm:text-2xl font-black text-white font-['DM_Serif_Display']">{s.val}</div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5 uppercase tracking-wider leading-tight">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            MARQUEE
        ══════════════════════════════════════════════════════════════════ */}
        <div className="relative bg-blue-600/8 border-y border-blue-500/10 py-4 overflow-hidden">
          <div className="flex eo-marquee whitespace-nowrap select-none" style={{ willChange: "transform" }}>
            {Array(2).fill(null).map((_, ri) => (
              <div key={ri} className="flex items-center gap-0 shrink-0">
                {[
                  "GST Invoices on Every Trip",
                  "Dedicated Account Manager",
                  "Custom Corporate Rates",
                  "Employee Transport",
                  "Airport & Station Transfers",
                  "Outstation Offsites",
                  "Monthly Billing Cycles",
                  "Police-Verified Drivers",
                  "24/7 Priority Support",
                  "Fixed Fares — No Surge",
                ].map((item, i) => (
                  <span key={i} className="inline-flex items-center gap-3 mx-4 text-xs font-semibold text-slate-400 uppercase tracking-[0.15em]">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500/60 shrink-0" />
                    {item}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            CORE BENEFITS
        ══════════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-24 px-4 bg-[#050e1a] relative overflow-hidden">
          <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-violet-600/6 blur-[110px] pointer-events-none" />

          <div className="max-w-7xl mx-auto">
            <Reveal className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-3">Why Businesses Choose Us</p>
              <h2 className="text-3xl sm:text-4xl font-black text-white font-['DM_Serif_Display'] tracking-tight mb-3">
                Enterprise-Grade Transport.<br />
                <span className="text-slate-400 font-normal">Without the Enterprise Complexity.</span>
              </h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                We built the processes, paperwork, and logistics so your HR and finance teams don't have to.
              </p>
            </Reveal>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {[
                {
                  icon: Headphones,
                  title: "Dedicated Account Manager",
                  desc: "One person. One number. All your travel needs — bookings, invoices, escalations, and changes — handled by a single point of contact.",
                  accent: "blue",
                },
                {
                  icon: FileText,
                  title: "GST Invoices, Always",
                  desc: "Every trip auto-generates a GST-compliant invoice. Download individually or receive a consolidated monthly statement for accounting.",
                  accent: "violet",
                },
                {
                  icon: Building2,
                  title: "Monthly Credit Billing",
                  desc: "Employees travel without paying upfront. All trips are billed to your company account monthly — with full itemised breakdown.",
                  accent: "blue",
                },
                {
                  icon: Users,
                  title: "Employee Whitelisting",
                  desc: "Add your team members to the account. They book directly, we charge the company — no expense claims or reimbursements needed.",
                  accent: "emerald",
                },
                {
                  icon: Shield,
                  title: "Verified, Insured Fleet",
                  desc: "Every driver is police-verified, licensed for commercial transport, and every vehicle is fully insured. Compliance is non-negotiable.",
                  accent: "amber",
                },
                {
                  icon: Zap,
                  title: "60-Minute Driver Assignment",
                  desc: "Submit a booking request and your driver is confirmed within 60 minutes — even for same-day requirements.",
                  accent: "blue",
                },
              ].map((f, i) => {
                const accentCls = {
                  blue:    { border: "hover:border-blue-500/30",    bg: "bg-blue-500/10 border-blue-500/20",    icon: "text-blue-400" },
                  violet:  { border: "hover:border-violet-500/30",  bg: "bg-violet-500/10 border-violet-500/20", icon: "text-violet-400" },
                  emerald: { border: "hover:border-emerald-500/30", bg: "bg-emerald-500/10 border-emerald-500/20", icon: "text-emerald-400" },
                  amber:   { border: "hover:border-amber-500/30",   bg: "bg-amber-500/10 border-amber-500/20",   icon: "text-amber-400" },
                }[f.accent]!;
                return (
                  <Reveal key={i} delay={i * 80} className="relative overflow-hidden eo-shimmer-card">
                    <div className={`h-full bg-white/[0.03] border border-white/8 ${accentCls.border} rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/30 cursor-default`}>
                      <div className={`w-11 h-11 rounded-xl ${accentCls.bg} border flex items-center justify-center mb-5`}>
                        <f.icon className={`w-5 h-5 ${accentCls.icon}`} />
                      </div>
                      <h3 className="text-white font-semibold mb-2 text-sm sm:text-base">{f.title}</h3>
                      <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
                    </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            USE CASES
        ══════════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-24 px-4 bg-[#030810] relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full bg-blue-600/7 blur-[100px] pointer-events-none" />

          <div className="max-w-7xl mx-auto">
            <Reveal className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-3">Use Cases</p>
              <h2 className="text-3xl sm:text-4xl font-black text-white font-['DM_Serif_Display'] tracking-tight">
                Every Business Travel Need, Covered
              </h2>
            </Reveal>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  icon: "🏢",
                  title: "Daily Office Commutes",
                  desc: "Scheduled pickups for employees from home or metro stations to your office. Fixed routes, fixed times — every single day.",
                  tags: ["Monday–Friday", "Bulk scheduling", "Per-head billing"],
                },
                {
                  icon: "✈️",
                  title: "Airport & Station Transfers",
                  desc: "Executive drops and pickups from IGI Airport, Hazrat Nizamuddin, and New Delhi Railway Station — tracked and on time.",
                  tags: ["Flight tracking", "Early-morning slots", "Late-night available"],
                },
                {
                  icon: "🏔️",
                  title: "Outstation Offsites",
                  desc: "Team retreats to Manali, Shimla, Rishikesh, or Jaipur. Multiple cars coordinated from a single request with one invoice.",
                  tags: ["Multi-car coordination", "Overnight trips", "Single invoice"],
                },
                {
                  icon: "🤝",
                  title: "Client & Guest Pickups",
                  desc: "First impressions matter. Premium vehicles for client visits, investor meets, and VIP guest logistics — always on time.",
                  tags: ["Premium fleet", "Driver in uniform", "Nameboard service"],
                },
                {
                  icon: "📅",
                  title: "Event & Conference Logistics",
                  desc: "Managing attendee transport for company events, offsites, or conferences — from single cars to a fleet of 20.",
                  tags: ["Fleet management", "Staggered pickups", "Event coordination"],
                },
                {
                  icon: "🔄",
                  title: "Ad-Hoc & Emergency Travel",
                  desc: "Urgent requirement? Your account manager picks up the phone and dispatches the nearest available driver — no waiting.",
                  tags: ["Same-day booking", "60 min dispatch", "Priority queue"],
                },
              ].map((u, i) => (
                <Reveal key={i} delay={i * 70}>
                  <div className="bg-white/[0.03] border border-white/8 hover:border-white/15 rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 group">
                    <div className="text-3xl mb-4">{u.icon}</div>
                    <h3 className="text-white font-semibold mb-2">{u.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed mb-4">{u.desc}</p>
                    <div className="flex flex-wrap gap-2">
                      {u.tags.map((t, j) => (
                        <span key={j} className="text-[10px] text-slate-500 border border-white/8 group-hover:border-white/12 px-2.5 py-1 rounded-full transition-colors">{t}</span>
                      ))}
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            HOW IT WORKS
        ══════════════════════════════════════════════════════════════════ */}
        <section id="how-it-works" className="py-16 sm:py-24 px-4 bg-[#050e1a] relative overflow-hidden">
          <div className="absolute top-1/2 right-0 w-80 h-80 rounded-full bg-violet-600/6 blur-[100px] pointer-events-none" />

          <div className="max-w-5xl mx-auto">
            <Reveal className="text-center mb-12 sm:mb-16">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-3">Onboarding</p>
              <h2 className="text-3xl sm:text-4xl font-black text-white font-['DM_Serif_Display'] tracking-tight">
                Up and running in 48 hours
              </h2>
              <p className="text-slate-500 mt-3 text-sm max-w-lg mx-auto">
                From enquiry to first booking — our process is fast, personal, and paperwork-light.
              </p>
            </Reveal>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4 relative">
              {/* Connector line (desktop) */}
              <div className="absolute top-8 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-blue-600/30 via-violet-600/30 to-blue-600/30 hidden lg:block" />

              {[
                { step: "01", icon: FileText, title: "Submit Enquiry", desc: "Fill the form below. Name, company, and a brief requirement — that's all we need to start." },
                { step: "02", icon: Headphones, title: "Manager Calls You", desc: "Your dedicated account manager calls within a few hours to understand your exact needs." },
                { step: "03", icon: Star, title: "Custom Quote", desc: "You receive a tailored proposal with rates, billing terms, and service scope — no public pricing." },
                { step: "04", icon: Car, title: "Account Live", desc: "Account is set up within 48 hours. Your team can start booking immediately after activation." },
              ].map((s, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div className="text-center relative">
                    <div className="relative inline-flex w-16 h-16 rounded-2xl bg-white/5 border border-white/10 items-center justify-center mb-4 mx-auto">
                      <s.icon className="w-6 h-6 text-blue-400" />
                      <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="text-white text-[10px] font-black">{i + 1}</span>
                      </div>
                    </div>
                    <h3 className="text-white font-semibold mb-2 text-sm">{s.title}</h3>
                    <p className="text-slate-500 text-xs leading-relaxed">{s.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            FLEET — no pricing
        ══════════════════════════════════════════════════════════════════ */}
        <section className="py-16 sm:py-24 px-4 bg-[#030810] relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "radial-gradient(circle, #ffffff 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

          <div className="max-w-5xl mx-auto">
            <Reveal className="text-center mb-10 sm:mb-14">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-3">Our Fleet</p>
              <h2 className="text-3xl sm:text-4xl font-black text-white font-['DM_Serif_Display'] tracking-tight">
                The right vehicle for every occasion
              </h2>
              <div className="inline-flex items-center gap-2 mt-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold px-4 py-2 rounded-full">
                <Shield className="w-3.5 h-3.5" />
                Corporate rates are negotiated privately — not listed publicly
              </div>
            </Reveal>

            <div className="grid sm:grid-cols-3 gap-5">
              {[
                {
                  tier: "Economy",
                  vehicle: "Swift Dzire / Honda Amaze",
                  seats: "4 passengers",
                  best: "Daily commutes, solo travel",
                  img: "/cars/swift-dzire.jpg",
                  badge: "bg-slate-500/15 text-slate-400 border-slate-500/20",
                },
                {
                  tier: "Premium",
                  vehicle: "Toyota Innova Crysta",
                  seats: "6 passengers",
                  best: "Client meetings, offsites",
                  img: "/cars/toyota-innova-crysta.jpg",
                  badge: "bg-blue-500/15 text-blue-400 border-blue-500/20",
                  featured: true,
                },
                {
                  tier: "Luxury",
                  vehicle: "Innova Hycross / Fortuner",
                  seats: "6–7 passengers",
                  best: "VIP guests, C-suite travel",
                  img: "/cars/toyota-innova-hycross.jpg",
                  badge: "bg-violet-500/15 text-violet-400 border-violet-500/20",
                },
              ].map((v, i) => (
                <Reveal key={i} delay={i * 100}>
                  <div className={`relative rounded-2xl overflow-hidden border transition-all duration-300 hover:-translate-y-1 ${v.featured ? "border-blue-500/30 shadow-lg shadow-blue-900/20" : "border-white/8 hover:border-white/15"}`}>
                    {v.featured && (
                      <div className="absolute top-3 left-3 z-10 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">Most Popular</div>
                    )}
                    <div className="aspect-[16/9] overflow-hidden">
                      <img src={v.img} alt={v.vehicle} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#030810]/90 via-transparent to-transparent" />
                    </div>
                    <div className="bg-white/[0.03] p-5">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider border px-2.5 py-1 rounded-full ${v.badge}`}>{v.tier}</span>
                        <span className="text-[10px] text-slate-500">{v.seats}</span>
                      </div>
                      <h3 className="text-white font-semibold text-sm mb-1">{v.vehicle}</h3>
                      <p className="text-slate-500 text-xs">Best for: {v.best}</p>
                      <div className="mt-4 pt-3 border-t border-white/6 flex items-center justify-between">
                        <span className="text-slate-600 text-[11px]">Pricing on request</span>
                        <button onClick={scrollToForm} className="text-blue-400 text-[11px] font-semibold hover:text-blue-300 transition-colors">
                          Get Quote →
                        </button>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            COMPLIANCE STRIP
        ══════════════════════════════════════════════════════════════════ */}
        <section className="py-12 sm:py-16 px-4 bg-[#050e1a] border-y border-white/5">
          <div className="max-w-5xl mx-auto">
            <Reveal className="text-center mb-8 sm:mb-10">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-2">Compliance & Verification</p>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-['DM_Serif_Display']">
                Everything your procurement team needs
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { icon: "🏛️", title: "GST Registered", sub: "Tax invoices available" },
                  { icon: "🛡️", title: "Fully Insured", sub: "Passenger + vehicle cover" },
                  { icon: "✅", title: "Driver Verification", sub: "Police & background checked" },
                  { icon: "📄", title: "Commercial License", sub: "All vehicles licensed" },
                ].map((c, i) => (
                  <div key={i} className="flex flex-col items-center text-center p-4 sm:p-5 bg-white/[0.03] border border-white/8 rounded-2xl">
                    <span className="text-2xl mb-2">{c.icon}</span>
                    <p className="text-white text-xs sm:text-sm font-semibold mb-0.5">{c.title}</p>
                    <p className="text-slate-600 text-[10px] sm:text-xs">{c.sub}</p>
                  </div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════
            FAQ
        ══════════════════════════════════════════════════════════════════ */}
        <section className="py-12 sm:py-20 px-4 bg-[#030810]">
          <div className="max-w-2xl mx-auto">
            <Reveal className="text-center mb-8 sm:mb-12">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-3">Common Questions</p>
              <h2 className="text-3xl font-black text-white font-['DM_Serif_Display'] tracking-tight">FAQ</h2>
            </Reveal>
            <Reveal delay={100}>
              <div className="bg-white/[0.03] border border-white/8 rounded-3xl px-4 sm:px-6 py-2">
                {FAQS.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
              </div>
            </Reveal>
          </div>
        </section>


      </main>
      <Footer />
    </div>
  );
}
