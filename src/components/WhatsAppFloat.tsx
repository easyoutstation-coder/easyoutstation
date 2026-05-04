import { MessageCircle, X } from "lucide-react";
import { useState } from "react";

export default function WhatsAppFloat() {
  const [showTooltip, setShowTooltip] = useState(true);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {showTooltip && (
        <div className="flex items-center gap-2 bg-[#1C1C1C] border border-[#2A2A2A] rounded-xl px-4 py-2.5 shadow-xl animate-slide-up">
          <span className="text-sm text-white">Book via WhatsApp in 30 sec!</span>
          <button onClick={() => setShowTooltip(false)} className="text-[#737373] hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <a
        href="https://wa.me/919958556011?text=Hi%2C%20I%20want%20to%20book%20a%20cab%20from%20Delhi.%20Please%20help%20me."
        target="_blank"
        rel="noopener noreferrer"
        className="w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center shadow-[0_4px_20px_rgba(37,211,102,0.4)] hover:shadow-[0_6px_25px_rgba(37,211,102,0.6)] hover:scale-110 transition-all"
        aria-label="Chat on WhatsApp"
      >
        <MessageCircle className="w-7 h-7 text-white" />
      </a>
    </div>
  );
}
