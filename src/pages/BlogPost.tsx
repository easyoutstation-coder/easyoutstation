import { useParams, useNavigate, Link } from "react-router";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useSeo } from "@/hooks/useSeo";
import { blogPosts } from "@/data/blogPosts";
import { getLandmark } from "@/data/routeImages";
import { Clock, MapPin, ArrowRight, Calendar, CheckCircle, Car, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const post = blogPosts.find((p) => p.slug === slug);
  const lm = getLandmark(post?.heroKey ?? "");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useSeo({
    title: post?.title ?? "Travel Guide | EasyOutstation",
    description: post?.metaDescription ?? "Outstation travel guide from Delhi.",
    canonical: `https://www.easyoutstation.com/blog/${slug ?? ""}`,
    ogImage: lm?.image,
    schema: post ? [
      {
        "@type": "Article",
        "headline": post.title,
        "description": post.metaDescription,
        "author": { "@type": "Organization", "name": "EasyOutstation" },
        "publisher": {
          "@type": "Organization",
          "name": "EasyOutstation",
          "url": "https://www.easyoutstation.com",
          "logo": { "@type": "ImageObject", "url": "https://www.easyoutstation.com/logo.png" },
        },
        "datePublished": post.publishDate,
        "image": lm?.image,
        "mainEntityOfPage": `https://www.easyoutstation.com/blog/${slug}`,
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://www.easyoutstation.com/" },
          { "@type": "ListItem", "position": 2, "name": "Blog", "item": "https://www.easyoutstation.com/blog" },
          { "@type": "ListItem", "position": 3, "name": post.title, "item": `https://www.easyoutstation.com/blog/${slug}` },
        ],
      },
      {
        "@type": "FAQPage",
        "mainEntity": post.faqs.map((faq) => ({
          "@type": "Question",
          "name": faq.q,
          "acceptedAnswer": { "@type": "Answer", "text": faq.a },
        })),
      },
    ] : undefined,
  });

  if (!post) {
    navigate("/blog");
    return null;
  }

  const bookingUrl = `/cars?from=${encodeURIComponent(post.route.from)}&to=${encodeURIComponent(post.route.to)}&distance=${post.route.distance}`;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-20">

        {/* Hero */}
        <div className="relative overflow-hidden bg-slate-900">
          {lm && (
            <img
              src={lm.image}
              alt={lm.landmark}
              className="w-full object-cover"
              style={{ height: "clamp(280px, 50vw, 500px)", objectPosition: lm.objectPosition }}
              fetchPriority="high"
              onError={(e) => { (e.target as HTMLImageElement).src = "/hero-bg.jpg"; }}
            />
          )}
          {!lm && <div style={{ height: "clamp(280px, 50vw, 500px)" }} />}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/40 via-slate-900/50 to-slate-900/85" />
          <div className="absolute inset-0 flex items-end px-4 pb-10">
            <div className="max-w-3xl mx-auto w-full">
              <div className="flex items-center gap-2 mb-3">
                <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wide">
                  {post.category}
                </span>
                <span className="flex items-center gap-1 text-white/70 text-xs">
                  <Clock className="w-3 h-3" /> {post.readTime} min read
                </span>
              </div>
              <h1 className="text-2xl md:text-4xl font-bold text-white font-['DM_Serif_Display'] leading-tight mb-3">
                {post.title}
              </h1>
              {lm && (
                <div className="flex items-center gap-1 text-white/60 text-xs">
                  <MapPin className="w-3 h-3" /> {lm.landmark}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="bg-slate-50 border-b border-slate-100 py-3 px-4">
          <div className="max-w-3xl mx-auto flex items-center gap-2 text-xs text-slate-500">
            <Link to="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <ArrowRight className="w-3 h-3" />
            <Link to="/blog" className="hover:text-blue-600 transition-colors">Blog</Link>
            <ArrowRight className="w-3 h-3" />
            <span className="text-slate-700 truncate max-w-xs">{post.route.from} to {post.route.to}</span>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-10">

          {/* Quick facts strip */}
          <div className="flex flex-wrap gap-4 mb-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="text-xs">
              <div className="text-slate-500">Distance</div>
              <div className="font-semibold text-slate-800">{post.route.distance} km</div>
            </div>
            <div className="text-xs">
              <div className="text-slate-500">Drive Time</div>
              <div className="font-semibold text-slate-800">{post.route.duration}</div>
            </div>
            <div className="text-xs">
              <div className="text-slate-500">Sedan from</div>
              <div className="font-semibold text-blue-700">₹{post.route.sedan}</div>
            </div>
            <div className="text-xs">
              <div className="text-slate-500">Innova from</div>
              <div className="font-semibold text-blue-700">₹{post.route.innova}</div>
            </div>
            <div className="text-xs">
              <div className="text-slate-500">Best Time</div>
              <div className="font-semibold text-slate-800">{post.bestTime.period}</div>
            </div>
          </div>

          {/* Intro */}
          <p className="text-base text-slate-700 leading-relaxed mb-10 max-w-2xl">{post.intro}</p>

          {/* Fare Card + CTA */}
          <div className="bg-slate-900 rounded-2xl p-6 mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-white/60 text-xs uppercase tracking-widest mb-1">Cab Fare — {post.route.from} to {post.route.to}</div>
              <div className="flex items-center gap-6 mt-2">
                <div>
                  <div className="text-white/50 text-[10px]">Sedan (Dzire)</div>
                  <div className="text-2xl font-bold text-white">₹{post.route.sedan}</div>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div>
                  <div className="text-white/50 text-[10px]">Innova / SUV</div>
                  <div className="text-2xl font-bold text-white">₹{post.route.innova}</div>
                </div>
              </div>
              <div className="text-white/40 text-[10px] mt-2">Driver charges included · Toll & parking at actuals</div>
            </div>
            <Link
              to={bookingUrl}
              className="shrink-0 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all flex items-center gap-2"
            >
              <Car className="w-4 h-4" />
              Book This Cab
            </Link>
          </div>

          {/* Best Time */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 font-['DM_Serif_Display'] mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Best Time to Visit
            </h2>
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <div className="text-sm font-semibold text-green-800 mb-1">{post.bestTime.period}</div>
              <p className="text-sm text-slate-600 leading-relaxed">{post.bestTime.description}</p>
            </div>
          </section>

          {/* Itinerary */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 font-['DM_Serif_Display'] mb-5">
              Day-by-Day Itinerary
            </h2>
            <div className="space-y-4">
              {post.itinerary.map((day) => (
                <div key={day.day} className="flex gap-4">
                  <div className="shrink-0 flex flex-col items-center">
                    <div className="w-9 h-9 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">
                      {day.day}
                    </div>
                    {post.itinerary.length > day.day && (
                      <div className="w-px flex-1 bg-blue-100 mt-2" />
                    )}
                  </div>
                  <div className="pb-6 flex-1">
                    <div className="font-semibold text-slate-900 mb-2 text-sm">{day.title}</div>
                    <ul className="space-y-1.5">
                      {day.activities.map((activity, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                          <CheckCircle className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />
                          {activity}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Places to Visit */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 font-['DM_Serif_Display'] mb-5 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              Places to Visit
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {post.placesToVisit.map((place) => (
                <div key={place.name} className="p-4 bg-slate-50 rounded-xl border border-slate-100 cursor-default">
                  <div className="font-semibold text-slate-900 text-sm mb-1">{place.name}</div>
                  <p className="text-xs text-slate-500 leading-relaxed">{place.description}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Road Tips */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 font-['DM_Serif_Display'] mb-4">
              Road Tips
            </h2>
            <div className="space-y-2">
              {post.roadTips.map((tip, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                  <span className="text-amber-500 text-sm font-bold shrink-0">→</span>
                  <p className="text-sm text-slate-700">{tip}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQs */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 font-['DM_Serif_Display'] mb-4">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {post.faqs.map((faq, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-medium text-slate-900 text-sm">{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ml-3 ${openFaq === i ? "rotate-180" : ""}`} />
                  </button>
                  {openFaq === i && (
                    <div className="px-5 pb-4">
                      <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Bottom CTA */}
          <div className="bg-slate-900 rounded-2xl p-7 text-center">
            <div className="relative">
              <h3 className="text-white font-bold text-lg font-['DM_Serif_Display'] mb-2">
                Ready to Book Your {post.route.from} to {post.route.to} Cab?
              </h3>
              <p className="text-slate-400 text-sm mb-5">
                Sedan from ₹{post.route.sedan} · Innova from ₹{post.route.innova} · Driver charges included
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  to={bookingUrl}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition-all"
                >
                  Book Cab Now →
                </Link>
                <Link
                  to={`/cab/${post.route.routeSlug}`}
                  className="px-6 py-3 bg-white/10 text-white font-semibold rounded-xl text-sm hover:bg-white/20 transition-all border border-white/20"
                >
                  View Route Details
                </Link>
              </div>
            </div>
          </div>

          {/* More guides */}
          <div className="mt-12">
            <h3 className="text-lg font-bold text-slate-900 font-['DM_Serif_Display'] mb-5">More Travel Guides</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {blogPosts
                .filter((p) => p.slug !== post.slug)
                .slice(0, 4)
                .map((related) => {
                  const rlm = getLandmark(related.heroKey);
                  return (
                    <Link
                      key={related.slug}
                      to={`/blog/${related.slug}`}
                      className="group flex gap-3 p-3 bg-slate-50 rounded-xl hover:bg-blue-50 transition-colors border border-slate-100 hover:border-blue-200"
                    >
                      <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-slate-300">
                        {rlm && (
                          <img
                            src={rlm.image}
                            alt={rlm.landmark}
                            className="w-full h-full object-cover"
                            style={{ objectPosition: rlm.objectPosition }}
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).src = "/hero-bg.jpg"; }}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-800 leading-snug line-clamp-2 group-hover:text-blue-700 transition-colors">
                          {related.title}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">{related.readTime} min read</div>
                      </div>
                    </Link>
                  );
                })}
            </div>
            <div className="mt-4 text-center">
              <Link to="/blog" className="text-sm text-blue-600 font-medium hover:underline">
                View all travel guides →
              </Link>
            </div>
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
