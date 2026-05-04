import { Shield, Clock, MapPin, Headphones, Wallet, Award } from "lucide-react";

const features = [
  { icon: Shield, title: "Police-Verified Drivers", description: "Every driver is background-verified, trained, and rated by real customers. You know who's picking you up before they arrive.", tag: "Safety First" },
  { icon: Wallet, title: "Zero Hidden Charges", description: "Toll, parking, driver allowance — all disclosed before you book. The price you confirm is the price you pay. Period.", tag: "Transparent" },
  { icon: Clock, title: "On-Time or Compensated", description: "If your driver is late beyond 30 minutes without prior notice, you get compensation. We back our promise with action.", tag: "Guaranteed" },
  { icon: MapPin, title: "Door-to-Door Pickup", description: "We come to your home, hotel, or office. No walking to a pickup point. Your comfort starts the moment you book.", tag: "Convenient" },
  { icon: Headphones, title: "24/7 Trip Support", description: "A dedicated support line stays active throughout your journey. Any issue — big or small — gets resolved fast.", tag: "Always On" },
  { icon: Award, title: "Premium Maintained Fleet", description: "Every car is under 3 years old, cleaned before each trip, and serviced monthly. No surprises on the road.", tag: "Quality" },
];

export default function FeaturesSection() {
  return (
    <section className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Why Travelers Choose Us</p>
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4 font-['Playfair_Display']">
            We Fix What Others Get Wrong
          </h2>
          <p className="text-slate-500 leading-relaxed">
            Hidden charges, unverified drivers, and no-shows have ruined too many trips.
            EasyOutstation is built to be the service you actually deserve.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="group p-6 rounded-2xl border border-slate-100 hover:border-blue-100 bg-white hover:bg-blue-50/30 transition-all duration-300 hover:shadow-md">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                  <f.icon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="text-sm font-semibold text-slate-900">{f.title}</h3>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{f.description}</p>
                  <span className="inline-block mt-3 text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{f.tag}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust bar */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { emoji: "🏆", text: "Best Outstation Cab", sub: "Delhi 2024" },
            { emoji: "🛡️", text: "Fully Insured", sub: "Every trip, every time" },
            { emoji: "📱", text: "Book in 30 Seconds", sub: "Instant confirmation" },
            { emoji: "🔄", text: "Free Cancellation", sub: "Up to 24hrs before trip" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-xl shrink-0">{item.emoji}</span>
              <div>
                <div className="text-xs font-semibold text-slate-800">{item.text}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
