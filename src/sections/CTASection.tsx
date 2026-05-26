import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, Mail, Phone } from "lucide-react";

export default function CTASection() {
  const navigate = useNavigate();
  return (
    <section className="py-14 sm:py-24 bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/hero-bg.jpg')] bg-cover bg-center opacity-10" />
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-4">Ready to Travel?</p>
        <h2 className="text-3xl lg:text-5xl font-bold text-white mb-5 font-['DM_Serif_Display'] leading-tight">
          Your Next Journey Deserves<br />
          <span className="text-blue-300">Better Than a Gamble</span>
        </h2>
        <p className="text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed">
          Stop hoping your cab shows up. Stop paying hidden charges. Book EasyOutstation —
          verified drivers, fixed prices, 100% on-time guarantee.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <Button size="lg" onClick={() => navigate("/cars")}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 h-12 gap-2 shadow-lg shadow-blue-900/40 transition-all">
            Book Your Ride <ArrowRight className="w-4 h-4" />
          </Button>
          <a href="https://wa.me/918796564111?text=Hi%2C%20I%20want%20to%20book%20a%20cab%20from%20Delhi" target="_blank" rel="noopener noreferrer">
            <Button size="lg" variant="outline"
              className="border-white/20 text-white hover:bg-white/10 h-12 px-6 gap-2 transition-all">
              <MessageCircle className="w-4 h-4 text-green-400" />
              WhatsApp Us
            </Button>
          </a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          {[
            { icon: MessageCircle, label: "WhatsApp", value: "+91-87965 64111", href: "https://wa.me/918796564111", color: "text-green-400" },
            { icon: Mail, label: "Email", value: "easyoutstation@gmail.com", href: "mailto:easyoutstation@gmail.com", color: "text-blue-400" },
            { icon: Phone, label: "Call Us", value: "+91-87965 64111", href: "tel:+918796564111", color: "text-blue-400" },
          ].map((c, i) => (
            <a key={i} href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all group">
              <c.icon className={`w-5 h-5 shrink-0 ${c.color}`} />
              <div className="text-left">
                <div className="text-[10px] text-slate-500 uppercase tracking-wider">{c.label}</div>
                <div className="text-xs font-medium text-white group-hover:text-blue-300 transition-colors">{c.value}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
