import { useParams, useNavigate } from "react-router";
import { useSeo } from "@/hooks/useSeo";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Shield, Star, Check, ArrowRight } from "lucide-react";
import { getLandmark } from "@/data/routeImages";

const ROUTES: Record<string, {
  from: string; to: string; distance: number; duration: string;
  fare: { min: number; max: number }; toll: number;
  highlights: string[]; faqs: { q: string; a: string }[];
  description: string;
}> = {
  "delhi-to-manali": {
    from: "Delhi", to: "Manali", distance: 540, duration: "12-14 hours",
    fare: { min: 11500, max: 16500 }, toll: 850,
    description: "Book Delhi to Manali cab at fixed fares. Experienced mountain drivers, comfortable cars, no hidden charges. One way and round trip available.",
    highlights: ["Experienced mountain drivers", "AC cars with comfortable seats", "Available 24/7", "Fixed price — no surge"],
    faqs: [
      { q: "How long is the Delhi to Manali cab journey?", a: "Delhi to Manali is approximately 540 km and takes 12-14 hours by road depending on traffic and road conditions." },
      { q: "What is the best car for Delhi to Manali trip?", a: "We recommend Toyota Innova Crysta or Innova Hycross for Manali trips due to mountain terrain. Sedans are also available at lower fares." },
      { q: "Is night travel safe on Delhi-Manali route?", a: "We advise daytime travel on this route due to mountain roads. Our drivers are experienced and will plan the best route for your safety." },
    ]
  },
  "delhi-to-shimla": {
    from: "Delhi", to: "Shimla", distance: 350, duration: "7-8 hours",
    fare: { min: 7500, max: 11000 }, toll: 650,
    description: "Book Delhi to Shimla cab at fixed fares. Professional drivers, AC cars, door-to-door pickup. One way and round trip available.",
    highlights: ["Hill station specialists", "AC cars", "Available 24/7", "No hidden charges"],
    faqs: [
      { q: "How far is Delhi to Shimla by cab?", a: "Delhi to Shimla is approximately 350 km and takes 7-8 hours by cab via NH44 and NH5." },
      { q: "Which is the best route from Delhi to Shimla?", a: "The best route is via Chandigarh on NH44, then NH5 to Shimla. Our drivers take the safest and fastest route." },
    ]
  },
  "delhi-to-chandigarh": {
    from: "Delhi", to: "Chandigarh", distance: 260, duration: "4-5 hours",
    fare: { min: 5500, max: 8500 }, toll: 380,
    description: "Book Delhi to Chandigarh cab at fixed fares. Fast, comfortable and reliable. One way and round trip available.",
    highlights: ["Fast highway route", "4-5 hours journey", "Fixed fares", "Verified drivers"],
    faqs: [
      { q: "How long is Delhi to Chandigarh by cab?", a: "Delhi to Chandigarh is 260 km and takes approximately 4-5 hours via NH44 (Ambala highway)." },
      { q: "Is there a direct cab from Delhi to Chandigarh?", a: "Yes. EasyOutstation offers direct door-to-door cab service from anywhere in Delhi to Chandigarh." },
    ]
  },
  "delhi-to-jaipur": {
    from: "Delhi", to: "Jaipur", distance: 280, duration: "4-5 hours",
    fare: { min: 5800, max: 8800 }, toll: 350,
    description: "Book Delhi to Jaipur cab at fixed fares. Comfortable AC cabs, experienced drivers, on-time pickup guaranteed.",
    highlights: ["Express highway route", "4-5 hours", "Fixed fares", "AC cars"],
    faqs: [
      { q: "How far is Delhi to Jaipur by cab?", a: "Delhi to Jaipur is 280 km via NH48 (Delhi-Mumbai Expressway) and takes 4-5 hours." },
      { q: "What is the cheapest cab from Delhi to Jaipur?", a: "Swift Dzire starts from ₹5,800 one way. All prices include driver charges and toll estimates." },
    ]
  },
  "delhi-to-agra": {
    from: "Delhi", to: "Agra", distance: 230, duration: "3-4 hours",
    fare: { min: 4800, max: 7500 }, toll: 290,
    description: "Book Delhi to Agra cab at fixed fares. Visit the Taj Mahal comfortably. Same day return trips available.",
    highlights: ["Yamuna Expressway route", "3-4 hours", "Same day return available", "Taj Mahal specialists"],
    faqs: [
      { q: "How far is Delhi to Agra by cab?", a: "Delhi to Agra is 230 km via Yamuna Expressway and takes 3-4 hours." },
      { q: "Can I book a same-day return cab from Delhi to Agra?", a: "Yes. We offer round trip same day bookings. Visit Taj Mahal and return the same day." },
    ]
  },
  "delhi-to-rishikesh": {
    from: "Delhi", to: "Rishikesh", distance: 250, duration: "5-6 hours",
    fare: { min: 5200, max: 8200 }, toll: 450,
    description: "Book Delhi to Rishikesh cab at fixed fares. Adventure awaits! Comfortable journey to the yoga and rafting capital.",
    highlights: ["Scenic route", "5-6 hours", "Fixed fares", "Adventure ready"],
    faqs: [
      { q: "How far is Delhi to Rishikesh by cab?", a: "Delhi to Rishikesh is approximately 250 km and takes 5-6 hours via NH58." },
      { q: "Is cab the best way to travel from Delhi to Rishikesh?", a: "Yes, a cab is the most comfortable option as it offers door-to-door service and flexible timings." },
    ]
  },
  "delhi-to-dehradun": {
    from: "Delhi", to: "Dehradun", distance: 300, duration: "5-6 hours",
    fare: { min: 6200, max: 9500 }, toll: 420,
    description: "Book Delhi to Dehradun cab at fixed fares. Gateway to Uttarakhand. Comfortable, reliable and affordable.",
    highlights: ["NH58 highway route", "5-6 hours", "Fixed fares", "Uttarakhand specialists"],
    faqs: [
      { q: "How far is Delhi to Dehradun by cab?", a: "Delhi to Dehradun is approximately 300 km and takes 5-6 hours by cab." },
      { q: "What is the fare for Delhi to Dehradun cab?", a: "Fares start from ₹6,200 for a sedan to ₹9,500 for a premium SUV, inclusive of driver charges and toll." },
    ]
  },
  "delhi-to-haridwar": {
    from: "Delhi", to: "Haridwar", distance: 220, duration: "4-5 hours",
    fare: { min: 4600, max: 7200 }, toll: 380,
    description: "Book Delhi to Haridwar cab at fixed fares. Visit the holy Ganga Ghats with comfort. One way and round trip available.",
    highlights: ["NH58 expressway route", "4-5 hours", "Fixed fares", "Pilgrimage specialists"],
    faqs: [
      { q: "How far is Delhi to Haridwar by cab?", a: "Delhi to Haridwar is approximately 220 km via NH58 and takes 4-5 hours depending on traffic." },
      { q: "Is a same-day return trip from Delhi to Haridwar possible?", a: "Yes, same-day round trips are very popular. Leave Delhi by 5 AM and you can visit Har Ki Pauri and return the same evening." },
      { q: "What is the cheapest Delhi to Haridwar cab fare?", a: "A Swift Dzire starts from ₹4,600 one way, inclusive of driver charges and toll." },
    ]
  },
  "delhi-to-mussoorie": {
    from: "Delhi", to: "Mussoorie", distance: 310, duration: "6-7 hours",
    fare: { min: 6400, max: 9800 }, toll: 430,
    description: "Book Delhi to Mussoorie cab at fixed fares. The Queen of Hills awaits. Scenic mountain drive with experienced drivers.",
    highlights: ["Scenic mountain route", "6-7 hours", "Experienced hill drivers", "Fixed all-inclusive fares"],
    faqs: [
      { q: "How far is Delhi to Mussoorie by cab?", a: "Delhi to Mussoorie is approximately 310 km via Dehradun and takes 6-7 hours by road." },
      { q: "Which is the best route from Delhi to Mussoorie?", a: "The best route is via NH44 to Dehradun, then the mountain road to Mussoorie. Our drivers take the safest hill route." },
      { q: "What car is recommended for Delhi to Mussoorie?", a: "We recommend Innova Crysta or Innova Hycross for the mountain terrain. Sedans are also available at lower fares." },
    ]
  },
  "delhi-to-nainital": {
    from: "Delhi", to: "Nainital", distance: 310, duration: "6-7 hours",
    fare: { min: 6400, max: 9800 }, toll: 420,
    description: "Book Delhi to Nainital cab at fixed fares. Discover the lake city of Uttarakhand. Safe mountain driving with verified drivers.",
    highlights: ["Kumaon hills specialists", "6-7 hours", "Fixed fares", "Lake city destination"],
    faqs: [
      { q: "How far is Delhi to Nainital by cab?", a: "Delhi to Nainital is approximately 310 km and takes 6-7 hours via Moradabad and Kathgodam." },
      { q: "What is the cab fare from Delhi to Nainital?", a: "Fares start from ₹6,400 for a sedan and go up to ₹9,800 for a premium SUV, all inclusive." },
      { q: "Is it safe to drive to Nainital?", a: "Yes. Our drivers are experienced on the Kumaon mountain roads. We recommend daytime travel for the mountain stretch." },
    ]
  },
  "delhi-to-mathura": {
    from: "Delhi", to: "Mathura", distance: 175, duration: "2-3 hours",
    fare: { min: 3800, max: 6000 }, toll: 250,
    description: "Book Delhi to Mathura cab at fixed fares. Visit the birthplace of Lord Krishna. Quick and comfortable same-day trip from Delhi.",
    highlights: ["Yamuna Expressway route", "2-3 hours", "Same day return popular", "Pilgrimage destination"],
    faqs: [
      { q: "How far is Delhi to Mathura by cab?", a: "Delhi to Mathura is approximately 175 km via Yamuna Expressway and takes just 2-3 hours." },
      { q: "Can I do Delhi to Mathura-Vrindavan in a day?", a: "Yes, absolutely. A day trip covering Mathura and Vrindavan (just 15 km apart) is very popular and comfortable by cab." },
      { q: "What is the cheapest Delhi to Mathura cab fare?", a: "A Swift Dzire starts from ₹3,800 one way including driver charges and toll." },
    ]
  },
};

