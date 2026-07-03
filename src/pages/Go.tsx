import { useState } from "react";
import { MessageCircle, Phone, X, ChevronRight, MapPin } from "lucide-react";
import { useSeo } from "@/hooks/useSeo";
import { trpc } from "@/providers/trpc";

const WA_TEXT = encodeURIComponent("Hi, I want to book an outstation cab from Delhi. Can you help?");
const WA_URL = `https://wa.me/918796564111?text=${WA_TEXT}`;

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "hills", label: "Hill Stations" },
  { id: "pilgrimage", label: "Pilgrimage" },
  { id: "rajasthan", label: "Rajasthan" },
  { id: "quick", label: "Quick Trips" },
  { id: "longhaul", label: "Long Haul" },
];

function utmUrl(linkUrl: string, label: string) {
  const dest = linkUrl.split("/").pop()?.split("-to-").pop() ?? label.toLowerCase().replace(/\s/g, "-");
  const base = linkUrl.startsWith("http") ? linkUrl : `https://easyoutstation.com${linkUrl}`;
  return `${base}?utm_source=instagram&utm_medium=organic_social&utm_campaign=ig_hub&utm_content=${dest}`;
}

type Card = {
  id: number; label: string; subtitle?: string | null; imageUrl: string;
  linkUrl: string; category?: string | null; isPinned?: boolean | null;
  displayOrder: number; isActive: boolean;
};

