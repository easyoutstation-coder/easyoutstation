interface LogoIconProps {
  size?: number;
  className?: string;
}

export default function LogoIcon({ size = 36, className = "" }: LogoIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 60 62"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left mountain */}
      <polygon points="0,49 20,15 46,49" fill="white" fillOpacity="0.95" />
      {/* Left mountain — right-face shadow for depth */}
      <polygon points="20,15 46,49 33,49" fill="#0d1a30" fillOpacity="0.18" />
      {/* Left snow cap */}
      <polygon points="15,26 20,15 25,26" fill="white" />

      {/* Right mountain */}
      <polygon points="16,49 41,19 60,49" fill="white" fillOpacity="0.88" />
      {/* Right mountain — left-face shadow */}
      <polygon points="41,19 16,49 29,49" fill="#0d1a30" fillOpacity="0.18" />
      {/* Right snow cap */}
      <polygon points="36,30 41,19 46,30" fill="white" />

      {/* Orange road — perspective trapezoid, tip meets pin bottom */}
      <polygon points="20,57 40,57 33.5,40 26.5,40" fill="#f97316" />
      {/* Road center dashes */}
      <rect x="29" y="42" width="2" height="3.5" rx="1" fill="white" fillOpacity="0.9" />
      <rect x="29" y="47" width="2" height="3.5" rx="1" fill="white" fillOpacity="0.9" />
      <rect x="29" y="52" width="2" height="3.5" rx="1" fill="white" fillOpacity="0.9" />

      {/* Orange pin — classic teardrop */}
      <path
        d="M30,41 C21,33.5 17,26.5 17,20 A13,13 0 1,1 43,20 C43,26.5 39,33.5 30,41 Z"
        fill="#f97316"
      />
      {/* Pin highlight (top-left gloss) */}
      <path
        d="M22,14 C24,10 28,8 32,8"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
      {/* Pin hole — dark so it reads as a hole on any dark bg */}
      <circle cx="30" cy="19.5" r="5.5" fill="#0f1e36" />
    </svg>
  );
}
