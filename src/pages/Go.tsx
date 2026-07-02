import { MessageCircle, Phone, ExternalLink } from "lucide-react";
import { useSeo } from "@/hooks/useSeo";
import { trpc } from "@/providers/trpc";

const UTM = "?utm_source=instagram&utm_medium=bio&utm_campaign=linkhub";
const WA_URL = `https://wa.me/918796564111?text=${encodeURIComponent("Hi, I want to book an outstation cab from Delhi. Can you help?")}`;

export default function Go() {
  useSeo({
    title: "EasyOutstation — Outstation Cabs from Delhi",
    description: "Fixed-fare outstation cab service from Delhi. Kedarnath, Manali, Shimla, Rishikesh, Jaipur and more. Book now.",
  });

  const { data: cards = [], isLoading } = trpc.admin.getLinkHubCards.useQuery();
  const activeCards = cards.filter(c => c.isActive);

  const resolveUrl = (url: string) => {
    if (url.startsWith("http")) return `${url}${UTM}`;
    return `${url}${UTM}`;
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center px-4 pb-12 pt-10">
      {/* Header */}
      <div className="flex flex-col items-center mb-8 text-center">
        <img
          src="/logo-icon.png"
          alt="EasyOutstation"
          className="w-16 h-16 object-contain mb-4"
          style={{ mixBlendMode: "screen" }}
        />
        <h1 className="text-white text-xl font-bold tracking-tight font-['DM_Serif_Display']">EasyOutstation</h1>
        <p className="text-zinc-400 text-sm mt-1">Outstation cabs from Delhi · Fixed fares</p>
      </div>

      {/* WhatsApp CTA */}
      <a
        href={WA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full max-w-sm mb-6 flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#1ebe5d] active:scale-95 transition-all text-white font-semibold py-3.5 rounded-2xl shadow-lg shadow-green-900/30 text-sm"
      >
        <MessageCircle className="w-4 h-4" />
        Chat &amp; Book on WhatsApp
      </a>

      {/* Card grid */}
      <div className="w-full max-w-sm">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[4/3] rounded-2xl bg-zinc-900 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {activeCards.map(card => (
              <a
                key={card.id}
                href={resolveUrl(card.linkUrl)}
                className="group relative aspect-[4/3] rounded-2xl overflow-hidden block active:scale-95 transition-transform"
              >
                {/* Background image */}
                <img
                  src={card.imageUrl}
                  alt={card.label}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                {/* Label */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-xs font-semibold leading-tight">{card.label}</p>
                  <p className="text-white/60 text-[10px] mt-0.5">Book now →</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* All routes link */}
      <a
        href={`/routes${UTM}`}
        className="mt-6 flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
      >
        <ExternalLink className="w-3 h-3" />
        See all 42 routes
      </a>

      {/* Phone */}
      <a
        href="tel:+918796564111"
        className="mt-3 flex items-center gap-1.5 text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
      >
        <Phone className="w-3 h-3" />
        +91 87965 64111
      </a>

      <p className="mt-8 text-zinc-800 text-[10px]">© EasyOutstation · easyoutstation.com</p>
    </div>
  );
}
