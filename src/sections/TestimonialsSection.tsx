import { Star, Quote, CheckCircle } from "lucide-react";

const testimonials = [
  {
    name: "Rahul Sharma",
    location: "Delhi",
    rating: 5,
    text: "Booked Innova Crysta for Manali. Driver was 10 mins early, knew all the scenic stops, car was spotless. Total came to exactly what was quoted — not a rupee more. Never going back to Ola for outstation.",
    car: "Toyota Innova Crysta",
    route: "Delhi → Manali",
    verified: true,
    date: "March 2026",
  },
  {
    name: "Priya Patel",
    location: "Noida",
    rating: 5,
    text: "Used for Delhi-Jaipur-Delhi round trip. The pricing transparency alone made me choose them. My friends got burned by hidden charges on another app. We paid exactly ₹7,200 as quoted. Superb!",
    car: "Maruti Ertiga",
    route: "Delhi → Jaipur",
    verified: true,
    date: "February 2026",
  },
  {
    name: "Amit Kumar",
    location: "Gurugram",
    rating: 5,
    text: "First time to Manali and I was nervous about mountain roads. The driver was a 15-year veteran on that route. Felt safer than I've felt in any cab. The Hycross is a beast on hills — pure luxury.",
    car: "Innova Hycross",
    route: "Delhi → Manali",
    verified: true,
    date: "January 2026",
  },
  {
    name: "Sneha Gupta",
    location: "Delhi",
    rating: 5,
    text: "Corporate trip for 6 people to Rishikesh. Booked in under 2 minutes. Car arrived 15 minutes before time. My CEO specifically asked me who I booked through — that's the kind of impression this service made.",
    car: "Toyota Innova",
    route: "Delhi → Rishikesh",
    verified: true,
    date: "April 2026",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-24 bg-[#1C1C1C] relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="flex items-center justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 text-[#D4AF37] fill-[#D4AF37]" />
            ))}
            <span className="ml-2 text-sm text-[#BFBFBF]">4.9/5 from 2,400+ trips</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4 font-['Playfair_Display']">
            Real Travelers. Real Stories.
          </h2>
          <p className="text-[#BFBFBF]">
            Not paid testimonials. Not stock photos. Real reviews from verified bookings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((t, i) => (
            <div key={i}
              className="bg-[#0B0B0B] rounded-2xl p-6 border border-[#2A2A2A] hover:border-[#D4AF37]/20 transition-all duration-300 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
              {/* Stars */}
              <div className="flex items-center gap-1 mb-4">
                {[...Array(t.rating)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-[#D4AF37] fill-[#D4AF37]" />
                ))}
              </div>

              {/* Quote */}
              <div className="relative mb-6">
                <Quote className="absolute -top-1 -left-1 w-8 h-8 text-[#D4AF37]/20" />
                <p className="text-[#BFBFBF] text-sm leading-relaxed pl-6 italic">"{t.text}"</p>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-[#2A2A2A]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#D4AF37]/15 flex items-center justify-center">
                    <span className="text-sm font-bold text-[#D4AF37]">
                      {t.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-white">{t.name}</span>
                      {t.verified && <CheckCircle className="w-3.5 h-3.5 text-[#D4AF37]" />}
                    </div>
                    <span className="text-xs text-[#737373]">{t.location} · {t.date}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-[#D4AF37]">{t.route}</div>
                  <div className="text-xs text-[#737373]">{t.car}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12">
          <p className="text-[#737373] text-sm">Join 15,000+ travelers who've trusted us for their outstation journeys</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="flex -space-x-2">
              {["RK", "PP", "AK", "SG", "MV"].map((initials, i) => (
                <div key={i} className="w-8 h-8 rounded-full bg-[#D4AF37]/20 border-2 border-[#1C1C1C] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-[#D4AF37]">{initials}</span>
                </div>
              ))}
            </div>
            <span className="text-sm text-[#BFBFBF] ml-1">+14,995 happy travelers</span>
          </div>
        </div>
      </div>
    </section>
  );
}
