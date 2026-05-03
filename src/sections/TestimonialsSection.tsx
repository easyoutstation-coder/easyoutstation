import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Rahul Sharma",
    location: "Delhi",
    rating: 5,
    text: "Booked the Innova Crysta for our family trip to Manali. The driver was extremely professional and knew all the scenic spots. The car was spotless and comfortable. Highly recommended!",
    car: "Toyota Innova Crysta",
    route: "Delhi to Manali",
  },
  {
    name: "Priya Patel",
    location: "Mumbai",
    rating: 5,
    text: "Used EasyOutstation for our Delhi-Jaipur-Delhi round trip. Transparent pricing, no hidden charges. The Ertiga was perfect for our group of 5. Will definitely book again.",
    car: "Maruti Ertiga",
    route: "Delhi to Jaipur",
  },
  {
    name: "Amit Kumar",
    location: "Bangalore",
    rating: 5,
    text: "First time visiting Manali and I'm glad I chose EasyOutstation. The driver was an expert on mountain roads. Felt safe throughout the journey. The Hycross is a beast on hills!",
    car: "Toyota Innova Hycross",
    route: "Delhi to Manali",
  },
  {
    name: "Sneha Gupta",
    location: "Noida",
    rating: 5,
    text: "Corporate trip for 6 people to Rishikesh. Booking was seamless, car arrived on time, and the driver was courteous. The GPS tracking feature gave us peace of mind.",
    car: "Toyota Innova",
    route: "Delhi to Rishikesh",
  },
];

export default function TestimonialsSection() {
  return (
    <section className="py-20 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 font-['Playfair_Display']">
            What Travelers Say
          </h2>
          <p className="text-muted-foreground">
            Real experiences from real travelers who chose EasyOutstation for their journeys.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 shadow-sm border border-border hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">
                    {t.name.split(" ").map((n) => n[0]).join("")}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">{t.name}</h4>
                  <p className="text-xs text-muted-foreground">{t.location}</p>
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-primary fill-primary" />
                  ))}
                </div>
              </div>
              <div className="relative">
                <Quote className="absolute -top-1 -left-1 w-6 h-6 text-primary/10" />
                <p className="text-sm text-muted-foreground leading-relaxed pl-4">
                  {t.text}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-border flex items-center gap-3 text-xs text-muted-foreground">
                <span className="px-2 py-1 rounded-md bg-muted">{t.car}</span>
                <span className="px-2 py-1 rounded-md bg-muted">{t.route}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
