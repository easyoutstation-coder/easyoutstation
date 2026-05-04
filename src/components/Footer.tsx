import { Link } from "react-router";
import { Car, Mail, MapPin, MessageCircle, Phone, ArrowRight } from "lucide-react";

const footerLinks = {
  routes: [
    { label: "Delhi to Manali", href: "/cars?from=Delhi&to=Manali" },
    { label: "Delhi to Dehradun", href: "/cars?from=Delhi&to=Dehradun" },
    { label: "Delhi to Rishikesh", href: "/cars?from=Delhi&to=Rishikesh" },
    { label: "Delhi to Haridwar", href: "/cars?from=Delhi&to=Haridwar" },
    { label: "Delhi to Jaipur", href: "/cars?from=Delhi&to=Jaipur" },
    { label: "Delhi to Agra", href: "/cars?from=Delhi&to=Agra" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Our Fleet", href: "/cars" },
    { label: "How It Works", href: "/#features" },
    { label: "Testimonials", href: "/#testimonials" },
  ],
  support: [
    { label: "FAQs", href: "/faq" },
    { label: "Cancellation Policy", href: "/cancellation" },
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-[#0B0B0B] border-t border-[#2A2A2A]">
      {/* Top bar */}
      <div className="border-b border-[#2A2A2A]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-[#737373]">🌟 Delhi's Most Trusted Outstation Cab Service Since 2015</p>
          <a href="https://wa.me/917011911252?text=Hi%2C%20I%20want%20to%20book%20a%20cab" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-sm font-medium hover:bg-[#25D366]/20 transition-all">
            <MessageCircle className="w-4 h-4" />
            Book on WhatsApp
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2 space-y-6">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37] flex items-center justify-center group-hover:bg-[#E8CA5A] transition-colors">
                <Car className="w-6 h-6 text-[#0B0B0B]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white font-['Playfair_Display']">EasyOutstation</h3>
                <p className="text-[10px] uppercase tracking-widest text-[#D4AF37]">Premium Cab Service</p>
              </div>
            </Link>

            <p className="text-sm text-[#BFBFBF] leading-relaxed max-w-xs">
              Delhi's most trusted outstation cab service. Verified drivers, fixed prices, zero hidden charges.
              Your journey, our responsibility.
            </p>

            <div className="space-y-3">
              <a href="mailto:easyoutstation@gmail.com"
                className="flex items-center gap-3 text-sm text-[#BFBFBF] hover:text-[#D4AF37] transition-colors">
                <Mail className="w-4 h-4 text-[#D4AF37]" />
                easyoutstation@gmail.com
              </a>
              <a href="tel:+917011911252"
                className="flex items-center gap-3 text-sm text-[#BFBFBF] hover:text-[#D4AF37] transition-colors">
                <Phone className="w-4 h-4 text-[#D4AF37]" />
                +91-7011911252
              </a>
              <div className="flex items-center gap-3 text-sm text-[#BFBFBF]">
                <MapPin className="w-4 h-4 text-[#D4AF37] shrink-0" />
                Delhi NCR, India
              </div>
            </div>

            {/* WhatsApp CTA */}
            <a href="https://wa.me/917011911252?text=Hi%2C%20I%20want%20to%20book%20a%20cab%20from%20Delhi" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:bg-[#22c55e] transition-all">
              <MessageCircle className="w-4 h-4" />
              Chat & Book Instantly
            </a>
          </div>

          {/* Routes */}
          <div>
            <h4 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">Popular Routes</h4>
            <ul className="space-y-3">
              {footerLinks.routes.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-sm text-[#737373] hover:text-[#D4AF37] transition-colors flex items-center gap-1.5 group">
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-sm text-[#737373] hover:text-[#D4AF37] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-5 text-sm uppercase tracking-wider">Support</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-sm text-[#737373] hover:text-[#D4AF37] transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-16 pt-8 border-t border-[#2A2A2A] flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[#737373]">
            © {new Date().getFullYear()} EasyOutstation. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs text-[#737373]">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
