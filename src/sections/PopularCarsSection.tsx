import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Users, Gauge, ArrowRight, Sparkles } from "lucide-react";

export default function PopularCarsSection() {
  const navigate = useNavigate();
  const { data: cars } = trpc.car.getPopular.useQuery();

  const fallbackCars = [
    { id: 6, name: "Toyota Innova Crysta", brand: "Toyota", category: "premium", seats: 6, pricePerKm: "20.00", rating: "4.90", reviewCount: 456, imageUrl: "/cars/toyota-innova-crysta.jpg", isPopular: true, description: "Premium MPV with powerful engine and luxurious interiors" },
    { id: 8, name: "Toyota Innova Hycross", brand: "Toyota", category: "luxury", seats: 6, pricePerKm: "22.00", rating: "4.95", reviewCount: 67, imageUrl: "/cars/toyota-innova-hycross.jpg", isPopular: true, description: "Flagship luxury hybrid MPV with cutting-edge technology" },
    { id: 5, name: "Toyota Innova", brand: "Toyota", category: "muv", seats: 6, pricePerKm: "19.00", rating: "4.80", reviewCount: 342, imageUrl: "/cars/toyota-innova.jpg", isPopular: true, description: "The iconic Indian family vehicle, reliable and comfortable" },
    { id: 4, name: "Maruti Ertiga", brand: "Maruti Suzuki", category: "muv", seats: 6, pricePerKm: "15.00", rating: "4.70", reviewCount: 215, imageUrl: "/cars/maruti-ertiga.jpg", isPopular: true, description: "Spacious MUV perfect for family trips with great value" },
  ];

  const displayCars = cars?.length ? cars.slice(0, 4) : fallbackCars;

  return (
    <section className="py-20 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-primary font-medium text-sm">
              <Sparkles className="w-4 h-4" />
              AI Curated for You
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground font-['Playfair_Display']">
              Most Popular Cars
            </h2>
            <p className="text-muted-foreground max-w-lg">
              Travelers love these vehicles for their comfort, reliability, and value. 
              Perfect for your Delhi to Manali journey.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/cars")}
            className="hidden sm:flex items-center gap-2"
          >
            View All Cars
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {displayCars.map((car) => (
            <Card
              key={car.id}
              className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer"
              onClick={() => navigate(`/cars/${car.id}`)}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={car.imageUrl || "/cars/swift-dzire.jpg"}
                  alt={car.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute top-3 left-3">
                  <Badge className="bg-primary text-white border-0">
                    {car.category.toUpperCase()}
                  </Badge>
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1">
                  <Star className="w-3.5 h-3.5 text-primary fill-primary" />
                  <span className="text-xs font-medium">{car.rating}</span>
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{car.name}</h3>
                    <p className="text-xs text-muted-foreground">{car.brand}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-primary">₹{car.pricePerKm}</div>
                    <div className="text-xs text-muted-foreground">per km</div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {car.description}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {car.seats} seats
                  </span>
                  <span className="flex items-center gap-1">
                    <Gauge className="w-3.5 h-3.5" />
                    250 km/day
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center sm:hidden">
          <Button variant="outline" onClick={() => navigate("/cars")}>
            View All Cars
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}