export default function RouteLanding() {
  const { route } = useParams<{ route: string }>();
  const navigate = useNavigate();
  const data = ROUTES[route || ""];

  const canonicalUrl = `https://www.easyoutstation.com/cab/${route ?? ""}`;
  const pageTitle = data
    ? `${data.from} to ${data.to} Cab | ₹${data.fare.min.toLocaleString("en-IN")} Fixed Fare | EasyOutstation`
    : "Cab Routes | EasyOutstation";

  const schema = data ? [
    {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.easyoutstation.com/" },
        { "@type": "ListItem", "position": 2, "name": "Routes", "item": "https://www.easyoutstation.com/routes" },
        { "@type": "ListItem", "position": 3, "name": `${data.from} to ${data.to} Cab`, "item": canonicalUrl },
      ],
    },
    {
      "@type": "Service",
      "name": `${data.from} to ${data.to} Cab Service`,
      "provider": {
        "@type": "LocalBusiness",
        "name": "EasyOutstation",
        "url": "https://www.easyoutstation.com",
        "telephone": "+91-9958556011",
      },
      "areaServed": [data.from, data.to],
      "description": data.description,
      "offers": {
        "@type": "Offer",
        "priceCurrency": "INR",
        "price": data.fare.min,
        "priceSpecification": {
          "@type": "PriceSpecification",
          "minPrice": data.fare.min,
          "maxPrice": data.fare.max,
          "priceCurrency": "INR",
        },
      },
    },
    {
      "@type": "FAQPage",
      "mainEntity": data.faqs.map(faq => ({
        "@type": "Question",
        "name": faq.q,
        "acceptedAnswer": { "@type": "Answer", "text": faq.a },
      })),
    },
  ] : undefined;

  useSeo({
    title: pageTitle,
    description: data?.description ?? "Book outstation cabs from Delhi at fixed fares.",
    canonical: canonicalUrl,
    schema,
  });

  const lm = getLandmark(data.to);

  if (!data) {
    navigate("/routes");
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-20">
        {/* Hero — landmark photo background */}
        <div
          className="relative bg-slate-900 text-white py-20 px-4 overflow-hidden min-h-[340px] flex items-center"
          style={lm ? {
            backgroundImage: `url(${lm.image})`,
            backgroundSize: "cover",
            backgroundPosition: lm.objectPosition,
          } : undefined}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/50 to-slate-900/75" />
          <div className="relative w-full max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 text-blue-300 text-sm font-medium mb-4">
              <MapPin className="w-4 h-4" />
              {lm ? lm.landmark : "Outstation Cab Service"}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-['DM_Serif_Display'] mb-4">
              {data.from} to {data.to} Cab
            </h1>
            <p className="text-slate-200 text-lg mb-6 max-w-2xl mx-auto">{data.description}</p>
            <div className="flex flex-wrap justify-center gap-6 text-sm mb-8">
              <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-400" />{data.distance} km</div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-blue-400" />{data.duration}</div>
              <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-green-400" />Verified Drivers</div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate(`/cars?from=${data.from}&to=${data.to}&distance=${data.distance}`)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 text-base gap-2">
                Book Now — From ₹{data.fare.min.toLocaleString("en-IN")} <ArrowRight className="w-4 h-4" />
              </Button>
              <a href="https://wa.me/919958556011?text=Hi%2C%20I%20want%20to%20book%20a%20cab%20from%20Delhi" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 h-12 px-8 text-base w-full sm:w-auto">
                  WhatsApp Us
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* Fare table */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-slate-900 font-['DM_Serif_Display'] mb-6 text-center">
            {data.from} to {data.to} Cab Fare
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-6 py-4 font-semibold text-slate-700">Car Type</th>
                  <th className="text-left px-6 py-4 font-semibold text-slate-700">Seats</th>
                  <th className="text-left px-6 py-4 font-semibold text-slate-700">Rate/km</th>
                  <th className="text-left px-6 py-4 font-semibold text-slate-700">One Way Fare</th>
                  <th className="text-left px-6 py-4 font-semibold text-slate-700">Round Trip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { name: "Swift Dzire", seats: 4, rate: 12 },
                  { name: "Toyota Etios", seats: 4, rate: 13 },
                  { name: "Maruti Ertiga", seats: 6, rate: 15 },
                  { name: "Toyota Innova", seats: 6, rate: 19 },
                  { name: "Innova Crysta", seats: 6, rate: 20 },
                  { name: "Innova Hycross", seats: 6, rate: 22 },
                ].map((car) => {
                  const oneway = Math.round(car.rate * data.distance + 250 + data.toll);
                  const roundtrip = Math.round(car.rate * data.distance * 2 + 500 + data.toll * 2);
                  return (
                    <tr key={car.name} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{car.name}</td>
                      <td className="px-6 py-4 text-slate-600">{car.seats} seater</td>
                      <td className="px-6 py-4 text-slate-600">₹{car.rate}/km</td>
                      <td className="px-6 py-4 font-semibold text-blue-700">₹{oneway.toLocaleString("en-IN")}</td>
                      <td className="px-6 py-4 text-slate-600">₹{roundtrip.toLocaleString("en-IN")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center">* Fares include driver charges & estimated tolls. Actual toll may vary slightly.</p>
        </div>

        {/* Why choose us */}
        <div className="bg-slate-50 py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center font-['DM_Serif_Display'] mb-8">Why Book {data.from} to {data.to} Cab with EasyOutstation?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...data.highlights,
                "Driver details shared within 60 minutes",
                "Free cancellation 24 hours before pickup",
                "Pay just 10% advance to confirm booking",
                "24/7 customer support on WhatsApp"
              ].map((h, i) => (
                <div key={i} className="flex items-start gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-green-600" />
                  </div>
                  <span className="text-slate-700 text-sm">{h}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold font-['DM_Serif_Display'] mb-8 text-center">
            Frequently Asked Questions — {data.from} to {data.to} Cab
          </h2>
          <div className="space-y-4">
            {data.faqs.map((faq, i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-6">
                <h3 className="font-semibold text-slate-900 mb-2">{faq.q}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="bg-blue-600 py-12 px-4 text-center text-white">
          <h2 className="text-2xl font-bold font-['DM_Serif_Display'] mb-3">Ready to Book Your {data.from} to {data.to} Cab?</h2>
          <p className="text-blue-100 mb-6">Confirm with just 10% advance. Driver details within 60 minutes.</p>
          <Button size="lg" onClick={() => navigate(`/cars?from=${data.from}&to=${data.to}&distance=${data.distance}`)}
            className="bg-white text-blue-700 hover:bg-blue-50 px-8 h-12 text-base gap-2 font-semibold">
            Book Now — From ₹{data.fare.min.toLocaleString("en-IN")} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
