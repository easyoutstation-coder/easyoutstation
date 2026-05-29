import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Shield, Clock, Users, Award, MapPin, Heart } from "lucide-react";
import { useSeo } from "@/hooks/useSeo";

export default function About() {
  useSeo({
    title: "About EasyOutstation — Verified Outstation Cabs from Delhi",
    description: "Learn about EasyOutstation — Delhi's trusted outstation cab service. Verified drivers, fixed fares, no hidden charges. Serving Manali, Shimla, Jaipur, Agra and more.",
    canonical: "https://www.easyoutstation.com/about",
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="pt-20">
        {/* Hero */}
        <div className="bg-slate-900 py-12 sm:py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">Our Story</p>
            <h1 className="text-4xl lg:text-5xl font-bold text-white font-['DM_Serif_Display'] mb-5">
              Built on Trust. Driven by Service.
            </h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">
              EasyOutstation is Delhi's premium outstation cab service —
              connecting families, professionals, and travelers to their destinations safely and comfortably.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white border-b border-slate-100">
          <div className="max-w-5xl mx-auto px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { num: "500+", label: "Trips Completed" },
              { num: "10+ yrs", label: "Avg. Driver Experience" },
              { num: "9", label: "Cities Served" },
              { num: "4.9★", label: "Average Rating" },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-2xl sm:text-3xl font-bold text-blue-700 font-['DM_Serif_Display']">{s.num}</div>
                <div className="text-sm text-slate-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Mission */}
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="grid md:grid-cols-2 gap-6 md:gap-12 items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-3">Our Mission</p>
              <h2 className="text-3xl font-bold text-slate-900 font-['DM_Serif_Display'] mb-5">
                Making Every Journey Safe, Comfortable & Transparent
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                We started EasyOutstation after experiencing firsthand how broken outstation cab
                bookings were — hidden charges, unverified drivers, last-minute cancellations.
              </p>
              <p className="text-slate-600 leading-relaxed">
                We built the service we always wanted: fixed prices, verified drivers, and a team
                that actually picks up the phone. We're growing — and every trip we complete is
                a step toward being the most trusted name in outstation travel from Delhi.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Shield, title: "Safety First", desc: "Every driver police-verified and trained" },
                { icon: Clock, title: "Always On Time", desc: "Or you get compensated. That's our promise." },
                { icon: Users, title: "Family-Friendly", desc: "Safe for solo women, families & seniors" },
                { icon: Award, title: "Premium Fleet", desc: "Well maintained cars, deep cleaned before every trip" },
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <item.icon className="w-5 h-5 text-blue-600 mb-2" />
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="bg-blue-50 border-t border-blue-100 py-14 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <Heart className="w-8 h-8 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 font-['DM_Serif_Display'] mb-3">Get in Touch</h2>
            <p className="text-slate-600 mb-6">Have questions? We're a real team with real people who actually respond.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a href="mailto:easyoutstation@gmail.com"
                className="px-6 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition-all">
                Email Us
              </a>
              <a href="https://wa.me/918796564111" target="_blank" rel="noopener noreferrer"
                className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:border-blue-300 transition-all">
                WhatsApp Us
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
