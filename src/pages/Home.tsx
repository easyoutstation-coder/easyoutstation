import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AIChatbot from "@/components/AIChatbot";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import HeroSection from "@/sections/HeroSection";
import PopularCarsSection from "@/sections/PopularCarsSection";
import PopularRoutesSection from "@/sections/PopularRoutesSection";
import FeaturesSection from "@/sections/FeaturesSection";
import TestimonialsSection from "@/sections/TestimonialsSection";
import CTASection from "@/sections/CTASection";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      <Navbar />
      <main>
        <HeroSection />
        <PopularRoutesSection />
        <PopularCarsSection />
        <FeaturesSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
      <AIChatbot />
      <WhatsAppFloat />
    </div>
  );
}
