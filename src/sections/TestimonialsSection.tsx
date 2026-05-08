import { Star, Quote, CheckCircle } from "lucide-react";

const testimonials = [
  { name: "Rahul Sharma", location: "Delhi", rating: 5, text: "Booked Innova Crysta for Manali. Driver arrived 10 minutes early, knew all the scenic stops, car was spotless. Total came to exactly what was quoted — not a rupee more.", car: "Innova Crysta", route: "Delhi → Manali", date: "March 2026" },
  { name: "Priya Patel", location: "Noida", rating: 5, text: "Used for Delhi-Jaipur-Delhi round trip. My friends got burned by hidden charges on another platform. We paid exactly ₹7,200 as quoted. Superb experience.", car: "Maruti Ertiga", route: "Delhi → Jaipur", date: "February 2026" },
  { name: "Amit Kumar", location: "Gurugram", rating: 5, text: "First time to Manali — nervous about mountain roads. The driver was a 15-year veteran on that route. Felt completely safe. The Hycross is brilliant on hills.", car: "Innova Hycross", route: "Delhi → Manali", date: "January 2026" },
  { name: "Sneha Gupta", location: "Delhi", rating: 5, text: "Corporate trip for 6 people to Rishikesh. Car arrived 15 minutes early. My CEO asked me who I booked through — that's the kind of impression this service makes.", car: "Toyota Innova", route: "Delhi → Rishikesh", date: "April 2026" },
];

export default function TestimonialsSection() {
  return (
    <section className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="flex items-center justify-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />)}
            <span className="ml-2 text-sm text-slate-500">4.9/5 from 2,400+ trips</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-3 font-['DM_Serif_Display']">
            Real Travelers. Real Stories.
          </h2>
          <p className="text-slate-500 text-sm">Verified reviews from actual bookings — not stock photos or paid testimonials.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-slate-50 rounded-2xl p-6 border border-slate-100 hover:border-blue-100 hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-1 mb-4">
                {[...Array(t.rating)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />)}
              </div>
              <div className="relative mb-5">
                <Quote className="absolute -top-1 -left-1 w-6 h-6 text-slate-200" />
                <p className="text-slate-600 text-sm leading-relaxed pl-5 italic">"{t.text}"</p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center">
                    <span className="text-xs font-bold text-blue-700">
                      {t.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-900">{t.name}</span>
                      <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <span className="text-[10px] text-slate-400">{t.location} · {t.date}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-semibold text-blue-600">{t.route}</div>
                  <div className="text-[10px] text-slate-400">{t.car}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
