import { Link } from "react-router";
import { Mail, MapPin, MessageCircle, Phone, ArrowRight } from "lucide-react";

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
    { label: "Vehicles", href: "/cars" },
    { label: "Corporate Enquiries", href: "/corporate" },
    { label: "Corporate Portal", href: "/corporate-portal" },
    { label: "Refer & Earn ₹100", href: "/referral" },
    { label: "How It Works", href: "/#features" },
  ],
  support: [
    { label: "FAQs", href: "/faq" },
    { label: "Cancellation Policy", href: "/cancellation" },
    { label: "Terms & Conditions", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
  ],
  guides: [
    { label: "Delhi to Manali Guide", href: "/blog/delhi-to-manali-road-trip-guide" },
    { label: "Delhi to Kashmir Guide", href: "/blog/delhi-to-kashmir-road-trip-guide" },
    { label: "Delhi to Jaipur Guide", href: "/blog/delhi-to-jaipur-road-trip-guide" },
    { label: "Delhi to Rishikesh Guide", href: "/blog/delhi-to-rishikesh-travel-guide" },
    { label: "Delhi to Varanasi Guide", href: "/blog/delhi-to-varanasi-ganga-aarti-guide" },
    { label: "Delhi to Ayodhya Guide", href: "/blog/delhi-to-ayodhya-ram-mandir-guide" },
    { label: "View All Guides →", href: "/blog" },
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

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
          <div className="lg:col-span-2 space-y-6">
            <Link to="/" className="flex items-center group">
              <img
                src="/logo.png"
                alt="EasyOutstation"
                className="h-16 w-auto"
                style={{ mixBlendMode: "screen" }}
              />
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
              <a href="tel:+918796564111"
                className="flex items-center gap-3 text-sm text-slate-400 hover:text-blue-400 transition-colors">
                <Phone className="w-4 h-4 text-blue-500" />
                +91-87965 64111
              </a>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
                Delhi NCR, India
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a href="https://wa.me/918796564111?text=Hi%2C%20I%20want%20to%20book%20a%20cab%20from%20Delhi" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-500 transition-all">
                <MessageCircle className="w-4 h-4" />
                Chat & Book Instantly
              </a>
              <a href="https://instagram.com/easyoutstation" target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 via-pink-600 to-orange-400 flex items-center justify-center hover:opacity-90 transition-all"
                aria-label="Follow us on Instagram">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              </a>
              <a href="https://x.com/EasyOutstation" target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-black flex items-center justify-center hover:bg-slate-800 transition-all"
                aria-label="Follow us on X (Twitter)">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              <a href="https://www.youtube.com/@EasyOutstation" target="_blank" rel="noopener noreferrer"
                className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center hover:bg-red-500 transition-all"
                aria-label="Subscribe on YouTube">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:col-span-3 gap-8">
            <div>
              <h4 className="text-white font-semibold mb-4 sm:mb-5 text-xs uppercase tracking-wider">Popular Routes</h4>
              <ul className="space-y-2.5">
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
              <h4 className="text-white font-semibold mb-4 sm:mb-5 text-xs uppercase tracking-wider">Company</h4>
              <ul className="space-y-2.5">
                {footerLinks.company.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm text-slate-400 hover:text-blue-400 transition-colors">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4 sm:mb-5 text-xs uppercase tracking-wider">Support</h4>
              <ul className="space-y-2.5">
                {footerLinks.support.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm text-slate-400 hover:text-blue-400 transition-colors">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-4 sm:mb-5 text-xs uppercase tracking-wider">Travel Guides</h4>
              <ul className="space-y-2.5">
                {footerLinks.guides.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm text-slate-400 hover:text-blue-400 transition-colors">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
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
