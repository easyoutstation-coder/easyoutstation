import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Car, ArrowLeft, MapPin } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
          <MapPin className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold mb-2 font-['Playfair_Display']">404</h1>
        <h2 className="text-xl font-semibold mb-4">Page Not Found</h2>
        <p className="text-muted-foreground mb-8">
          Looks like you've taken a wrong turn. Let's get you back on the road.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => navigate("/")} className="bg-primary hover:bg-primary/90 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back Home
          </Button>
          <Button variant="outline" onClick={() => navigate("/cars")} className="gap-2">
            <Car className="w-4 h-4" />
            Browse Cars
          </Button>
        </div>
      </div>
    </div>
  );
}
