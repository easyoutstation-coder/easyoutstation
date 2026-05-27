import { Link } from "react-router";
import { Building2, Users, FileText, Headphones, ArrowRight } from "lucide-react";

const perks = [
  { icon: FileText, title: "GST Invoices", desc: "Clean invoices for every trip — hassle-free reimbursement." },
  { icon: Users, title: "Employee Transport", desc: "Daily office commutes, airport drops, outstation offsites." },
  { icon: Headphones, title: "Dedicated Manager", desc: "One point of contact for all your fleet requirements." },
  { icon: Building2, title: "Flexible Billing", desc: "Monthly credit accounts available for regular clients." },
];

export default function CorporateSection() {
  return (
    <section id="corporate" className="scroll-mt-20 py-12 sm:py-20 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5"
        style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "60px 60px" }} />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

          {/* Left — pitch */}
          <div>
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-400 mb-4">
              <Building2 className="w-3.5 h-3.5" /> For Businesses
            </span>
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 font-['DM_Serif_Display'] leading-tight">
              Corporate & Employee<br />
              <span className="text-blue-300">Transport Made Simple</span>
            </h2>
            <p className="text-slate-400 mb-8 leading-relaxed">
              From daily office commutes to outstation offsites — we handle your team's travel so you don't have to.
              Fixed pricing, GST invoices, and a dedicated account manager for every corporate client.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {perks.map((p) => (
                <div key={p.title} className="flex gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center shrink-0">
                    <p.icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{p.title}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <Link
              to="/corporate"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 h-12 rounded-xl shadow-lg shadow-blue-900/40 transition-all"
            >
              Explore Corporate Plans <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Right — stats */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: "₹250", label: "Driver charge/day", sub: "No hidden fees" },
              { value: "60 min", label: "Driver assigned", sub: "After booking confirmation" },
              { value: "100%", label: "GST invoices", sub: "On every trip" },
              { value: "24/7", label: "Support available", sub: "Dedicated account manager" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-white/5 border border-white/10 p-5 text-center">
                <div className="text-2xl font-bold text-blue-300 mb-1">{s.value}</div>
                <div className="text-sm font-semibold text-white">{s.label}</div>
                <div className="text-xs text-slate-500 mt-1">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
