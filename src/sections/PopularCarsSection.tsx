import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Star, Users, ArrowRight, Sparkles, CheckCircle, Fuel } from "lucide-react";

export default function PopularCarsSection() {
  const navigate = useNavigate();
  const { data: cars } = trpc.car.getPopular.useQuery();

  const fallbackCars = [
    { id: 6, name: "Toyota Innova Crysta", brand: "Toyota", category: "premium", seats: 6, pricePerKm: "20.00", rating: "4.90", reviewCount: 456, imageUrl: "/cars/toyota-innova-crysta.jpg", isPopular: true, description: "The gold standard for outstation travel. Powerful, spacious, and built for long journeys.", fuelType: "Diesel" },
    { id: 8, name: "Toyota Innova Hycross", brand: "Toyota", category: "luxury", seats: 6, pricePerKm: "22.00", rating: "4.95", reviewCount: 67, imageUrl: "/cars/toyota-innova-hycross.jpg", isPopular: true, description: "Flagship hybrid luxury — the smoothest ride for premium corporate and leisure travel.", fuelType: "Hybrid" },
    { id: 5, name: "Toyota Innova", brand: "Toyota", category: "muv", seats: 6, pricePerKm: "19.00", rating: "4.80", reviewCount: 342, imageUrl: "/cars/toyota-innova.jpg", isPopular: true, description: "India's most trusted family vehicle. Reliable, comfortable, and driver-friendly.", fuelType: "Diesel" },
    { id: 1, name: "Swift Dzire", brand: "Maruti", category: "sedan", seats: 4, pricePerKm: "12.00", rating: "4.70", reviewCount: 215, imageUrl: "/cars/swift-dzire.jpg", isPopular: true, description: "Best value for solo travelers and couples. Fuel-efficient and comfortable on highways.", fuelType: "Petrol/CNG" },
  ];

  const displayCars = cars?.length ? cars.slice(0, 4) : fallbackCars;

  const categoryLabel: Record<string, string> = {
    luxury: "LUXURY",
    premium: "PREMIUM",
    muv: "FAMILY",
    sedan: "ECONOMY",
  };

  return (
    <section className="py-24 bg-[#1C1C1C] relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-14 gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">Our Premium Fleet</span>
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-white font-['Playfair_Display']">
              Every Car. Verified & Maintained.
            </h2>
            <p className="text-[#BFBFBF] max-w-lg">
              No compromise on vehicle quality. Every car is less than 3 years old, fully serviced,
              and cleaned before every trip.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/cars")}
            className="shrink-0 border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 hidden md:flex items-center gap-2">
            View Full Fleet <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {displayCars.map((car) => (
            <div key={car.id}
              onClick={() => navigate(`/cars/${car.id}`)}
              className="group bg-[#0B0B0B] rounded-2xl border border-[#2A2A2A] hover:border-[#D4AF37]/30 overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_rgba(0,0,0,0.7)]">

              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden">
                <img src={car.imageUrl || "/cars/swift-dzire.jpg"} alt={car.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0B] via-transparent to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D4AF37] text-[#0B0B0B]">
                    {categoryLabel[car.category] || car.category.toUpperCase()}
                  </span>
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full">
                  <Star className="w-3 h-3 text-[#D4AF37] fill-[#D4AF37]" />
                  <span className="text-xs text-white font-medium">{car.rating}</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-white text-sm mb-1">{car.name}</h3>
                <p className="text-[10px] text-[#737373] mb-3 line-clamp-2">{car.description}</p>

                <div className="flex items-center gap-3 text-[10px] text-[#737373] mb-3">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{car.seats} seats</span>
                  <span className="flex items-center gap-1"><Fuel className="w-3 h-3" />{car.fuelType || "AC"}</span>
                  <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-[#D4AF37]" />Verified</span>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#2A2A2A]">
                  <div>
                    <span className="text-lg font-bold text-[#D4AF37]">₹{car.pricePerKm}</span>
                    <span className="text-[10px] text-[#737373]">/km</span>
                  </div>
                  <Button size="sm" className="bg-[#D4AF37] hover:bg-[#E8CA5A] text-[#0B0B0B] font-semibold text-xs px-3 h-7 transition-all">
                    Book Now
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile CTA */}
        <div className="mt-8 flex justify-center md:hidden">
          <Button variant="outline" onClick={() => navigate("/cars")}
            className="border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10">
            View Full Fleet <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* Fleet promise */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: "🚗", text: "< 3 Years Old", sub: "All vehicles" },
            { icon: "🧹", text: "Deep Cleaned", sub: "Before every trip" },
            { icon: "🔧", text: "Serviced Monthly", sub: "Preventive maintenance" },
            { icon: "📋", text: "Fully Insured", sub: "Passengers & vehicle" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[#0B0B0B] border border-[#2A2A2A]">
              <span className="text-xl">{item.icon}</span>
              <div>
                <div className="text-xs font-semibold text-white">{item.text}</div>
                <div className="text-[10px] text-[#737373]">{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
