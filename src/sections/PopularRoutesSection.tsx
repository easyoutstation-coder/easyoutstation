import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { MapPin, ArrowRight, Clock, Route, TrendingUp, CheckCircle } from "lucide-react";

const fallbackRoutes = [
  {
    id: 1, fromCity: "Delhi", toCity: "Manali", distanceKm: 540, durationHours: 12,
    basePrice: "6,480", priceNote: "Sedan · Incl. driver",
    imageUrl: "/hero-bg.jpg", description: "Scenic Himalayan journey via Chandigarh & Kullu Valley",
    highlights: ["Mountain roads expert driver", "Best for 4-7 people", "Crysta recommended"],
  },
  {
    id: 2, fromCity: "Delhi", toCity: "Dehradun", distanceKm: 250, durationHours: 5,
    basePrice: "3,000", priceNote: "Sedan · Incl. driver",
    imageUrl: "/cars/toyota-innova.jpg", description: "Gateway to Uttarakhand — forest roads & doon valley views",
    highlights: ["Connect to Mussoorie", "5-6 hrs journey", "Most popular weekend route"],
  },
  {
    id: 3, fromCity: "Delhi", toCity: "Rishikesh", distanceKm: 240, durationHours: 5,
    basePrice: "2,880", priceNote: "Sedan · Incl. driver",
    imageUrl: "/cars/swift-dzire.jpg", description: "Yoga capital of the world — spiritual & adventure hub",
    highlights: ["Rafting & camping zone", "Also covers Haridwar", "Early morning slots available"],
  },
  {
    id: 4, fromCity: "Delhi", toCity: "Jaipur", distanceKm: 280, durationHours: 5,
    basePrice: "3,360", priceNote: "Sedan · Incl. driver",
    imageUrl: "/cars/maruti-ertiga.jpg", description: "The Pink City — palaces, forts & world-class cuisine",
    highlights: ["Smooth expressway", "Heritage & culture", "Day trip possible"],
  },
];

export default function PopularRoutesSection() {
  const navigate = useNavigate();
  const { data: routes } = trpc.route.getPopular.useQuery();
  const displayRoutes = routes?.length ? routes.slice(0, 4) : fallbackRoutes;

  return (
    <section className="py-24 bg-[#0B0B0B] relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">Most Booked Routes</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white font-['Playfair_Display']">
              Fixed Fares. No Surprises.
            </h2>
            <p className="text-[#BFBFBF] max-w-lg">
              All-inclusive pricing — toll, parking & driver charges shown upfront. What you see is what you pay.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/cars")}
            className="shrink-0 border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 hidden md:flex items-center gap-2">
            View All Routes <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {displayRoutes.map((route, i) => (
            <div key={route.id}
              onClick={() => navigate(`/cars?from=${route.fromCity}&to=${route.toCity}`)}
              className="group relative overflow-hidden rounded-2xl bg-[#1C1C1C] border border-[#2A2A2A] hover:border-[#D4AF37]/30 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.6)]">

              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <img src={route.imageUrl || "/hero-bg.jpg"} alt={`${route.fromCity} to ${route.toCity}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1C1C1C] via-[#1C1C1C]/40 to-transparent" />
                <div className="absolute top-4 left-4">
                  <span className="px-2.5 py-1 rounded-full bg-[#D4AF37] text-[#0B0B0B] text-xs font-bold">
                    POPULAR
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 text-white font-semibold text-lg">
                      <span>{route.fromCity}</span>
                      <ArrowRight className="w-4 h-4 text-[#D4AF37]" />
                      <span>{route.toCity}</span>
                    </div>
                    <p className="text-sm text-[#737373] mt-0.5">{route.description}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="text-xl font-bold text-[#D4AF37] font-['Playfair_Display']">₹{route.basePrice}</div>
                    <div className="text-[10px] text-[#737373]">{route.priceNote || "onwards"}</div>
                  </div>
                </div>

                {/* Route stats */}
                <div className="flex items-center gap-4 text-xs text-[#737373] mb-4">
                  <span className="flex items-center gap-1"><Route className="w-3.5 h-3.5" />{route.distanceKm} km</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />~{route.durationHours} hours</span>
                </div>

                {/* Highlights */}
                {route.highlights && (
                  <div className="flex flex-wrap gap-2">
                    {route.highlights.map((h, j) => (
                      <span key={j} className="flex items-center gap-1 text-[10px] text-[#BFBFBF] bg-[#0B0B0B] px-2 py-1 rounded-full">
                        <CheckCircle className="w-3 h-3 text-[#D4AF37]" />
                        {h}
                      </span>
                    ))}
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-[#2A2A2A] flex items-center justify-between">
                  <span className="text-xs text-[#737373]">All-inclusive · No hidden charges</span>
                  <span className="text-xs font-semibold text-[#D4AF37] group-hover:underline flex items-center gap-1">
                    Book Now <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile CTA */}
        <div className="mt-8 flex justify-center md:hidden">
          <Button variant="outline" onClick={() => navigate("/cars")}
            className="border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10">
            View All Routes <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}
