import { useSeo } from "@/hooks/useSeo";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function CancellationPolicy() {
  useSeo({ title: "Cancellation Policy — Free Cancellation 24hrs | EasyOutstation", description: "EasyOutstation cancellation policy. Cancel for free up to 24 hours before pickup. Full refund of advance payment guaranteed.", canonical: "https://www.easyoutstation.com/cancellation" });
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="pt-20">
        <div className="bg-white border-b border-slate-100 py-12 px-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Policies</p>
          <h1 className="text-3xl font-bold text-slate-900 font-['DM_Serif_Display']">Cancellation & Refund Policy</h1>
          <p className="text-slate-500 mt-2">Fair, transparent, and customer-friendly.</p>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-12 space-y-6">
          {[
            { icon: CheckCircle, color: "text-green-600 bg-green-50 border-green-200", title: "Free Cancellation — More than 24 Hours Before Pickup", desc: "Cancel anytime up to 24 hours before your scheduled pickup and receive a 100% refund. No questions asked." },
            { icon: AlertCircle, color: "text-amber-600 bg-amber-50 border-amber-200", title: "50% Refund — Between 12 to 24 Hours Before Pickup", desc: "If you cancel between 12 and 24 hours before pickup, you will receive a 50% refund of the advance amount paid online." },
            { icon: XCircle, color: "text-red-600 bg-red-50 border-red-200", title: "No Refund — Less Than 12 Hours Before Pickup", desc: "Cancellations made within 12 hours of the scheduled pickup time are non-refundable due to driver allocation costs." },
          ].map((item, i) => (
            <div key={i} className={`p-5 rounded-xl border ${item.color}`}>
              <div className="flex items-start gap-4">
                <item.icon className={`w-6 h-6 shrink-0 mt-0.5 ${item.color.split(" ")[0]}`} />
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}

          <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-3">
            <h3 className="font-semibold text-slate-900">How to Cancel</h3>
            <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
              <li>Log in to your account and go to My Bookings</li>
              <li>Click on the booking you wish to cancel</li>
              <li>Click "Cancel Booking" and confirm</li>
              <li>Or email us at easyoutstation@gmail.com with your Booking ID</li>
            </ol>
          </div>

          <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
            <h3 className="font-semibold text-slate-900 mb-2">Driver No-Show Policy</h3>
            <p className="text-sm text-slate-600">If our driver fails to show up without prior notice, you will receive a 100% refund and compensation. Contact us immediately at easyoutstation@gmail.com or WhatsApp +91-99585 56011.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