function BottomSheet({ card, onClose }: { card: Card; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-[#1a1a1a] rounded-t-3xl overflow-hidden max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative h-56 shrink-0">
          <img src={card.imageUrl} alt={card.label} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="px-5 pb-8 pt-3 space-y-4">
          <div>
            <h2 className="text-white text-xl font-bold font-['DM_Serif_Display']">{card.label}</h2>
            {card.subtitle && <p className="text-zinc-400 text-sm mt-1">{card.subtitle}</p>}
          </div>
          <a
            href={utmUrl(card.linkUrl, card.label)}
            className="flex items-center justify-between w-full bg-white text-black font-semibold py-3.5 px-5 rounded-2xl text-sm active:scale-95 transition-transform"
          >
            <span>View Fare &amp; Book</span>
            <ChevronRight className="w-4 h-4" />
          </a>
          <a
            href={WA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white font-semibold py-3.5 px-5 rounded-2xl text-sm active:scale-95 transition-transform"
          >
            <MessageCircle className="w-4 h-4" />
            Book on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Go() {
  useSeo({
    title: "EasyOutstation — Outstation Cabs from Delhi",
    description: "Fixed-fare outstation cab service from Delhi. Kedarnath, Manali, Shimla, Rishikesh, Jaipur and more. Book now.",
  });

  const { data: cards = [], isLoading } = trpc.admin.getLinkHubCards.useQuery();
  const [activeCategory, setActiveCategory] = useState("all");
  const [bottomSheet, setBottomSheet] = useState<Card | null>(null);

  const activeCards = (cards as Card[]).filter(c => c.isActive);
  const pinnedCard = activeCards.find(c => c.isPinned);
  const filtered = activeCards.filter(c =>
    activeCategory === "all" ? true : c.category === activeCategory
  );
  const gridCards = filtered.filter(c => !c.isPinned);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-28">
      {/* Profile header */}
      <div className="px-5 pt-10 pb-5">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 p-0.5">
              <div className="w-full h-full rounded-full bg-[#0a0a0a] flex items-center justify-center overflow-hidden">
                <img
                  src="/logo-icon.png"
                  alt="EasyOutstation"
                  className="w-14 h-14 object-contain"
                  style={{ mixBlendMode: "screen" }}
                />
              </div>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-white font-bold text-lg leading-tight font-['DM_Serif_Display']">EasyOutstation</h1>
            <p className="text-zinc-400 text-xs mt-0.5">Outstation Cabs · Delhi NCR</p>
            <div className="flex gap-4 mt-2">
              <div className="text-center">
                <p className="text-white font-bold text-sm">42+</p>
                <p className="text-zinc-500 text-[10px]">Routes</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-sm">4.9★</p>
                <p className="text-zinc-500 text-[10px]">Rating</p>
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-sm">₹0</p>
                <p className="text-zinc-500 text-[10px]">Hidden fees</p>
              </div>
            </div>
          </div>
        </div>
        <p className="text-zinc-400 text-xs mt-3 leading-relaxed">
          Fixed-fare outstation cabs from Delhi. Verified drivers · 24/7 support · No surge pricing.
        </p>
      </div>

      {/* Story highlights / category filter */}
      <div className="flex gap-2.5 px-4 pb-4 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 text-xs font-medium px-3.5 py-1.5 rounded-full border transition-colors ${
              activeCategory === cat.id
                ? "bg-white text-black border-white"
                : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Pinned featured card (only on All tab) */}
      {!isLoading && pinnedCard && activeCategory === "all" && (
        <div className="px-4 mb-3">
          <button
            className="relative w-full h-48 rounded-2xl overflow-hidden block active:scale-[0.98] transition-transform text-left"
            onClick={() => setBottomSheet(pinnedCard)}
          >
            <img src={pinnedCard.imageUrl} alt={pinnedCard.label} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
            <div className="absolute top-3 left-3">
              <span className="bg-white/20 backdrop-blur-sm text-white text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">Featured</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <p className="text-white font-bold text-lg leading-tight font-['DM_Serif_Display']">{pinnedCard.label}</p>
              {pinnedCard.subtitle && <p className="text-white/70 text-xs mt-1">{pinnedCard.subtitle}</p>}
              <span className="mt-2 inline-flex items-center gap-1 bg-white text-black text-xs font-bold px-3 py-1 rounded-full">
                Book Now <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </button>
        </div>
      )}

      {/* 2-column card grid */}
      <div className="px-3">
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-zinc-900 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {gridCards.map(card => (
              <button
                key={card.id}
                className="relative aspect-[3/4] rounded-2xl overflow-hidden block active:scale-[0.97] transition-transform text-left"
                onClick={() => setBottomSheet(card)}
              >
                <img
                  src={card.imageUrl}
                  alt={card.label}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
                  <p className="text-white text-sm font-bold leading-snug">{card.label}</p>
                  {card.subtitle && (
                    <p className="text-white/60 text-[10px] leading-tight line-clamp-2">{card.subtitle}</p>
                  )}
                  <span className="inline-flex items-center bg-white text-black text-xs font-bold px-3 py-1 rounded-full">
                    Book Now →
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center gap-2 mt-8 pb-4">
        <a
          href={`https://easyoutstation.com/routes?utm_source=instagram&utm_medium=organic_social&utm_campaign=ig_hub&utm_content=all_routes`}
          className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
        >
          <MapPin className="w-3 h-3" />
          See all 42+ routes
        </a>
        <p className="text-zinc-800 text-[10px]">© EasyOutstation · easyoutstation.com</p>
      </div>

      {/* Bottom sheet */}
      {bottomSheet && <BottomSheet card={bottomSheet} onClose={() => setBottomSheet(null)} />}

      {/* Sticky bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0a]/95 backdrop-blur-sm border-t border-zinc-800 px-4 py-3 flex gap-2.5">
        <a
          href={WA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 bg-[#25D366] text-white font-semibold py-3 rounded-2xl text-sm active:scale-95 transition-transform"
        >
          <MessageCircle className="w-4 h-4" />
          Chat &amp; Book
        </a>
        <a
          href="tel:+918796564111"
          className="flex items-center justify-center gap-2 bg-zinc-800 text-white font-semibold py-3 px-5 rounded-2xl text-sm active:scale-95 transition-transform"
        >
          <Phone className="w-4 h-4" />
          Call
        </a>
      </div>
    </div>
  );
}
