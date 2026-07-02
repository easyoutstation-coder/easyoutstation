import { MessageCircle, MapPin, Phone } from "lucide-react";
import { useSeo } from "@/hooks/useSeo";

const UTM = "?utm_source=instagram&utm_medium=bio&utm_campaign=linkhub";

const ROUTES = [
  { label: "Delhi → Kedarnath", slug: "delhi-to-kedarnath", emoji: "🛕" },
  { label: "Delhi → Manali", slug: "delhi-to-manali", emoji: "🏔️" },
  { label: "Delhi → Shimla", slug: "delhi-to-shimla", emoji: "🌲" },
  { label: "Delhi → Rishikesh", slug: "delhi-to-rishikesh", emoji: "🌊" },
  { label: "Delhi → Haridwar", slug: "delhi-to-haridwar", emoji: "🪔" },
  { label: "Delhi → Chandigarh", slug: "delhi-to-chandigarh", emoji: "🏙️" },
  { label: "Delhi → Jaipur", slug: "delhi-to-jaipur", emoji: "🏯" },
  { label: "Delhi → Agra", slug: "delhi-to-agra", emoji: "🕌" },
  { label: "Delhi → Dharamshala", slug: "delhi-to-dharamshala", emoji: "🏔️" },
  { label: "Delhi → Nainital", slug: "delhi-to-nainital", emoji: "🏞️" },
];

const WA_URL = `https://wa.me/918796564111?text=${encodeURIComponent("Hi, I want to book an outstation cab from Delhi. Can you help?")}`;

export default function Go() {
  useSeo({
    title: "EasyOutstation — Book Outstation Cabs from Delhi",
    description: "Fixed-fare outstation cab service from Delhi. Kedarnath, Manali, Shimla, Rishikesh, Jaipur and more. Book now.",
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center px-4 py-10">
      {/* Header */}
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg shadow-blue-900/50">
          <span className="text-3xl">🚗</span>
        </div>
        <h1 className="text-white text-2xl font-bold tracking-tight font-['DM_Serif_Display']">EasyOutstation</h1>
        <p className="text-slate-400 text-sm mt-1">Fixed-fare cabs from Delhi · No surge</p>
        <div className="flex items-center gap-1.5 mt-2 text-blue-400 text-xs">
          <MapPin className="w-3 h-3" />
          <span>Delhi NCR · Outstation Specialists</span>
        </div>
      </div>

      {/* WhatsApp CTA */}
      <a
        href={WA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full max-w-sm mb-6 flex items-center justify-center gap-3 bg-green-600 hover:bg-green-500 active:scale-95 transition-all text-white font-semibold py-4 rounded-2xl shadow-lg shadow-green-900/40 text-base"
      >
        <MessageCircle className="w-5 h-5" />
        Chat on WhatsApp
      </a>

      {/* Route Buttons */}
      <div className="w-full max-w-sm flex flex-col gap-3">
        {ROUTES.map((r) => (
          <a
            key={r.slug}
            href={`/cab/${r.slug}${UTM}`}
            className="flex items-center gap-4 bg-slate-800 hover:bg-slate-700 active:scale-95 transition-all rounded-2xl px-5 py-4 text-white border border-slate-700/60 shadow-sm"
          >
            <span className="text-2xl w-8 text-center">{r.emoji}</span>
            <span className="font-medium text-sm flex-1">{r.label}</span>
            <span className="text-slate-500 text-xs">Book →</span>
          </a>
        ))}
      </div>

      {/* All Routes Link */}
      <a
        href={`/routes${UTM}`}
        className="mt-6 text-slate-400 hover:text-white text-sm underline underline-offset-4 transition-colors"
      >
        See all 30+ routes →
      </a>

      {/* Call CTA */}
      <a
        href="tel:+918796564111"
        className="mt-4 flex items-center gap-2 text-slate-500 hover:text-slate-300 text-sm transition-colors"
      >
        <Phone className="w-3.5 h-3.5" />
        +91 87965 64111
      </a>

      {/* Footer */}
      <p className="mt-10 text-slate-700 text-xs text-center">
        © EasyOutstation · easyoutstation.com
      </p>
    </div>
  );
}
