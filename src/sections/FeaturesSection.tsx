import { Shield, Clock, MapPin, Headphones, Wallet, Award, CheckCircle, Star } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Police-Verified Drivers",
    description: "Every driver undergoes background verification, drug tests, and defensive driving training. Your safety is our obsession.",
    stat: "100%",
    statLabel: "Verified",
  },
  {
    icon: Wallet,
    title: "Zero Hidden Charges",
    description: "The price you see is the price you pay. Toll, parking, and driver allowance — all shown upfront. No bill shock at destination.",
    stat: "₹0",
    statLabel: "Hidden Fees",
  },
  {
    icon: Clock,
    title: "On-Time or Compensated",
    description: "If your driver is late beyond 30 minutes with no prior notice, you get compensation. We put our money where our mouth is.",
    stat: "30 min",
    statLabel: "Guarantee",
  },
  {
    icon: MapPin,
    title: "Door-to-Door Pickup",
    description: "We come to your exact location — home, hotel, airport, or office. You don't move until your car arrives.",
    stat: "24/7",
    statLabel: "Available",
  },
  {
    icon: Headphones,
    title: "Dedicated Trip Support",
    description: "A dedicated support contact stays available throughout your journey. Breakdown? Detour? We handle it instantly.",
    stat: "< 2 min",
    statLabel: "Response",
  },
  {
    icon: Award,
    title: "Premium Fleet Only",
    description: "No old, worn-out taxis. Our fleet is maintained to hotel-grade standards — clean, air-conditioned, and comfort-first.",
    stat: "5★",
    statLabel: "Fleet Rating",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-24 bg-[#0B0B0B] relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">Why 15,000+ Travelers Choose Us</span>
            <Star className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 font-['Playfair_Display']">
            We Fix What Others Get Wrong
          </h2>
          <p className="text-[#BFBFBF] leading-relaxed">
            Hidden charges, unverified drivers, and last-minute cancellations have ruined too many trips.
            We built EasyOutstation to be the cab service <em className="text-[#D4AF37] not-italic">you actually deserve.</em>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <div key={i}
              className="group p-6 rounded-2xl bg-[#1C1C1C] border border-[#2A2A2A] hover:border-[#D4AF37]/30 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:-translate-y-1">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center shrink-0 group-hover:bg-[#D4AF37]/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                    <div className="text-right shrink-0 ml-2">
                      <div className="text-sm font-bold text-[#D4AF37]">{feature.stat}</div>
                      <div className="text-[10px] text-[#737373]">{feature.statLabel}</div>
                    </div>
                  </div>
                  <p className="text-sm text-[#BFBFBF] leading-relaxed">{feature.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust bar */}
        <div className="mt-16 p-6 rounded-2xl bg-[#1C1C1C] border border-[#D4AF37]/20">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { emoji: "🏆", text: "\"Best Outstation Cab Delhi\"", sub: "Traveler's Choice 2024" },
              { emoji: "🛡️", text: "100% Insured Vehicles", sub: "Every trip, every time" },
              { emoji: "📱", text: "Booking in 30 Seconds", sub: "Instant confirmation" },
              { emoji: "🔄", text: "Free Cancellation", sub: "Up to 24hrs before trip" },
            ].map((item, i) => (
              <div key={i} className="space-y-1">
                <div className="text-2xl">{item.emoji}</div>
                <div className="text-sm font-semibold text-white">{item.text}</div>
                <div className="text-xs text-[#737373]">{item.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
