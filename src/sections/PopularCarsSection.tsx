import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Star, Users, ArrowRight, Sparkles, CheckCircle, Fuel } from "lucide-react";

const fallbackCars = [
  { id: 6, name: "Toyota Innova Crysta", brand: "Toyota", category: "premium", seats: 6, pricePerKm: "20.00", rating: "4.90", imageUrl: "/cars/toyota-innova-crysta.jpg", description: "India's most trusted outstation cab. Powerful, spacious, built for long journeys.", fuelType: "Diesel" },
  { id: 8, name: "Toyota Innova Hycross", brand: "Toyota", category: "luxury", seats: 6, pricePerKm: "22.00", rating: "4.95", imageUrl: "/cars/toyota-innova-hycross.jpg", description: "Flagship hybrid luxury — the smoothest ride for premium corporate travel.", fuelType: "Hybrid" },
  { id: 5, name: "Toyota Innova", brand: "Toyota", category: "muv", seats: 6, pricePerKm: "19.00", rating: "4.80", imageUrl: "/cars/toyota-innova.jpg", description: "Reliable family workhorse. Comfortable on highways and mountain roads alike.", fuelType: "Diesel" },
  { id: 1, name: "Swift Dzire", brand: "Maruti", category: "sedan", seats: 4, pricePerKm: "12.00", rating: "4.70", imageUrl: "/cars/swift-dzire.jpg", description: "Best value for solo travelers and couples. Fuel-efficient and highway comfortable.", fuelType: "Petrol/CNG" },
];

const categoryLabel: Record<string, { label: string; color: string }> = {
  luxury: { label: "Luxury", color: "bg-purple-100 text-purple-700" },
  premium: { label: "Premium", color: "bg-blue-100 text-blue-700" },
  muv: { label: "Family", color: "bg-green-100 text-green-700" },
  sedan: { label: "Economy", color: "bg-slate-100 text-slate-600" },
};

export default function PopularCarsSection() {
  const navigate = useNavigate();
  const { data: cars } = trpc.car.getPopular.useQuery();
  const displayCars = cars?.length ? cars.slice(0, 4) : fallbackCars;

  return (
    <section className="py-12 sm:py-20 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" /> Our Premium Fleet
            </p>
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 font-['DM_Serif_Display']">
              Every Car. Verified & Maintained.
            </h2>
            <p className="text-slate-500 text-sm max-w-lg">
              No compromise on vehicle quality. Every car is well maintained, regularly serviced, and deep cleaned before every trip.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/cars")}
            className="shrink-0 border-slate-200 text-slate-600 hover:text-blue-700 hover:border-blue-200 hidden md:flex items-center gap-2">
            View Full Fleet <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {displayCars.map((car) => {
            const cat = categoryLabel[car.category] || { label: car.category, color: "bg-slate-100 text-slate-600" };
            return (
              <div key={car.id} onClick={() => navigate(`/cars/${car.id}`)}
                className="group bg-white rounded-2xl border border-slate-100 hover:border-blue-200 overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img src={car.imageUrl || "/cars/swift-dzire.jpg"} alt={car.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 left-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${cat.color}`}>
                      {cat.label}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <span className="text-xs text-slate-700 font-semibold">{car.rating}</span>
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="font-semibold text-slate-900 text-sm mb-1">{car.name}</h3>
                  <p className="text-[11px] text-slate-500 mb-3 line-clamp-2">{car.description}</p>

                  <div className="flex items-center gap-3 text-[10px] text-slate-400 mb-3">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{car.seats - 1} passengers</span>
                    <span className="flex items-center gap-1"><Fuel className="w-3 h-3" />{car.fuelType || "AC"}</span>
                    <span className="flex items-center gap-1 text-green-600"><CheckCircle className="w-3 h-3" />Verified</span>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-base font-bold text-slate-900">₹{car.pricePerKm}</span>
                      <span className="text-[10px] text-slate-400">/km</span>
                    </div>
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs px-3 h-7 transition-all">
                      Book Now
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: "🚗", text: "Well Maintained", sub: "All vehicles" },
            { icon: "🧹", text: "Deep Cleaned", sub: "Before every trip" },
            { icon: "🔧", text: "Monthly Serviced", sub: "Preventive maintenance" },
            { icon: "📋", text: "Fully Insured", sub: "Passenger & vehicle" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100">
              <span className="text-lg">{item.icon}</span>
              <div>
                <div className="text-xs font-semibold text-slate-800">{item.text}</div>
                <div className="text-[10px] text-slate-400">{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
