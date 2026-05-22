interface LogoIconProps {
  size?: number;
  className?: string;
}

export default function LogoIcon({ size = 36, className = "" }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <radialGradient id="eo-bg" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#1a3a6e" />
          <stop offset="100%" stopColor="#08111f" />
        </radialGradient>
        <radialGradient id="eo-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#2563eb" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="eo-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>

      {/* Background circle */}
      <circle cx="32" cy="32" r="32" fill="url(#eo-bg)" />
      {/* Glow */}
      <circle cx="32" cy="28" r="22" fill="url(#eo-glow)" />

      {/* Road dashes */}
      <line x1="5" y1="42" x2="12" y2="42" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />
      <line x1="52" y1="42" x2="59" y2="42" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.5" />

      {/* Car body */}
      <rect x="9" y="31" width="46" height="13" rx="3" fill="url(#eo-body)" />

      {/* Car roof / cabin */}
      <path d="M17 31 L21.5 21 L42.5 21 L47 31 Z" fill="#60a5fa" />

      {/* Roof highlight */}
      <path d="M18 31 L22 22.5 L31 22.5 L29 31 Z" fill="white" fillOpacity="0.1" />

      {/* Windows */}
      <rect x="23" y="22.5" width="7.5" height="6.5" rx="1" fill="#bfdbfe" fillOpacity="0.88" />
      <rect x="33" y="22.5" width="7.5" height="6.5" rx="1" fill="#bfdbfe" fillOpacity="0.88" />

      {/* Window divider */}
      <rect x="31.5" y="22" width="1.5" height="9" fill="#3b82f6" />

      {/* Body highlight */}
      <rect x="11" y="33" width="42" height="3" rx="1.5" fill="white" fillOpacity="0.09" />

      {/* Headlight */}
      <rect x="51" y="34" width="3" height="5" rx="1" fill="#fef3c7" />

      {/* Left wheels */}
      <circle cx="18.5" cy="44" r="5.5" fill="#0f172a" />
      <circle cx="18.5" cy="44" r="3.2" fill="#94a3b8" />
      <circle cx="18.5" cy="44" r="1.2" fill="#475569" />

      {/* Right wheel */}
      <circle cx="45.5" cy="44" r="5.5" fill="#0f172a" />
      <circle cx="45.5" cy="44" r="3.2" fill="#94a3b8" />
      <circle cx="45.5" cy="44" r="1.2" fill="#475569" />

      {/* Door line */}
      <line x1="32" y1="32" x2="32" y2="44" stroke="white" strokeWidth="0.8" strokeOpacity="0.2" />

      {/* Red location pin (top right) */}
      <circle cx="54" cy="16" r="5" fill="#ef4444" />
      <path d="M51.2 19 L56.8 19 L54 25 Z" fill="#ef4444" />
      <circle cx="54" cy="16" r="2" fill="white" />

      {/* Green start dot (bottom left) */}
      <circle cx="5" cy="42" r="3" fill="#22c55e" />
      <circle cx="5" cy="42" r="1.5" fill="white" fillOpacity="0.6" />
    </svg>
  );
}
