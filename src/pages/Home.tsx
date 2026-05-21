import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AIChatbot from "@/components/AIChatbot";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import HeroSection from "@/sections/HeroSection";
import PopularCarsSection from "@/sections/PopularCarsSection";
import PopularRoutesSection from "@/sections/PopularRoutesSection";
import FeaturesSection from "@/sections/FeaturesSection";
import TestimonialsSection from "@/sections/TestimonialsSection";
import CTASection from "@/sections/CTASection"
import CorporateSection from "@/sections/CorporateSection";
import { useSeo } from "@/hooks/useSeo";

const homeSchema = [
  {
    "@type": "WebSite",
    "@id": "https://www.easyoutstation.com/#website",
    "url": "https://www.easyoutstation.com/",
    "name": "EasyOutstation",
    "description": "Book verified outstation cabs from Delhi to Manali, Shimla, Jaipur, Agra and more. Fixed fares, police-verified drivers, zero hidden charges.",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://www.easyoutstation.com/?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  },
  {
    "@type": "LocalBusiness",
    "@id": "https://www.easyoutstation.com/#business",
    "name": "EasyOutstation",
    "url": "https://www.easyoutstation.com/",
    "logo": "https://www.easyoutstation.com/logo.svg",
    "image": "https://www.easyoutstation.com/og-image.jpg",
    "telephone": "+91-9958556011",
    "email": "easyoutstation@gmail.com",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "New Delhi",
      "addressRegion": "Delhi",
      "addressCountry": "IN"
    },
    "areaServed": [
      "New Delhi", "Gurgaon", "Noida", "Faridabad", "Ghaziabad",
      "Manali", "Shimla", "Jaipur", "Agra", "Rishikesh", "Haridwar", "Dehradun", "Chandigarh"
    ],
    "serviceType": "Outstation Cab Service",
    "description": "Premium outstation cab service from Delhi NCR. Police-verified drivers, fixed fares, no hidden charges. Book trips to Manali, Shimla, Jaipur, Agra, Haridwar and more.",
    "priceRange": "₹12–₹22 per km",
    "openingHours": "Mo-Su 00:00-24:00",
    "sameAs": [
      "https://wa.me/919958556011"
    ]
  }
];

export default function Home() {
  useSeo({
    title: "Outstation Cab from Delhi | EasyOutstation — Book Verified Cabs",
    description: "Book verified outstation cabs from Delhi to Manali, Shimla, Jaipur, Agra, Haridwar & more. Fixed fares, police-verified drivers, zero hidden charges. Instant booking.",
    canonical: "https://www.easyoutstation.com/",
    schema: homeSchema,
  });

  return (
    <div className="min-h-screen bg-[#0B0B0B]">
      <Navbar />
      <main>
        <HeroSection />
        <CorporateSection />
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
