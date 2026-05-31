import { useNavigate, Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { ArrowRight, Clock, Route, TrendingUp, CheckCircle, MapPin } from "lucide-react";
import { getLandmark } from "@/data/routeImages";

function routeSlug(from: string, to: string) {
  return `${from.toLowerCase()}-to-${to.toLowerCase()}`;
}

const fallbackRoutes = [
  { id: 1, fromCity: "Delhi", toCity: "Manali", distanceKm: 540, durationHours: 12, basePrice: "6,730", imageUrl: "", description: "Scenic Himalayan drive via Chandigarh & Kullu Valley", highlights: ["Mountain road experts", "Crysta recommended", "Scenic stops included"] },
  { id: 2, fromCity: "Delhi", toCity: "Dehradun", distanceKm: 250, durationHours: 5, basePrice: "3,250", imageUrl: "", description: "Gateway to Uttarakhand — connect to Mussoorie", highlights: ["Weekend favourite", "Smooth highway", "5-6 hrs journey"] },
  { id: 3, fromCity: "Delhi", toCity: "Rishikesh", distanceKm: 240, durationHours: 5, basePrice: "3,130", imageUrl: "", description: "Yoga capital — also covers Haridwar on the way", highlights: ["Covers Haridwar", "Adventure hub", "Early morning slots"] },
  { id: 4, fromCity: "Delhi", toCity: "Jaipur", distanceKm: 280, durationHours: 5, basePrice: "3,610", imageUrl: "", description: "The Pink City — palaces, food & heritage", highlights: ["Smooth expressway", "Day trip possible", "Heritage route"] },
];

export default function PopularRoutesSection() {
  const navigate = useNavigate();
  const { data: routes } = trpc.route.getPopular.useQuery();
  const displayRoutes = routes?.length ? routes.slice(0, 4) : fallbackRoutes;

  return (
    <section className="py-12 sm:py-20 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" /> Most Booked Routes
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 font-['DM_Serif_Display']">
              Fixed Fares. No Surprises.
            </h2>
            <p className="text-slate-500 max-w-lg text-sm">
              Driver charges included in fare. Toll & parking charged at actuals.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/routes")}
            className="shrink-0 border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-200 hidden md:flex items-center gap-2">
            View All Routes <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {displayRoutes.map((route) => {
            const landmark = getLandmark(route.toCity);
            const imgSrc = landmark?.image || route.imageUrl || "/hero-bg.jpg";
            return (
            <Link key={route.id} to={`/cab/${routeSlug(route.fromCity, route.toCity)}`}
              className="group bg-white rounded-2xl border border-slate-100 hover:border-blue-200 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 block no-underline">
              <div className="relative h-52 overflow-hidden">
                <img src={imgSrc} alt={landmark?.landmark || `${route.fromCity} to ${route.toCity}`}
                  onError={(e) => { (e.target as HTMLImageElement).src = "/hero-bg.jpg"; }}
                  style={{ objectPosition: landmark?.objectPosition ?? "center center" }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wide">
                    Popular
                  </span>
                </div>
                {landmark && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-white/70" />
                    <span className="text-white/80 text-[10px] font-medium">{landmark.landmark}</span>
                  </div>
                )}
              </div>

              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 text-slate-900 font-semibold">
                      <span>{route.fromCity}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                      <span>{route.toCity}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{route.description}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="text-lg font-bold text-slate-900">₹{route.basePrice}</div>
                    <div className="text-[10px] text-slate-400">onwards</div>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[10px] text-slate-400 mb-3">
                  <span className="flex items-center gap-1"><Route className="w-3 h-3" />{route.distanceKm} km</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />~{route.durationHours} hrs</span>
                </div>

                {route.highlights && (
                  <div className="flex flex-wrap gap-1.5">
                    {route.highlights.map((h, j) => (
                      <span key={j} className="flex items-center gap-1 text-[10px] text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-2.5 h-2.5 text-blue-500" />{h}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Driver charge included · Toll at actuals</span>
                  <span className="text-xs font-semibold text-blue-600 group-hover:underline flex items-center gap-1">
                    Book Now <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </Link>
          );
          })}
        </div>
      </div>
    </section>
  );
}
