import { MessageCircle, X } from "lucide-react";
import { useState } from "react";

export default function WhatsAppFloat() {
  const [showTooltip, setShowTooltip] = useState(true);

  return (
    // On mobile: above the chatbot (bottom-24)
    // On desktop: next to chatbot — offset right by 72px (chatbot width + gap)
    <div className="fixed bottom-6 right-20 z-40 flex flex-col items-end gap-2">
      {showTooltip && (
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-lg">
          <span className="text-sm text-slate-700 font-medium">Book in 30 sec!</span>
          <button onClick={() => setShowTooltip(false)} className="text-slate-400 hover:text-slate-600 ml-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <a
        href="https://wa.me/919958556011?text=Hi%2C%20I%20want%20to%20book%20a%20cab%20from%20Delhi."
        target="_blank"
        rel="noopener noreferrer"
        className="w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg shadow-green-500/30 hover:scale-110 transition-all"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle className="w-7 h-7 text-white" />
      </a>
    </div>
  );
}
