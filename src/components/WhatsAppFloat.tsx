import { X } from "lucide-react";
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
          className="eo-wa-pulse relative w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg shadow-green-500/40 hover:scale-110 hover:shadow-green-500/60 transition-all"
          aria-label="Book on WhatsApp"
        >
          <svg viewBox="0 0 32 32" className="w-8 h-8" fill="white" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M16 2C8.268 2 2 8.268 2 16c0 2.492.651 4.835 1.792 6.86L2 30l7.34-1.768A13.94 13.94 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm0 25.5a11.44 11.44 0 0 1-5.823-1.592l-.418-.248-4.354 1.05 1.082-4.23-.272-.434A11.46 11.46 0 0 1 4.5 16C4.5 9.649 9.649 4.5 16 4.5S27.5 9.649 27.5 16 22.351 27.5 16 27.5zm6.29-8.61c-.344-.172-2.036-1.004-2.352-1.118-.317-.115-.547-.172-.777.172-.23.344-.891 1.118-1.092 1.348-.2.23-.402.258-.746.086-.344-.172-1.452-.535-2.766-1.707-1.022-.912-1.712-2.038-1.912-2.382-.2-.344-.021-.530.15-.701.155-.155.344-.402.516-.603.172-.2.23-.344.344-.574.115-.23.057-.431-.029-.603-.086-.172-.777-1.874-1.065-2.566-.28-.674-.566-.583-.777-.594l-.661-.011c-.23 0-.603.086-.919.431-.317.344-1.206 1.178-1.206 2.873s1.235 3.332 1.407 3.562c.172.23 2.43 3.71 5.888 5.205.823.355 1.465.567 1.966.726.826.263 1.578.226 2.172.137.662-.099 2.036-.832 2.323-1.635.287-.803.287-1.491.2-1.635-.086-.143-.316-.23-.66-.402z"/>
          </svg>
        </a>
      </div>
    </div>
  );
}
