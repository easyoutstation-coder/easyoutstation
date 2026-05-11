import { useNavigate } from "react-router";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Route, CheckCircle, MapPin } from "lucide-react";
import { useSeo } from "@/hooks/useSeo";
import { getLandmark } from "@/data/routeImages";

const routes = [
  { from: "Delhi", to: "Manali", km: 540, hrs: 12, sedan: "6,730", innova: "11,050", highlights: ["Rohtang Pass", "Solang Valley", "Old Manali"], toll: 850 },
  { from: "Delhi", to: "Dehradun", km: 250, hrs: 5, sedan: "3,250", innova: "5,250", highlights: ["Mussoorie connect", "Rajaji Park", "Doon Valley"], toll: 420 },
  { from: "Delhi", to: "Rishikesh", km: 240, hrs: 5, sedan: "3,130", innova: "5,050", highlights: ["River Rafting", "Laxman Jhula", "Haridwar stop"], toll: 450 },
  { from: "Delhi", to: "Haridwar", km: 210, hrs: 4, sedan: "2,770", innova: "4,450", highlights: ["Har ki Pauri", "Ganga Aarti", "Rishikesh connect"], toll: 430 },
  { from: "Delhi", to: "Jaipur", km: 280, hrs: 5, sedan: "3,610", innova: "5,850", highlights: ["Amber Fort", "Hawa Mahal", "City Palace"], toll: 350 },
  { from: "Delhi", to: "Agra", km: 230, hrs: 4, sedan: "3,010", innova: "4,850", highlights: ["Taj Mahal", "Agra Fort", "Fatehpur Sikri"], toll: 290 },
  { from: "Delhi", to: "Chandigarh", km: 250, hrs: 5, sedan: "3,250", innova: "5,250", highlights: ["Rock Garden", "Sukhna Lake", "Shimla gateway"], toll: 380 },
  { from: "Delhi", to: "Shimla", km: 350, hrs: 8, sedan: "4,450", innova: "7,250", highlights: ["Mall Road", "Jakhu Temple", "Kufri"], toll: 650 },
];

export default function RoutesPage() {
  const navigate = useNavigate();
  useSeo({
    title: "Outstation Cab Routes from Delhi — Prices & Distance | EasyOutstation",
    description: "Explore all outstation cab routes from Delhi. Fixed fares to Manali, Shimla, Chandigarh, Jaipur, Agra, Rishikesh, Dehradun and more. One way & round trip.",
    canonical: "https://www.easyoutstation.com/routes",
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="pt-20">
        <div className="bg-white border-b border-slate-100 py-12 px-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Popular Routes</p>
          <h1 className="text-3xl font-bold text-slate-900 font-['DM_Serif_Display']">Outstation Routes from Delhi</h1>
          <p className="text-slate-500 mt-2 max-w-lg mx-auto">Fixed fares. All prices include driver charges. Toll & parking charged at actuals.</p>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {routes.map((route, i) => {
              const lm = getLandmark(route.to);
              return (
              <div key={i} className="group bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer"
                onClick={() => navigate(`/cars?from=${route.from}&to=${route.to}&distance=${route.km}`)}>
                {/* Landmark thumbnail */}
                <div className="relative h-44 overflow-hidden bg-slate-800">
                  {lm && (
                    <img
                      src={lm.image}
                      alt={lm.landmark}
                      onError={(e) => { (e.target as HTMLImageElement).src = "/hero-bg.jpg"; }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      style={{ objectPosition: lm.objectPosition }}
                    />
                  )}
                  {!lm && <div className="w-full h-full bg-slate-700" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wide">
                      Popular
                    </span>
                  </div>
                  {lm && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-white/70" />
                      <span className="text-white/80 text-[10px] font-medium">{lm.landmark}</span>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                        <span>{route.from}</span>
                        <ArrowRight className="w-4 h-4 text-blue-500" />
                        <span>{route.to}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1"><Route className="w-3 h-3" />{route.km} km</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />~{route.hrs} hrs</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Sedan from</div>
                      <div className="text-lg font-bold text-blue-700">₹{route.sedan}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {route.highlights.map((h, j) => (
                      <span key={j} className="flex items-center gap-1 text-[10px] text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-2.5 h-2.5 text-blue-500" />{h}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-center mb-4">
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="font-semibold text-slate-800">₹{route.sedan}</div>
                      <div className="text-slate-400">Sedan</div>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
                      <div className="font-semibold text-blue-800">₹{route.innova}</div>
                      <div className="text-blue-500">Innova</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-2">
                      <div className="font-semibold text-slate-800">₹{route.toll}</div>
                      <div className="text-slate-400">Toll</div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">Driver charge included · Toll at actuals</span>
                    <span className="text-xs font-semibold text-blue-600 group-hover:underline flex items-center gap-1">
                      Book Now <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
