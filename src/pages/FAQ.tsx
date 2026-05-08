import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ChevronDown } from "lucide-react";

const faqs = [
  { q: "Are there any hidden charges?", a: "No. The price shown includes per-km rate, driver charges, and estimated toll. Parking charges are the only additional cost and are charged at actuals." },
  { q: "How are your drivers verified?", a: "Every driver goes through police background verification, document checks, and defensive driving training. We also collect customer ratings after each trip." },
  { q: "What if my driver is late?", a: "If your driver is late beyond 30 minutes without prior notice, you are eligible for compensation. Contact us immediately at easyoutstation@gmail.com." },
  { q: "Can I cancel my booking?", a: "Yes. Free cancellation up to 24 hours before pickup. 50% refund for cancellations within 12–24 hours. No refund for cancellations within 12 hours of pickup." },
  { q: "How do I pay?", a: "Payment is made to the driver at the time of pickup or drop. We accept cash, UPI, and card. No advance payment required to confirm booking." },
  { q: "Which cities do you serve?", a: "We serve outstation routes from Delhi to Manali, Dehradun, Rishikesh, Haridwar, Jaipur, Agra, Chandigarh, Shimla and all nearby destinations within 100km of these cities." },
  { q: "Can I book a round trip?", a: "Yes. Round trips are calculated as double the one-way distance. Select 'Round Trip' during booking and the fare is shown transparently." },
  { q: "What types of cars are available?", a: "We offer Swift Dzire (sedan), Toyota Etios (sedan), Maruti Ertiga (MUV), Mahindra Xylo (SUV), Kia Carens (premium), Toyota Innova, Innova Crysta, and Innova Hycross (luxury)." },
  { q: "Is it safe for solo women travelers?", a: "Yes. All our drivers are verified and rated. We share the driver's name, photo, and vehicle number before every trip. Our support team is available 24/7." },
  { q: "How quickly will I get a confirmation?", a: "Booking confirmation with driver details is sent within 60 minutes of booking. For same-day bookings, contact us on WhatsApp for fastest response." },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="pt-20">
        <div className="bg-white border-b border-slate-100 py-12 px-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Help Center</p>
          <h1 className="text-3xl font-bold text-slate-900 font-['DM_Serif_Display']">Frequently Asked Questions</h1>
          <p className="text-slate-500 mt-2 max-w-lg mx-auto">Everything you need to know before booking your cab.</p>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-12">
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                <button onClick={() => setOpen(open === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors">
                  <span className="font-medium text-slate-900 text-sm">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ml-3 ${open === i ? "rotate-180" : ""}`} />
                </button>
                {open === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 p-6 rounded-xl bg-blue-50 border border-blue-100 text-center">
            <p className="text-sm text-slate-700 mb-3">Still have questions? We're happy to help.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <a href="mailto:easyoutstation@gmail.com"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-all">
                Email Us
              </a>
              <a href="https://wa.me/919958556011" target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:border-blue-300 transition-all">
                WhatsApp
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
