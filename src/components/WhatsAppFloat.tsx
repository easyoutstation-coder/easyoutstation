import { MessageCircle, X } from "lucide-react";
import { useState, useEffect } from "react";

export default function WhatsAppFloat() {
  const [showTooltip, setShowTooltip] = useState(false);
  const [pulsing, setPulsing] = useState(true);

  useEffect(() => {
    const showTimer = setTimeout(() => setShowTooltip(true), 3000);
    const pulseTimer = setTimeout(() => setPulsing(false), 6000);
    return () => { clearTimeout(showTimer); clearTimeout(pulseTimer); };
  }, []);

  return (
    <div className="fixed bottom-20 right-5 z-40 flex flex-col items-end gap-2 md:bottom-6 md:right-20">
      {/* Tooltip */}
      {showTooltip && (
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-xl animate-slide-up">
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-slate-800">Book in 30 seconds!</span>
            <span className="text-xs text-slate-500">Chat with us on WhatsApp</span>
          </div>
          <button onClick={() => setShowTooltip(false)}
            className="text-slate-400 hover:text-slate-600 ml-1 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Button with pulse ring */}
      <div className="relative">
        {pulsing && (
          <span className="absolute inset-0 rounded-full bg-[#25D366] animate-ping opacity-40" />
        )}
        <a
          href="https://wa.me/918796564111?text=Hi%2C%20I%20want%20to%20book%20a%20cab%20from%20Delhi.%20Can%20you%20help%20me%3F"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setShowTooltip(false)}
          className="relative w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg shadow-green-500/40 hover:scale-110 hover:shadow-green-500/60 transition-all"
          aria-label="Book on WhatsApp"
        >
          <MessageCircle className="w-7 h-7 text-white" />
        </a>
      </div>
    </div>
  );
}
