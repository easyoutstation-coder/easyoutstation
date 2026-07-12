import { useParams, useNavigate, Link } from "react-router";
import { useSeo } from "@/hooks/useSeo";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Shield, Check, ArrowRight } from "lucide-react";
import { getLandmark } from "@/data/routeImages";
import { blogPosts } from "@/data/blogPosts";
import { trpc } from "@/providers/trpc";
import { ROUTES } from "@/data/routes";

export default function RouteLanding() {
  const { route } = useParams<{ route: string }>();
  const navigate = useNavigate();
  const data = ROUTES[route || ""];

  const { data: liveCars } = trpc.car.list.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const fareTableCars = liveCars
    ? liveCars
        .filter(c => !["tempo", "bus"].includes(c.category))
        .sort((a, b) => parseFloat(a.pricePerKm) - parseFloat(b.pricePerKm))
    : null;

  const lm = getLandmark(data?.to ?? "");
  const guidePost = blogPosts.find((p) => p.route.routeSlug === route);

  // Fix 8: round-trip default for getaway destinations
  const ROUND_TRIP_DESTINATIONS = new Set([
    'manali', 'shimla', 'mussoorie', 'nainital', 'rishikesh', 'haridwar', 'dharamshala',
    'kashmir', 'vaishno devi', 'corbett', 'kasauli', 'dalhousie', 'spiti', 'leh', 'kasol',
    'lansdowne', 'kedarnath', 'mount abu', 'jodhpur', 'udaipur', 'pushkar', 'jaipur',
    'agra', 'mathura', 'vrindavan', 'amritsar', 'ayodhya', 'banaras', 'prayagraj',
  ]);
  const defaultTripType = data && ROUND_TRIP_DESTINATIONS.has(data.to.toLowerCase()) ? 'round_trip' : 'one_way';

  const canonicalUrl = `https://www.easyoutstation.com/cab/${route ?? ""}`;
  const pageTitle = data
    ? `${data.from} to ${data.to} Cab | ₹${data.fare.min.toLocaleString("en-IN")} · Verified Drivers | EasyOutstation`
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
      "@type": "LocalBusiness",
      "name": "EasyOutstation",
      "url": "https://www.easyoutstation.com",
      "telephone": "+91-8796564111",
      "description": data.description,
      "areaServed": [data.from, data.to],
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "bestRating": "5",
        "worstRating": "1",
        "ratingCount": "500",
      },
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
    ogImage: lm?.image,
    schema,
  });

  if (!data) {
    navigate("/routes");
    return null;
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      {/* Sticky bottom CTA — mobile only */}
      <div
        className="md:hidden bg-white border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.10)]"
        style={{ position: "fixed", bottom: 0, left: 0, width: "100%", zIndex: 999, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-slate-500 leading-tight">One way from</div>
            <div className="font-bold text-slate-900 text-base leading-tight">₹{data.fare.min.toLocaleString("en-IN")}</div>
          </div>
          <button
            onClick={() => navigate(`/cars?from=${data.from}&to=${data.to}&distance=${data.distance}&tripType=${defaultTripType}`)}
            className="shrink-0 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm rounded-xl px-5 transition-colors"
            style={{ minHeight: 48, whiteSpace: "nowrap" }}
          >
            Continue <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      </div>

      <main className="pt-20">
        {/* Hero — landmark photo background (Fix 6: image absolute so content drives height, no overflow clip) */}
        <div className="relative bg-slate-900" style={{ minHeight: "clamp(380px, 65vw, 520px)" }}>
          {lm && (
            <img
              src={lm.image}
              alt={lm.landmark}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: lm.objectPosition }}
              onError={(e) => { (e.target as HTMLImageElement).src = "/hero-bg.jpg"; }}
            />
          )}
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/55 to-black/78" />
          {/* Text — relative so it drives the container height */}
          <div className="relative flex items-center justify-center px-4 py-16" style={{ minHeight: "inherit" }}>
            <div className="text-white text-center max-w-4xl w-full">
              <div className="flex items-center justify-center gap-2 text-blue-300 text-sm font-medium mb-4" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.8)" }}>
                <MapPin className="w-4 h-4" />
                {lm ? lm.landmark : "Outstation Cab Service"}
              </div>
              <h1 className="text-4xl md:text-5xl font-bold font-['DM_Serif_Display'] mb-4" style={{ color: "white", textShadow: "0 2px 16px rgba(0,0,0,1), 0 1px 4px rgba(0,0,0,1)" }}>
                {data.from} to {data.to} Cab
              </h1>
              <p className="text-slate-200 text-lg mb-6 max-w-2xl mx-auto" style={{ textShadow: "0 1px 8px rgba(0,0,0,0.7)" }}>{data.description}</p>
              <div className="flex flex-wrap justify-center gap-6 text-sm mb-8">
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-400" />{data.distance} km</div>
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-blue-400" />{data.duration}</div>
                <div className="flex items-center gap-2"><Shield className="w-4 h-4 text-green-400" />Verified Drivers</div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" onClick={() => navigate(`/cars?from=${data.from}&to=${data.to}&distance=${data.distance}&tripType=${defaultTripType}`)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-12 text-base gap-2">
                  Book Now — From ₹{data.fare.min.toLocaleString("en-IN")} <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Fare table */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-slate-900 font-['DM_Serif_Display'] mb-6 text-center">
            {data.from} to {data.to} Cab Fare
          </h2>

          {/* Mobile: card stack */}
          <div className="md:hidden space-y-3">
            {(fareTableCars ?? [
              { id: 0, name: "Swift Dzire", seats: 4, pricePerKm: "13.00", driverCharges: "250.00" },
              { id: 1, name: "Maruti Ertiga", seats: 6, pricePerKm: "16.00", driverCharges: "250.00" },
              { id: 2, name: "Toyota Innova", seats: 6, pricePerKm: "20.00", driverCharges: "250.00" },
              { id: 3, name: "Innova Crysta", seats: 6, pricePerKm: "21.00", driverCharges: "250.00" },
              { id: 4, name: "Innova Hycross", seats: 6, pricePerKm: "23.00", driverCharges: "250.00" },
            ] as any[]).map((car) => {
              const rate = parseFloat(car.pricePerKm);
              const driverCharge = parseFloat(car.driverCharges ?? "250");
              const oneway = Math.round(rate * data.distance * 1.25 + driverCharge);
              const roundtrip = Math.round(rate * data.distance * 2 + driverCharge * 2);
              return (
                <div key={car.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold text-slate-900 text-sm">{car.name}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{car.seats} seater · ₹{rate}/km</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-slate-500 mb-1">One Way</div>
                      <div className="font-bold text-blue-700 text-base">₹{oneway.toLocaleString("en-IN")}</div>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-slate-500 mb-1">Round Trip</div>
                      <div className="font-semibold text-slate-700 text-base">₹{roundtrip.toLocaleString("en-IN")}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
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
                {(fareTableCars ?? [
                  { id: 0, name: "Swift Dzire", seats: 4, pricePerKm: "13.00", driverCharges: "250.00" },
                  { id: 1, name: "Maruti Ertiga", seats: 6, pricePerKm: "16.00", driverCharges: "250.00" },
                  { id: 2, name: "Toyota Innova", seats: 6, pricePerKm: "20.00", driverCharges: "250.00" },
                  { id: 3, name: "Innova Crysta", seats: 6, pricePerKm: "21.00", driverCharges: "250.00" },
                  { id: 4, name: "Innova Hycross", seats: 6, pricePerKm: "23.00", driverCharges: "250.00" },
                ] as any[]).map((car) => {
                  const rate = parseFloat(car.pricePerKm);
                  const driverCharge = parseFloat(car.driverCharges ?? "250");
                  const oneway = Math.round(rate * data.distance * 1.25 + driverCharge);
                  const roundtrip = Math.round(rate * data.distance * 2 + driverCharge * 2);
                  return (
                    <tr key={car.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{car.name}</td>
                      <td className="px-6 py-4 text-slate-600">{car.seats} seater</td>
                      <td className="px-6 py-4 text-slate-600">₹{rate}/km</td>
                      <td className="px-6 py-4 font-semibold text-blue-700">₹{oneway.toLocaleString("en-IN")}</td>
                      <td className="px-6 py-4 text-slate-600">₹{roundtrip.toLocaleString("en-IN")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-slate-400 mt-3 text-center">* Fares include driver charges (₹250). Toll & parking charged at actuals — whatever is paid on the road, no markup.</p>

          {/* Additional charges guide */}
          {(() => {
            const dest = data.to.toLowerCase();
            const isHP = ["shimla","manali","dharamshala","kasauli","dalhousie","spiti","kasol"].includes(dest);
            const isRaj = ["jaipur","jodhpur","udaipur","pushkar","mount abu"].includes(dest);
            return (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold mb-2">Estimated Additional Charges <span className="font-normal text-amber-700">(guide only — charged at actuals)</span></p>
                <ul className="space-y-1 text-amber-800 text-xs">
                  <li>• <span className="font-medium">Toll:</span> ~₹{data.toll.toLocaleString("en-IN")} estimated on major plaza(s) on this route</li>
                  {isHP && <li>• <span className="font-medium">Himachal Pradesh state entry tax:</span> ~₹350–500 per vehicle (varies by vehicle type)</li>}
                  {isRaj && <li>• <span className="font-medium">Rajasthan state permit:</span> ~₹250–450 per vehicle (varies by vehicle type)</li>}
                  <li>• <span className="font-medium">Parking:</span> charged at actuals at all stops</li>
                </ul>
                <p className="mt-2 text-[11px] text-amber-700">All amounts are estimates based on standard routes. Actual charges depend on the exact toll plazas used and are passed on to you at cost with zero markup.</p>
              </div>
            );
          })()}
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

        {/* Other Popular Routes — internal links for SEO */}
        <div className="max-w-4xl mx-auto px-4 pb-12">
          <h2 className="text-xl font-bold font-['DM_Serif_Display'] mb-5 text-slate-900">Other Popular Routes from Delhi</h2>
          <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap">
            {Object.entries(ROUTES)
              .filter(([slug]) => slug !== route)
              .map(([slug, r]) => (
                <Link
                  key={slug}
                  to={`/cab/${slug}`}
                  className="flex items-center justify-between gap-1 px-3 py-2.5 min-h-[44px] rounded-xl border border-slate-200 text-slate-700 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-colors no-underline"
                >
                  <span className="text-xs truncate">{r.from} → {r.to}</span>
                  <span className="shrink-0 text-slate-400 text-xs ml-1">₹{r.fare.min.toLocaleString("en-IN")}</span>
                </Link>
              ))}
          </div>
        </div>

        {/* Travel guide link */}
        {guidePost && (
          <div className="max-w-4xl mx-auto px-4 pb-8">
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
              <span className="text-blue-500 text-lg">📖</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500 mb-0.5">Travel Guide</div>
                <Link to={`/blog/${guidePost.slug}`} className="text-sm font-semibold text-blue-700 hover:underline line-clamp-1">
                  {guidePost.title}
                </Link>
              </div>
              <Link to={`/blog/${guidePost.slug}`} className="shrink-0 text-xs text-blue-600 font-medium hover:underline whitespace-nowrap">
                Read guide →
              </Link>
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="bg-blue-600 pt-12 pb-12 md:pb-12 px-4 text-center text-white" style={{ paddingBottom: 'calc(3rem + env(safe-area-inset-bottom, 0px))' }}>
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
