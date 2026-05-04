import { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AIChatbot from "@/components/AIChatbot";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Star,
  Users,
  Fuel,
  Gauge,
  Shield,
  Music,
  Snowflake,
  Navigation,
  Heart,
  Share2,
  ArrowRight,
  Check,
  Mail,
} from "lucide-react";

const featureIcons: Record<string, React.ReactNode> = {
  AC: <Snowflake className="w-4 h-4" />,
  "Music System": <Music className="w-4 h-4" />,
  "Ice Box": <Snowflake className="w-4 h-4" />,
  "Medical Kit": <Heart className="w-4 h-4" />,
  "GPS Navigation": <Navigation className="w-4 h-4" />,
  "Power Steering": <Gauge className="w-4 h-4" />,
  Airbags: <Shield className="w-4 h-4" />,
  ABS: <Shield className="w-4 h-4" />,
};

const fallbackCar = {
  id: 6,
  name: "Toyota Innova Crysta",
  brand: "Toyota",
  model: "Innova Crysta",
  category: "premium",
  seats: 6,
  pricePerKm: "20.00",
  driverCharges: "400.00",
  minKmPerDay: 250,
  fuelType: "diesel",
  transmission: "automatic",
  features: JSON.stringify(["AC", "Music System", "Ice Box", "Medical Kit", "GPS Navigation", "Power Steering", "Airbags", "ABS", "Third Row Seating", "Leather Seats", "Sunroof", "Cruise Control"]),
  imageUrl: "/cars/toyota-innova-crysta.jpg",
  galleryImages: JSON.stringify(["/cars/toyota-innova-crysta.jpg", "/cars/toyota-innova.jpg", "/fleet-showroom.jpg"]),
  rating: "4.90",
  reviewCount: 456,
  isAvailable: true,
  description: "Premium MPV with powerful engine, superior suspension, and luxurious interiors. The top choice for hill station travel. Known for its comfort, safety, and performance, it ensures a smooth journey on both highways and hills. Families, corporate travelers, and senior citizens prefer Innova Crysta for its unmatched comfort, safety, and reliability.",
};

export default function CarDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeImage, setActiveImage] = useState(0);
  const [liked, setLiked] = useState(false);

  const carId = parseInt(id || "0");
  const { data: car } = trpc.car.getById.useQuery(
    { id: carId },
    { enabled: carId > 0 }
  );

  const displayCar = car || fallbackCar;
  const features = JSON.parse(displayCar.features || "[]") as string[];
  const gallery = JSON.parse(displayCar.galleryImages || "[]") as string[];
  const allImages = [
    (displayCar.imageUrl || "/cars/swift-dzire.jpg"),
    ...gallery.filter((g) => g !== displayCar.imageUrl)
  ];

  const fromCity = searchParams.get("from") || "Delhi";
  const toCity = searchParams.get("to") || "Manali";
  const distance = 540; // Default Delhi-Manali
  const estimatedPrice = parseFloat(displayCar.pricePerKm) * distance;
  const driverCost = parseFloat(displayCar.driverCharges);
  const minKm = displayCar.minKmPerDay;
  const minPrice = parseFloat(displayCar.pricePerKm) * minKm + driverCost;

  const handleBookNow = () => {
    const params = new URLSearchParams();
    params.set("carId", displayCar.id.toString());
    params.set("from", fromCity);
    params.set("to", toCity);
    params.set("distance", distance.toString());
    navigate(`/booking?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="pt-20">
        {/* Breadcrumb */}
        <div className="bg-white border-b border-border">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="cursor-pointer hover:text-primary" onClick={() => navigate("/")}>Home</span>
              <ArrowRight className="w-3 h-3" />
              <span className="cursor-pointer hover:text-primary" onClick={() => navigate("/cars")}>Cars</span>
              <ArrowRight className="w-3 h-3" />
              <span className="text-foreground font-medium">{displayCar.name}</span>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left - Images */}
            <div className="space-y-4">
              <div className="aspect-[16/10] rounded-2xl overflow-hidden bg-muted relative">
                <img
                  src={allImages[activeImage] || "/cars/swift-dzire.jpg"}
                  alt={displayCar.name || "Car"}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge className="bg-primary text-white border-0">
                    {displayCar.category.toUpperCase()}
                  </Badge>
                  {(displayCar as any).isPopular && (
                    <Badge className="bg-white text-foreground border-0">
                      Popular
                    </Badge>
                  )}
                </div>
                <div className="absolute top-4 right-4 flex gap-2">
                  <button
                    onClick={() => setLiked(!liked)}
                    className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
                  >
                    <Heart className={`w-5 h-5 ${liked ? "text-red-500 fill-red-500" : "text-foreground"}`} />
                  </button>
                  <button className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors">
                    <Share2 className="w-5 h-5 text-foreground" />
                  </button>
                </div>
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(i)}
                    className={`relative w-24 h-16 rounded-lg overflow-hidden shrink-0 border-2 transition-colors ${
                      activeImage === i ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <img src={img} alt={`${displayCar.name} ${i + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Right - Details */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex items-center gap-1 bg-primary/10 rounded-full px-3 py-1">
                    <Star className="w-4 h-4 text-primary fill-primary" />
                    <span className="text-sm font-medium text-primary">{displayCar.rating}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    ({displayCar.reviewCount} reviews)
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-foreground font-['Playfair_Display']">
                  {displayCar.name}
                </h1>
                <p className="text-muted-foreground">{displayCar.brand}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 border border-border text-center">
                  <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="text-lg font-bold">{displayCar.seats}</div>
                  <div className="text-xs text-muted-foreground">Seats</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-border text-center">
                  <Fuel className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="text-lg font-bold capitalize">{displayCar.fuelType}</div>
                  <div className="text-xs text-muted-foreground">Fuel</div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-border text-center">
                  <Gauge className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="text-lg font-bold capitalize">{displayCar.transmission}</div>
                  <div className="text-xs text-muted-foreground">Gear</div>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">About this car</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {displayCar.description}
                </p>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3">Features & Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {features.map((feature, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-border text-sm"
                    >
                      {featureIcons[feature] || <Check className="w-4 h-4 text-primary" />}
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Pricing */}
              <div className="bg-slate-900 rounded-2xl p-6 text-white">
                <h3 className="font-semibold mb-4">Pricing Breakdown</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Rate per km</span>
                    <span>₹{displayCar.pricePerKm}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Driver charges</span>
                    <span>₹{displayCar.driverCharges}/day</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Minimum km/day</span>
                    <span>{displayCar.minKmPerDay} km</span>
                  </div>
                  <Separator className="bg-slate-700" />
                  <div className="flex justify-between text-base">
                    <span className="text-slate-400">Estimated for {distance} km</span>
                    <span className="font-bold text-primary">₹{estimatedPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Minimum charge (250 km)</span>
                    <span>₹{minPrice.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    * Extra charges: Road tax, toll, parking as applicable
                  </p>
                </div>
                <Button
                  onClick={handleBookNow}
                  className="w-full mt-4 bg-primary hover:bg-primary/90 text-white h-12 text-base"
                >
                  Book This Car
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <div className="flex gap-2 mt-3">
                  <a href="mailto:easyoutstation@gmail.com" className="flex-1">
                    <Button variant="outline" className="w-full border-white/30 text-white hover:bg-white/10 h-10">
                      <Mail className="w-4 h-4 mr-2" />
                      Email Us
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <AIChatbot />
    </div>
  );
}
