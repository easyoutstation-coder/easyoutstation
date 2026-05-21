import { Shield, Clock, IndianRupee, UserCheck, MapPin, Headphones } from "lucide-react";

const promises = [
  {
    icon: IndianRupee,
    title: "Fixed Fares, Always",
    desc: "The price you see is the price you pay. No surge pricing, no hidden extras, no surprises at the end of your trip.",
    color: "bg-blue-50 border-blue-100",
    iconColor: "text-blue-600 bg-blue-100",
  },
  {
    icon: UserCheck,
    title: "Verified Drivers Only",
    desc: "Every driver in our network is background-checked, licensed, and experienced on outstation routes before their first booking.",
    color: "bg-green-50 border-green-100",
    iconColor: "text-green-600 bg-green-100",
  },
  {
    icon: Clock,
    title: "On-Time or We Fix It",
    desc: "We take punctuality seriously. If there's ever a delay, our support team is on it immediately — day or night.",
    color: "bg-amber-50 border-amber-100",
    iconColor: "text-amber-600 bg-amber-100",
  },
  {
    icon: Shield,
    title: "Full Transparency",
    desc: "Toll estimates shown upfront. Final bill broken down line by line. We're building trust from day one — no shortcuts.",
    color: "bg-violet-50 border-violet-100",
    iconColor: "text-violet-600 bg-violet-100",
  },
];

const stats = [
  { num: "500+", label: "Trips completed by our driver network" },
  { num: "10+ yrs", label: "Average driver experience" },
  { num: "9", label: "Cities served" },
  { num: "4.9★", label: "Average customer rating" },
];

export default function TestimonialsSection() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Our Commitment</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-3 font-['DM_Serif_Display']">
            Transparency Is Not Optional
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            We're new, and we own that. What we bring is experienced drivers, honest pricing, and a commitment to earn your trust on every single trip.
          </p>
        </div>

        {/* Promise cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-14">
          {promises.map((p, i) => (
            <div key={i} className={`rounded-2xl border p-6 ${p.color} transition-all hover:shadow-sm`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${p.iconColor}`}>
                <p.icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2 text-sm">{p.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Honest stats from driver network */}
        <div className="bg-white rounded-2xl border border-slate-200 px-6 py-8">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">From Our Driver Network</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((s, i) => (
              <div key={i}>
                <div className="text-2xl font-bold text-blue-700 font-['DM_Serif_Display']">{s.num}</div>
                <div className="text-xs text-slate-500 mt-1 leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-[11px] text-slate-400 mt-5">
            Stats reflect the combined experience of drivers in our network — not fabricated numbers.
          </p>
        </div>
      </div>
    </section>
  );
}
