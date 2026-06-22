import { useSeo } from "@/hooks/useSeo";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const sections = [
  { title: "1. Acceptance of Terms", content: "By using EasyOutstation services, you agree to these Terms & Conditions. If you do not agree, please do not use our services." },
  { title: "2. Booking & Confirmation", content: "A booking is confirmed only upon receiving a confirmation email with a unique Booking ID. EasyOutstation reserves the right to cancel bookings in exceptional circumstances with a full refund." },
  { title: "3. Pricing & Payment", content: "All prices shown are inclusive of per-km charges and driver allowance. Toll and parking charges are payable at actuals by the customer. A 10% advance is collected online at the time of booking to confirm your slot. The remaining balance is paid directly to the driver at the time of pickup." },
  { title: "4. Cancellation", content: "Refer to our Cancellation Policy for refund terms. Cancellations must be made via your account dashboard or by emailing easyoutstation@gmail.com." },
  { title: "5. Customer Responsibilities", content: "Customers must be at the pickup location at the agreed time. Waiting charges of ₹100 per 30 minutes apply after the first 30 minutes of waiting. Customers are responsible for any damage caused to the vehicle." },
  { title: "6. Limitation of Liability", content: "EasyOutstation acts as a facilitator between customers and drivers. While we take all reasonable measures for safety, we are not liable for delays caused by traffic, weather, or other unforeseen circumstances." },
  { title: "7. Privacy", content: "We collect personal information necessary to process bookings. We do not sell or share your data with third parties. Refer to our Privacy Policy for full details." },
  { title: "8. Governing Law", content: "These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Delhi." },
  { title: "9. Contact", content: "For any queries regarding these terms, contact us at easyoutstation@gmail.com." },
  // --- Local Hourly Rental terms ---
  { title: "10. Local Hourly Rentals — Fare Structure", content: "Hourly rental packages have a minimum duration of 8 hours and a maximum of 12 hours, in 1-hour steps. The included kilometre allowance is 10 km per booked hour (e.g. 80 km for an 8-hour package). The base fare is computed as: booked hours × hourly rate for the selected vehicle band (Sedan ₹327/hr, MUV ₹396/hr, Innova Crysta ₹462/hr, Innova Hycross ₹485/hr). GST at 5% is applied on the base fare. An advance of 25% of (base fare + GST) is charged at the time of booking to confirm the slot." },
  { title: "11. Local Hourly Rentals — Extra Charges", content: "Kilometres driven beyond the included allowance are charged after the trip at the applicable extra-km rate (Sedan ₹16/km, MUV ₹17/km, Innova Crysta ₹18/km, Innova Hycross ₹19/km). Time used beyond the booked package duration is charged per minute at the applicable extra-minute rate (Sedan/MUV/Crysta ₹6/min; Hycross ₹7/min). Parking and toll charges are collected at actuals — no markup. These post-trip extras are settled directly with the driver." },
  { title: "12. Local Hourly Rentals — Cancellation", content: "Rental bookings may be cancelled free of charge up to 12 hours before the scheduled pickup time, and the advance payment will be fully refunded. If a rental booking is cancelled within 12 hours of the scheduled pickup time, or in the event of a customer no-show, the advance payment (25% of base + GST) is forfeited. EasyOutstation reserves the right to cancel a rental booking with a full advance refund if a suitable vehicle cannot be dispatched." },
];

export default function Terms() {
  useSeo({ title: "Terms & Conditions | EasyOutstation", description: "Read EasyOutstation terms and conditions for outstation cab booking services.", canonical: "https://www.easyoutstation.com/terms" });
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="pt-20">
        <div className="bg-white border-b border-slate-100 py-12 px-4 text-center">
          <h1 className="text-3xl font-bold text-slate-900 font-['DM_Serif_Display']">Terms & Conditions</h1>
          <p className="text-slate-500 mt-2 text-sm">Last updated: May 2026</p>
        </div>
        <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
          {sections.map((s, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-100 p-5">
              <h2 className="font-semibold text-slate-900 mb-2">{s.title}</h2>
              <p className="text-sm text-slate-600 leading-relaxed">{s.content}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
