import { Link } from "react-router";
import { Car, Phone, Mail, MapPin } from "lucide-react";

const footerLinks = {
  services: [
    { label: "Delhi to Manali", href: "/cars?route=delhi-manali" },
    { label: "Delhi to Jaipur", href: "/cars?route=delhi-jaipur" },
    { label: "Delhi to Agra", href: "/cars?route=delhi-agra" },
    { label: "Delhi to Rishikesh", href: "/cars?route=delhi-rishikesh" },
    { label: "Round Trip Tours", href: "/cars?trip=round" },
  ],
  company: [
    { label: "About Us", href: "/about" },
    { label: "Our Fleet", href: "/cars" },
    { label: "Testimonials", href: "/#testimonials" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "/contact" },
  ],
  support: [
    { label: "FAQs", href: "/faq" },
    { label: "Cancellation Policy", href: "/cancellation" },
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Sitemap", href: "/sitemap" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          {/* Brand */}
          <div className="lg:col-span-2 space-y-6">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <Car className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white font-['Playfair_Display']">
                  EasyOutstation
                </h3>
                <p className="text-xs uppercase tracking-widest text-primary">
                  Premium Car Rentals
                </p>
              </div>
            </Link>
            <p className="text-sm leading-relaxed max-w-sm">
              Your trusted partner for safe, comfortable, and memorable journeys across North India. 
              Premium chauffeur-driven car rentals since 2015.
            </p>
            <div className="space-y-3">
              <a href="tel:+917011911252" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
                <Phone className="w-4 h-4 text-primary" />
                +91-7011911252
              </a>
              <a href="mailto:easyoutstation@gmail.com" className="flex items-center gap-3 text-sm hover:text-primary transition-colors">
                <Mail className="w-4 h-4 text-primary" />
                easyoutstation@gmail.com
              </a>
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                Delhi NCR, India
              </div>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-white font-semibold mb-4">Popular Routes</h4>
            <ul className="space-y-3">
              {footerLinks.services.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">Support</h4>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.href}
                    className="text-sm hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm text-slate-400">
            &copy; {new Date().getFullYear()} EasyOutstation. All rights reserved.
          </p>

        </div>
      </div>
    </footer>
  );
}
