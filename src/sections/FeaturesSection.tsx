import { Shield, Clock, MapPin, Headphones, Wallet, Award } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Safe & Secure",
    description: "Verified professional drivers with background checks. All vehicles insured and regularly maintained.",
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Book anytime, anywhere. Our service is available round the clock with instant confirmation.",
  },
  {
    icon: MapPin,
    title: "Door-to-Door Service",
    description: "Pickup from your home, hotel, airport, or railway station. We come to you, always.",
  },
  {
    icon: Headphones,
    title: "Dedicated Support",
    description: "Our travel support team is with you throughout the journey. Just a call away at +91-7011911252.",
  },
  {
    icon: Wallet,
    title: "Transparent Pricing",
    description: "No hidden charges. Clear per-km pricing with all costs explained upfront before booking.",
  },
  {
    icon: Award,
    title: "Premium Experience",
    description: "Well-maintained vehicles, courteous drivers, and complimentary amenities for a luxury journey.",
  },
];

export default function FeaturesSection() {
  return (
    <section className="py-20 bg-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4 font-['Playfair_Display']">
            Why Choose EasyOutstation
          </h2>
          <p className="text-slate-400">
            We go the extra mile to ensure your journey is comfortable, safe, and memorable. 
            Here's what sets us apart.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <div
              key={i}
              className="group p-6 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
