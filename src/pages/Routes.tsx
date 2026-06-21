import { useNavigate, Link } from "react-router";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ArrowRight, Clock, Route, CheckCircle, MapPin } from "lucide-react";
import { useSeo } from "@/hooks/useSeo";
import { getLandmark } from "@/data/routeImages";

type RouteEntry = {
  to: string;
  km: number;
  hrs: string;
  sedan: string;
  innova: string;
  highlights: string[];
  slug: string;
};

const sections: { label: string; routes: RouteEntry[] }[] = [
  {
    label: "Mountains & Hill Stations",
    routes: [
      { to: "Manali", km: 540, hrs: "12", sedan: "6,730", innova: "11,050", slug: "delhi-to-manali", highlights: ["Rohtang Pass", "Solang Valley", "Hadimba Temple", "Old Manali"] },
      { to: "Shimla", km: 350, hrs: "8", sedan: "4,450", innova: "7,250", slug: "delhi-to-shimla", highlights: ["Mall Road", "Jakhu Temple", "Kufri", "Christ Church"] },
      { to: "Dehradun", km: 250, hrs: "5", sedan: "3,250", innova: "5,250", slug: "delhi-to-dehradun", highlights: ["Sahastradhara", "FRI Campus", "Rajaji National Park"] },
      { to: "Mussoorie", km: 295, hrs: "6", sedan: "3,790", innova: "6,150", slug: "delhi-to-mussoorie", highlights: ["Kempty Falls", "Gun Hill", "Mall Road", "Lal Tibba"] },
      { to: "Rishikesh", km: 240, hrs: "5", sedan: "3,130", innova: "5,050", slug: "delhi-to-rishikesh", highlights: ["River Rafting", "Laxman Jhula", "Triveni Ghat", "Yoga Capital"] },
      { to: "Haridwar", km: 220, hrs: "4-5", sedan: "2,890", innova: "4,650", slug: "delhi-to-haridwar", highlights: ["Har Ki Pauri Ganga Aarti", "Chandi Devi Temple"] },
      { to: "Nainital", km: 320, hrs: "7", sedan: "4,090", innova: "6,650", slug: "delhi-to-nainital", highlights: ["Naini Lake", "Snow View Point", "Naina Devi Temple"] },
      { to: "Kasauli", km: 315, hrs: "5-6", sedan: "4,030", innova: "6,550", slug: "delhi-to-kasauli", highlights: ["Gilbert Trail", "Monkey Point", "Colonial Cantonment"] },
      { to: "Lansdowne", km: 265, hrs: "5-6", sedan: "3,430", innova: "5,550", slug: "delhi-to-lansdowne", highlights: ["Tip'n'Top Viewpoint", "Bhim Pakora", "War Memorial"] },
      { to: "Corbett", km: 250, hrs: "5-6", sedan: "3,250", innova: "5,250", slug: "delhi-to-corbett", highlights: ["Tiger Safaris", "Ramganga River", "Dhikala Zone"] },
      { to: "Dalhousie", km: 555, hrs: "10-11", sedan: "6,910", innova: "11,350", slug: "delhi-to-dalhousie", highlights: ["Khajjiar Meadow", "Dainkund Peak", "Colonial Heritage"] },
    ],
  },
  {
    label: "Rajasthan",
    routes: [
      { to: "Jaipur", km: 280, hrs: "5", sedan: "3,610", innova: "5,850", slug: "delhi-to-jaipur", highlights: ["Amber Fort", "Hawa Mahal", "City Palace", "Johari Bazaar"] },
      { to: "Agra", km: 230, hrs: "4", sedan: "3,010", innova: "4,850", slug: "delhi-to-agra", highlights: ["Taj Mahal", "Agra Fort", "Fatehpur Sikri", "Mehtab Bagh"] },
      { to: "Jodhpur", km: 600, hrs: "9-10", sedan: "7,450", innova: "12,250", slug: "delhi-to-jodhpur", highlights: ["Mehrangarh Fort", "Blue City", "Sardar Market"] },
      { to: "Udaipur", km: 665, hrs: "10-11", sedan: "8,230", innova: "13,550", slug: "delhi-to-udaipur", highlights: ["Lake Pichola", "City Palace", "Jagdish Temple"] },
      { to: "Pushkar", km: 395, hrs: "6-7", sedan: "4,990", innova: "8,150", slug: "delhi-to-pushkar", highlights: ["Brahma Temple", "Pushkar Lake Ghats", "Camel Fair"] },
      { to: "Mount Abu", km: 780, hrs: "12-13", sedan: "9,610", innova: "15,850", slug: "delhi-to-mount-abu", highlights: ["Dilwara Jain Temples", "Nakki Lake", "Guru Shikhar"] },
    ],
  },
  {
    label: "Uttar Pradesh & East",
    routes: [
      { to: "Mathura", km: 165, hrs: "3", sedan: "2,230", innova: "3,550", slug: "delhi-to-mathura", highlights: ["Krishna Janmabhoomi", "Banke Bihari Mandir", "Govardhan"] },
      { to: "Vrindavan", km: 155, hrs: "2.5-3", sedan: "2,110", innova: "3,350", slug: "delhi-to-vrindavan", highlights: ["Prem Mandir", "Banke Bihari Mandir", "ISKCON Temple"] },
      { to: "Ayodhya", km: 640, hrs: "10-11", sedan: "7,930", innova: "13,050", slug: "delhi-to-ayodhya", highlights: ["Ram Mandir", "Saryu Ghats", "Hanuman Garhi"] },
      { to: "Lucknow", km: 555, hrs: "7-8", sedan: "6,910", innova: "11,350", slug: "delhi-to-lucknow", highlights: ["Bara Imambara", "Rumi Darwaza", "Hazratganj"] },
      { to: "Prayagraj", km: 645, hrs: "9-10", sedan: "7,990", innova: "13,150", slug: "delhi-to-prayagraj", highlights: ["Sangam Confluence", "Triveni Ghat", "Anand Bhavan"] },
      { to: "Banaras", km: 820, hrs: "12-13", sedan: "10,090", innova: "16,650", slug: "delhi-to-banaras", highlights: ["Ganga Aarti", "Kashi Vishwanath", "Dashashwamedh Ghat"] },
    ],
  },
  {
    label: "Punjab & North India",
    routes: [
      { to: "Chandigarh", km: 250, hrs: "5", sedan: "3,250", innova: "5,250", slug: "delhi-to-chandigarh", highlights: ["Rock Garden", "Sukhna Lake", "Rose Garden", "Capitol Complex"] },
      { to: "Amritsar", km: 460, hrs: "8", sedan: "5,770", innova: "9,450", slug: "delhi-to-amritsar", highlights: ["Golden Temple", "Wagah Border Ceremony", "Jallianwala Bagh"] },
      { to: "Dharamshala", km: 475, hrs: "10-11", sedan: "5,950", innova: "9,750", slug: "delhi-to-dharamshala", highlights: ["McLeod Ganj", "Dalai Lama's Abode", "Triund Trek"] },
      { to: "Ludhiana", km: 310, hrs: "5-6", sedan: "3,970", innova: "6,450", slug: "delhi-to-ludhiana", highlights: ["Punjab Heritage", "Gurudwara Dukh Nivaran", "Phillaur Fort"] },
      { to: "Kashmir", km: 820, hrs: "15", sedan: "10,090", innova: "16,650", slug: "delhi-to-kashmir", highlights: ["Dal Lake", "Mughal Gardens", "Gulmarg", "Pahalgam"] },
      { to: "Vaishno Devi", km: 650, hrs: "13", sedan: "8,050", innova: "13,250", slug: "delhi-to-vaishno-devi", highlights: ["Katra Base Camp", "Trikuta Mountains", "Bhavan Shrine"] },
      { to: "Spiti", km: 785, hrs: "14-16", sedan: "9,670", innova: "15,950", slug: "delhi-to-spiti", highlights: ["Key Monastery", "Chandratal Lake", "Pin Valley", "Kaza"] },
    ],
  },
];

