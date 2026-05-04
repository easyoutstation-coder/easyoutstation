import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const sections = [
  { title: "1. Acceptance of Terms", content: "By using EasyOutstation services, you agree to these Terms & Conditions. If you do not agree, please do not use our services." },
  { title: "2. Booking & Confirmation", content: "A booking is confirmed only upon receiving a confirmation email with a unique Booking ID. EasyOutstation reserves the right to cancel bookings in exceptional circumstances with a full refund." },
  { title: "3. Pricing & Payment", content: "All prices shown are inclusive of per-km charges, driver allowance, and estimated toll. Parking charges are payable at actuals by the customer. Payment is made directly to the driver." },
  { title: "4. Cancellation", content: "Refer to our Cancellation Policy for refund terms. Cancellations must be made via your account dashboard or by emailing easyoutstation@gmail.com." },
  { title: "5. Customer Responsibilities", content: "Customers must be at the pickup location at the agreed time. Waiting charges of ₹100 per 30 minutes apply after the first 30 minutes of waiting. Customers are responsible for any damage caused to the vehicle." },
  { title: "6. Limitation of Liability", content: "EasyOutstation acts as a facilitator between customers and drivers. While we take all reasonable measures for safety, we are not liable for delays caused by traffic, weather, or other unforeseen circumstances." },
  { title: "7. Privacy", content: "We collect personal information necessary to process bookings. We do not sell or share your data with third parties. Refer to our Privacy Policy for full details." },
  { title: "8. Governing Law", content: "These terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in Delhi." },
  { title: "9. Contact", content: "For any queries regarding these terms, contact us at easyoutstation@gmail.com." },
];

export default function Terms() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="pt-20">
        <div className="bg-white border-b border-slate-100 py-12 px-4 text-center">
          <h1 className="text-3xl font-bold text-slate-900 font-['Playfair_Display']">Terms & Conditions</h1>
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
