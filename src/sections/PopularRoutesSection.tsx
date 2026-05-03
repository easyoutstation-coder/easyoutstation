import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowRight, Clock, Route, TrendingUp } from "lucide-react";

const fallbackRoutes = [
  { id: 1, fromCity: "Delhi", toCity: "Manali", distanceKm: 540, durationHours: 12, basePrice: "6480.00", imageUrl: "/hero-bg.jpg", isPopular: true, description: "Scenic mountain journey via Chandigarh, Bilaspur, and Kullu" },
  { id: 2, fromCity: "Delhi", toCity: "Jaipur", distanceKm: 280, durationHours: 5, basePrice: "3360.00", imageUrl: "/cars/toyota-innova.jpg", isPopular: true, description: "The Golden Triangle route to the Pink City" },
  { id: 3, fromCity: "Delhi", toCity: "Agra", distanceKm: 230, durationHours: 4, basePrice: "2760.00", imageUrl: "/cars/swift-dzire.jpg", isPopular: true, description: "Visit the Taj Mahal and Agra Fort" },
  { id: 4, fromCity: "Delhi", toCity: "Rishikesh", distanceKm: 240, durationHours: 5, basePrice: "2880.00", imageUrl: "/cars/maruti-ertiga.jpg", isPopular: true, description: "Yoga capital of the world" },
];

export default function PopularRoutesSection() {
  const navigate = useNavigate();
  const { data: routes } = trpc.route.getPopular.useQuery();
  const displayRoutes = routes?.length ? routes.slice(0, 4) : fallbackRoutes;

  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-12">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-primary font-medium text-sm">
              <TrendingUp className="w-4 h-4" />
              Trending Destinations
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground font-['Playfair_Display']">
              Popular Routes
            </h2>
            <p className="text-muted-foreground max-w-lg">
              Discover our most traveled routes with experienced drivers who know every turn.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/routes")}
            className="hidden sm:flex items-center gap-2"
          >
            All Routes
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayRoutes.map((route) => (
            <Card
              key={route.id}
              className="group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => navigate(`/cars?from=${route.fromCity}&to=${route.toCity}`)}
            >
              <div className="relative h-64 overflow-hidden">
                <img
                  src={route.imageUrl || "/hero-bg.jpg"}
                  alt={`${route.fromCity} to ${route.toCity}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
                
                <div className="absolute top-4 left-4">
                  <Badge className="bg-white/20 backdrop-blur-sm text-white border-0">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    Popular
                  </Badge>
                </div>

                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 text-white/80 text-sm mb-2">
                    <MapPin className="w-4 h-4" />
                    <span>{route.fromCity}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span>{route.toCity}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">
                    {route.fromCity} to {route.toCity}
                  </h3>
                  <p className="text-sm text-white/70 line-clamp-1">
                    {route.description}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-white/60">
                    <span className="flex items-center gap-1">
                      <Route className="w-3.5 h-3.5" />
                      {route.distanceKm} km
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {route.durationHours} hours
                    </span>
                    <span className="font-medium text-primary">
                      From ₹{route.basePrice}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
