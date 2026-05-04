import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const sections = [
  { title: "Information We Collect", content: "We collect your name, email address, phone number, and pickup location when you make a booking. We also collect usage data to improve our service." },
  { title: "How We Use Your Information", content: "Your information is used to process bookings, send confirmation emails, coordinate with drivers, and provide customer support. We do not use your data for advertising." },
  { title: "Data Sharing", content: "We share your name and phone number with your assigned driver to facilitate pickup. We do not sell, rent, or share your personal data with any third parties for marketing purposes." },
  { title: "Data Security", content: "All data is transmitted over secure HTTPS connections. We use industry-standard encryption to protect your personal information." },
  { title: "Cookies", content: "We use essential cookies to maintain your session and preferences. We do not use tracking or advertising cookies." },
  { title: "Your Rights", content: "You may request access to, correction of, or deletion of your personal data by contacting us at easyoutstation@gmail.com. We will respond within 7 business days." },
  { title: "Contact", content: "For privacy-related queries, email us at easyoutstation@gmail.com." },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="pt-20">
        <div className="bg-white border-b border-slate-100 py-12 px-4 text-center">
          <h1 className="text-3xl font-bold text-slate-900 font-['Playfair_Display']">Privacy Policy</h1>
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
