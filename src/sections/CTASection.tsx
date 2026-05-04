import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageCircle, Phone, Mail } from "lucide-react";

export default function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-[#1C1C1C] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

      {/* Background image with overlay */}
      <div className="absolute inset-0">
        <img src="/fleet-showroom.jpg" alt="Premium fleet" className="w-full h-full object-cover opacity-10" />
        <div className="absolute inset-0 bg-[#1C1C1C]/80" />
      </div>

      {/* Gold glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#D4AF37]/5 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/5 mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
          <span className="text-xs font-semibold uppercase tracking-widest text-[#D4AF37]">Limited Slots Available Today</span>
        </div>

        <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6 font-['Playfair_Display'] leading-tight">
          Your Next Journey Deserves{" "}
          <span className="text-[#D4AF37]">Better Than a Gamble</span>
        </h2>

        <p className="text-lg text-[#BFBFBF] max-w-2xl mx-auto mb-10 leading-relaxed">
          Stop hoping your cab shows up. Stop paying hidden charges. Stop settling for unknown drivers.
          Book EasyOutstation — Delhi's premium outstation cab service with a 100% money-back guarantee on cancellations.
        </p>

        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <Button size="lg" onClick={() => navigate("/cars")}
            className="bg-[#D4AF37] hover:bg-[#E8CA5A] text-[#0B0B0B] font-bold px-8 h-14 text-base gap-2 shadow-[0_4px_20px_rgba(212,175,55,0.3)] hover:shadow-[0_6px_25px_rgba(212,175,55,0.45)] transition-all">
            Book My Cab Now
            <ArrowRight className="w-5 h-5" />
          </Button>
          <a href="https://wa.me/917011911252?text=Hi%2C%20I%20want%20to%20book%20a%20cab%20from%20Delhi" target="_blank" rel="noopener noreferrer">
            <Button size="lg" variant="outline"
              className="border-[#25D366]/50 text-[#25D366] hover:bg-[#25D366]/10 h-14 px-6 gap-2 text-base transition-all">
              <MessageCircle className="w-5 h-5" />
              WhatsApp Us Now
            </Button>
          </a>
        </div>

        {/* Contact options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
          {[
            { icon: MessageCircle, label: "WhatsApp", value: "Instant Response", href: "https://wa.me/917011911252", color: "#25D366" },
            { icon: Mail, label: "Email", value: "easyoutstation@gmail.com", href: "mailto:easyoutstation@gmail.com", color: "#D4AF37" },
            { icon: Phone, label: "Call Us", value: "+91-7011911252", href: "tel:+917011911252", color: "#D4AF37" },
          ].map((contact, i) => (
            <a key={i} href={contact.href} target={contact.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-xl bg-[#0B0B0B] border border-[#2A2A2A] hover:border-[#D4AF37]/30 transition-all group">
              <contact.icon className="w-5 h-5 shrink-0" style={{ color: contact.color }} />
              <div className="text-left">
                <div className="text-[10px] text-[#737373] uppercase tracking-wider">{contact.label}</div>
                <div className="text-xs font-medium text-white group-hover:text-[#D4AF37] transition-colors">{contact.value}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
