import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail } from "lucide-react";

export default function CTASection() {
  const navigate = useNavigate();

  return (
    <section className="py-20 relative overflow-hidden">
      <div className="absolute inset-0">
        <img
          src="/fleet-showroom.jpg"
          alt="Premium fleet"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/80" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6 font-['Playfair_Display']">
          Ready for Your Next Adventure?
        </h2>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto mb-8">
          Book your premium car rental today and experience the joy of hassle-free travel 
          with our professional chauffeur-driven service.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button
            size="lg"
            onClick={() => navigate("/cars")}
            className="bg-primary hover:bg-primary/90 text-white gap-2 px-8 h-14 text-base"
          >
            Book Now
            <ArrowRight className="w-5 h-5" />
          </Button>
          <a href="mailto:easyoutstation@gmail.com">
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 gap-2 px-8 h-14 text-base"
            >
              <Mail className="w-5 h-5" />
              Email Us
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
