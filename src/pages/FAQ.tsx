import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ChevronDown } from "lucide-react";
import { useSeo } from "@/hooks/useSeo";
import { trpc } from "@/providers/trpc";

const FALLBACK_FAQS = [
  { question: "Are there any hidden charges?", answer: "No hidden charges or markups. The fare shown includes per-km rate and driver charges (₹250/day). Toll and parking are charged at actuals — exactly what is paid on the road, with no markup." },
  { question: "How are your drivers verified?", answer: "Every driver goes through police background verification, document checks, and defensive driving training. We also collect customer ratings after each trip." },
  { question: "Will I get a reminder before my trip?", answer: "Yes. The day before your trip, we automatically send you an SMS and email with your driver's name, mobile number, and pickup details. Your driver will also call you 1 hour before pickup." },
  { question: "When will I receive my driver's details?", answer: "Driver details — name, mobile number, and vehicle information — are sent via SMS and email as soon as your booking is confirmed by our team, typically within 60 minutes of booking." },
  { question: "What happens after my trip?", answer: "The day after your trip, we send a quick review request via SMS and email. Your feedback takes 30 seconds and helps us maintain quality and helps future travelers make informed decisions." },
  { question: "What if my driver is late?", answer: "If your driver is late beyond 30 minutes without prior notice, you are eligible for compensation. Contact us immediately at easyoutstation@gmail.com or call +91-8796564111." },
  { question: "Can I cancel my booking?", answer: "Yes. Free cancellation up to 24 hours before pickup. 50% refund for cancellations within 12–24 hours. No refund for cancellations within 12 hours of pickup." },
  { question: "How do I pay?", answer: "A 10% advance is collected online to confirm your booking. The remaining 90% is paid directly to the driver at pickup. We accept cash, UPI, and card." },
  { question: "Which cities do you serve?", answer: "We serve 30+ outstation routes from Delhi NCR. Destinations include: Manali, Shimla, Dharamshala (McLeod Ganj), Kasauli, Dalhousie, Spiti Valley, Kashmir (Srinagar), Vaishno Devi (Katra), Chandigarh, Ludhiana, Amritsar, Jaipur, Agra, Jodhpur, Udaipur, Pushkar, Mount Abu, Mathura, Vrindavan, Rishikesh, Haridwar, Dehradun, Mussoorie, Nainital, Lansdowne, Jim Corbett, Lucknow, Prayagraj, Ayodhya, and Banaras (Varanasi). Pickup is available within 40 km of Delhi — covering New Delhi, Gurgaon, Noida, Faridabad, Ghaziabad, Rohtak, and Sonipat." },
  { question: "Can I book a round trip?", answer: "Yes. Round trips are calculated as double the one-way distance. Select 'Round Trip' during booking and the fare is shown transparently." },
  { question: "What types of vehicles are available?", answer: "Our fleet includes: Swift Dzire (economy sedan), Maruti Ertiga (MUV), Toyota Innova (MUV), Toyota Innova Crysta (premium), Toyota Innova Hycross (luxury hybrid), Force Urbania and Tempo Traveller (for larger groups), and BYD electric vehicles. All vehicles are fully AC, well-maintained, and driven by verified drivers." },
  { question: "Is it safe for solo women travelers?", answer: "Yes. All our drivers are verified and rated. We share the driver's name, phone number, and vehicle details before every trip. Our support team is available 24/7 at +91-8796564111." },
  { question: "How quickly will I get a confirmation?", answer: "Booking confirmation with driver details is sent within 60 minutes of booking via SMS and email. For same-day bookings, contact us on WhatsApp for the fastest response." },
  { question: "Does EasyOutstation have a corporate portal for businesses?", answer: "Yes! Companies can register for a dedicated corporate account at easyoutstation.com/corporate-portal. Once approved (within 24 hours), you get a team dashboard showing all company trips, monthly spend reports, and GST invoice support. Team members join using a shared join code." },
  { question: "How does corporate billing work?", answer: "Each trip booked by a team member under a corporate account is tracked in the company dashboard. At month end, you can view a full statement from the portal or request a consolidated GST invoice by emailing easyoutstation@gmail.com." },
  { question: "Can multiple employees from my company book under one account?", answer: "Yes. The corporate admin shares a unique join code with team members. Each employee logs in with their own account, enters the join code, and all their bookings are automatically tracked under the company account." },
  { question: "Does EasyOutstation have a referral program?", answer: "Yes! Refer a friend and you both earn ₹100 travel credit when they complete their first ride. Credits are added within 24 hours of trip completion and are valid for 90 days. There's no limit on referrals." },
  { question: "How do I refer a friend?", answer: "Log in to your account, go to your Dashboard and click the 'Refer & Earn' tab. Copy your unique referral link and share it with friends. When they complete their first ride, you both earn ₹100." },
  { question: "Do referral credits expire?", answer: "Yes, referral credits expire 90 days from the date they are added to your account. You can view your credit balance and expiry dates in your dashboard under the Refer & Earn tab." },
  // --- Local Hourly Rental FAQs ---
  { question: "What is Local Hourly Rental?", answer: "Local Hourly Rental is EasyOutstation's product for travel within Delhi NCR. Instead of a point-to-point fare, you book a car by the hour — great for multiple stops, shopping trips, hospital visits, airport loops, and any local travel where you need the car to wait. Minimum package is 8 hours, maximum is 12 hours (in 1-hour steps). 80 km is included in the 8-hour package (10 km per hour)." },
  { question: "How is the rental fare calculated?", answer: "The base fare is fixed: hours × hourly rate (e.g. 8 hours × ₹327/hr = ₹2,616 for a Sedan). GST at 5% is added on the base fare. You pay 25% of (base + GST) as an advance at booking. Extras are billed after the trip: additional kilometres beyond the included allowance are charged per-km, additional time beyond the package is charged per-minute. Parking and tolls are charged at actuals." },
  { question: "What vehicles are available for hourly rental?", answer: "All four rental bands are available: Sedan (Swift Dzire, Toyota Etios) at ₹327/hr; MUV (Maruti Ertiga, Kia Carens) at ₹396/hr; Innova Crysta at ₹462/hr; and Innova Hycross at ₹485/hr. All are fully AC with verified drivers." },
  { question: "Can I cancel a rental booking?", answer: "Yes. Rental bookings can be cancelled free of charge up to 12 hours before the scheduled start time. If you cancel within 12 hours of the start time, or do not show up, the advance payment (25% of base + GST) is forfeited." },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null);

  const { data: apiFaqs } = trpc.admin.getPublicFaqs.useQuery();
  const faqs = apiFaqs && apiFaqs.length > 0
    ? apiFaqs.map(f => ({ question: f.question, answer: f.answer }))
    : FALLBACK_FAQS;

  useSeo({
    title: "FAQs — Outstation Cab Booking Delhi | EasyOutstation",
    description: "Answers to common questions about EasyOutstation's cab service — pricing, cancellation, driver verification, toll charges and more.",
    canonical: "https://www.easyoutstation.com/faq",
    schema: {
      "@type": "FAQPage",
      "mainEntity": faqs.map(f => ({
        "@type": "Question",
        "name": f.question,
        "acceptedAnswer": { "@type": "Answer", "text": f.answer },
      })),
    },
  });

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
                  <span className="font-medium text-slate-900 text-sm">{faq.question}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ml-3 ${open === i ? "rotate-180" : ""}`} />
                </button>
                {open === i && (
                  <div className="px-5 pb-4">
                    <p className="text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
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
              <a href="https://wa.me/918796564111" target="_blank" rel="noopener noreferrer"
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