function RouteCard({ route }: { route: RouteEntry & { from: string } }) {
  const navigate = useNavigate();
  const lm = getLandmark(route.to);
  return (
    <Link
      to={`/cab/${route.slug}`}
      className="group bg-white rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all duration-300 overflow-hidden block no-underline"
    >
      {/* Landmark thumbnail */}
      <div className="relative aspect-[16/9] overflow-hidden bg-slate-800">
        {lm ? (
          <img
            src={lm.image}
            alt={lm.landmark}
            onError={(e) => { (e.target as HTMLImageElement).src = "/hero-bg.jpg"; }}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            style={{ objectPosition: lm.objectPosition }}
          />
        ) : (
          <div className="absolute inset-0 bg-slate-700" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wide">
            Popular
          </span>
        </div>
        {lm && (
          <div className="absolute bottom-3 left-3 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-white/70" />
            <span className="text-white/80 text-[10px] font-medium">{lm.landmark}</span>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <span>{route.from}</span>
              <ArrowRight className="w-4 h-4 text-blue-500" />
              <span>{route.to}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1"><Route className="w-3 h-3" />{route.km} km</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />~{route.hrs} hrs</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">Sedan from</div>
            <div className="text-lg font-bold text-blue-700">₹{route.sedan}</div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {route.highlights.map((h, j) => (
            <span key={j} className="flex items-center gap-1 text-xs text-slate-600 bg-slate-50 border border-slate-100 px-2 py-1 rounded-full">
              <CheckCircle className="w-2.5 h-2.5 text-blue-500" />{h}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-center mb-4">
          <div className="bg-slate-50 rounded-lg p-2">
            <div className="font-semibold text-slate-800">₹{route.sedan}</div>
            <div className="text-slate-400">Sedan</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-2 border border-blue-100">
            <div className="font-semibold text-blue-800">₹{route.innova}</div>
            <div className="text-blue-500">Innova / SUV</div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-[10px] text-slate-400">Driver charge included · Toll at actuals</span>
          <button
            className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              navigate(`/cars?from=Delhi&to=${route.to}&distance=${route.km}`);
            }}
          >
            Book Now <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </Link>
  );
}

export default function RoutesPage() {
  useSeo({
    title: "Outstation Cab Routes from Delhi — Prices, Distance & Route Guides | EasyOutstation",
    description: "All outstation cab routes from Delhi at fixed fares. Manali, Shimla, Jaipur, Agra, Rishikesh, Haridwar, Nainital, Chandigarh, Amritsar, Jodhpur, Udaipur, Corbett, Lucknow, Varanasi and 30+ more routes. Driver included, toll at actuals.",
    canonical: "https://www.easyoutstation.com/routes",
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="pt-20">
        <div className="bg-white border-b border-slate-100 py-12 px-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">All Routes</p>
          <h1 className="text-3xl font-bold text-slate-900 font-['DM_Serif_Display']">Outstation Routes from Delhi</h1>
          <p className="text-slate-500 mt-2 max-w-xl mx-auto">Fixed fares, no hidden charges. Driver charges included. Toll & parking charged at actuals — whatever is paid on the road, no markup.</p>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12 space-y-14">
          {sections.map((section) => (
            <div key={section.label}>
              <h2 className="text-xl font-bold text-slate-800 font-['DM_Serif_Display'] mb-6 pb-3 border-b border-slate-200">
                {section.label}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {section.routes.map((route) => (
                  <RouteCard key={route.slug} route={{ ...route, from: "Delhi" }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
