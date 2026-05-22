import { Link } from "react-router";
import { Mail, MapPin, MessageCircle, Phone, ArrowRight } from "lucide-react";
import LogoIcon from "@/components/LogoIcon";

const footerLinks = {
  routes: [
    { label: "Delhi to Manali", href: "/cab/delhi-to-manali" },
    { label: "Delhi to Shimla", href: "/cab/delhi-to-shimla" },
    { label: "Delhi to Dehradun", href: "/cab/delhi-to-dehradun" },
    { label: "Delhi to Rishikesh", href: "/cab/delhi-to-rishikesh" },
    { label: "Delhi to Haridwar", href: "/cab/delhi-to-haridwar" },
    { label: "Delhi to Mussoorie", href: "/cab/delhi-to-mussoorie" },
    { label: "Delhi to Jaipur", href: "/cab/delhi-to-jaipur" },
    { label: "Delhi to Agra", href: "/cab/delhi-to-agra" },
    { label: "Delhi to Chandigarh", href: "/cab/delhi-to-chandigarh" },
    { label: "Delhi to Nainital", href: "/cab/delhi-to-nainital" },
    { label: "Delhi to Mathura", href: "/cab/delhi-to-mathura" },
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
    <footer className="bg-slate-900 border-t border-slate-800">
      <div className="border-b border-slate-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-center gap-3">
          <p className="text-sm text-slate-400">🌟 Delhi's Premium Outstation Cab Service · Available 24/7</p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2 space-y-6">
            <Link to="/" className="flex items-center gap-3 group">
              <LogoIcon size={48} className="transition-transform group-hover:scale-105" />
              <div>
                <h3 className="text-xl font-bold text-white font-['DM_Serif_Display']">EasyOutstation</h3>
                <p className="text-[10px] uppercase tracking-widest text-blue-400">Premium Cab Service</p>
              </div>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Delhi's most trusted outstation cab service. Verified drivers, fixed prices, zero hidden charges. Your journey, our responsibility.
            </p>
            <div className="space-y-3">
              <a href="mailto:easyoutstation@gmail.com"
                className="flex items-center gap-3 text-sm text-slate-400 hover:text-blue-400 transition-colors">
                <Mail className="w-4 h-4 text-blue-500" />
                easyoutstation@gmail.com
              </a>
              <a href="tel:+919958556011"
                className="flex items-center gap-3 text-sm text-slate-400 hover:text-blue-400 transition-colors">
                <Phone className="w-4 h-4 text-blue-500" />
                +91-99585 56011
              </a>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                Delhi NCR, India
              </div>
            </div>
            <a href="https://wa.me/919958556011?text=Hi%2C%20I%20want%20to%20book%20a%20cab%20from%20Delhi" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-500 transition-all">
              <MessageCircle className="w-4 h-4" />
              Chat & Book Instantly
            </a>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-5 text-xs uppercase tracking-wider">Popular Routes</h4>
            <ul className="space-y-3">
              {footerLinks.routes.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-sm text-slate-400 hover:text-blue-400 transition-colors flex items-center gap-1.5 group">
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-5 text-xs uppercase tracking-wider">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-sm text-slate-400 hover:text-blue-400 transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-5 text-xs uppercase tracking-wider">Support</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-sm text-slate-400 hover:text-blue-400 transition-colors">{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} EasyOutstation. All rights reserved.</p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            All systems operational
          </div>
        </div>
      </div>
    </footer>
  );
}
