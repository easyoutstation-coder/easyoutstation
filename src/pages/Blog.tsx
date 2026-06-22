import { Link } from "react-router";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSeo } from "@/hooks/useSeo";
import { blogPosts } from "@/data/blogPosts";
import { getLandmark } from "@/data/routeImages";
import { Clock, ArrowRight, MapPin } from "lucide-react";
export default function Blog() {
  useSeo({
    title: "Travel Guides & Road Trip Itineraries | EasyOutstation Blog",
    description: "Delhi outstation travel guides, road trip itineraries, and destination guides for Manali, Kashmir, Jaipur, Varanasi, Rishikesh and more. Plan your trip with expert tips.",
    canonical: "https://www.easyoutstation.com/blog",
    schema: {
      "@type": "Blog",
      "name": "EasyOutstation Travel Guides",
      "description": "Outstation travel guides and road trip itineraries from Delhi",
      "url": "https://www.easyoutstation.com/blog",
      "publisher": {
        "@type": "Organization",
        "name": "EasyOutstation",
        "url": "https://www.easyoutstation.com",
      },
    },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="pt-20">
        {/* Header */}
        <div className="bg-white border-b border-slate-100 py-12 px-4 text-center">
          <p className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">Travel Guides</p>
          <h1 className="text-3xl font-bold text-slate-900 font-['DM_Serif_Display']">
            Road Trip Guides from Delhi
          </h1>
          <p className="text-slate-500 mt-2 max-w-lg mx-auto text-sm">
            Day-by-day itineraries, cab fares, best time to visit, and road tips for every route we serve.
          </p>
        </div>

        {/* Grid */}
        <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogPosts.map((post) => {
                const lm = getLandmark(post.heroKey);
                return (
                  <Link
                    key={post.slug}
                    to={`/blog/${post.slug}`}
                    className="group bg-white rounded-2xl border border-slate-100 hover:border-blue-200 overflow-hidden block"
                  >
                    {/* Image */}
                    <div className="relative h-48 overflow-hidden bg-slate-800">
                      {lm && (
                        <img
                          src={lm.image}
                          alt={lm.landmark}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          style={{ objectPosition: lm.objectPosition }}
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).src = "/hero-bg.jpg"; }}
                        />
                      )}
                      {!lm && <div className="absolute inset-0 bg-slate-700" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-slate-900/20 to-transparent" />
                      <div className="absolute top-3 left-3">
                        <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wide">
                          {post.category}
                        </span>
                      </div>
                      {lm && (
                        <div className="absolute bottom-3 left-3 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-white/70" />
                          <span className="text-white/80 text-[10px] font-medium">{lm.landmark}</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h2 className="text-sm font-bold text-slate-900 leading-snug mb-2 group-hover:text-blue-700 transition-colors line-clamp-2">
                        {post.title}
                      </h2>
                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-4">
                        {post.metaDescription}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          {post.readTime} min read
                        </div>
                        <span className="text-xs font-semibold text-blue-600 group-hover:underline flex items-center gap-1">
                          Read Guide <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
