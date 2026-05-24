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
    "image": "https://www.easyoutstation.com/hero-bg.jpg",
    "telephone": "+91-9958556011",
    "email": "easyoutstation@gmail.com",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "New Delhi",
      "addressRegion": "Delhi",
      "addressCountry": "IN"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "28.6139",
      "longitude": "77.2090"
    },
    "areaServed": [
      "New Delhi", "Gurgaon", "Noida", "Faridabad", "Ghaziabad",
      "Manali", "Shimla", "Jaipur", "Agra", "Rishikesh", "Haridwar", "Dehradun", "Chandigarh",
      "Mussoorie", "Nainital", "Mathura", "Amritsar"
    ],
    "serviceType": "Outstation Cab Service",
    "description": "Premium outstation cab service from Delhi NCR. Police-verified drivers, fixed fares, no hidden charges. Book trips to Manali, Shimla, Jaipur, Agra, Haridwar and more.",
    "priceRange": "₹12–₹22 per km",
    "openingHours": "Mo-Su 00:00-24:00",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "bestRating": "5",
      "worstRating": "1",
      "ratingCount": "500"
    },
    "sameAs": [
      "https://wa.me/919958556011"
    ]
  },
  {
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How do I book an outstation ride from Delhi?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Enter your pickup and drop location on our homepage, select your travel date, choose a vehicle and pay 10% advance to confirm. Your driver details will be shared within 60 minutes."
        }
      },
      {
        "@type": "Question",
        "name": "What is the fare for Delhi to Manali cab?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Delhi to Manali fare starts from ₹6,730 for a sedan (Swift Dzire) to ₹11,050 for an SUV (Innova Crysta) one way. Fare includes driver charges. Toll and parking are charged at actuals."
        }
      },
      {
        "@type": "Question",
        "name": "Are there any hidden charges?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "No hidden fees or markups. The fare includes driver charges (₹250/day). Toll and parking are charged at actuals — exactly what is paid on the road, no markup added."
        }
      },
      {
        "@type": "Question",
        "name": "Can I cancel my booking?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Yes. Free cancellation up to 24 hours before pickup. The 10% advance is refunded in full for cancellations made more than 24 hours in advance."
        }
      }
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
      <main className="bg-white">
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
