// Sertifikat bezaklari — sof SVG, tashqi kutubxonasiz.
//
// Motiv: sakkiz burchakli yulduz va uning ichki geometriyasi. Bu shakl
// o'zbek ganch va koshin naqshlarining asosi — sertifikatga mahalliy
// xarakter beradi, lekin qat'iy geometrik bo'lgani uchun rasmiy hujjat
// ohangini buzmaydi.
//
// Barcha shakllar `currentColor` bilan chiziladi — rangni ota element beradi.

// Burchak gulchambar: sakkiz burchakli yulduz + ichma-ich kvadratlar
export function CornerOrnament({ size = 64, className = '', rotate = 0 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {/* Ikkita burchak chizig'i — "o'yilgan" hoshiya taassuroti */}
      <path d="M2 20V6a4 4 0 0 1 4-4h14" stroke="currentColor" strokeWidth="1.6" />
      <path d="M7 22V11a4 4 0 0 1 4-4h11" stroke="currentColor" strokeWidth="0.9" opacity="0.65" />
      {/* Sakkiz burchakli yulduz — ikkita kvadratning ustma-ust qo'yilishi */}
      <g transform="translate(30 30)" stroke="currentColor" fill="none">
        <rect x="-9" y="-9" width="18" height="18" strokeWidth="1.1" />
        <rect x="-9" y="-9" width="18" height="18" strokeWidth="1.1" transform="rotate(45)" />
        <circle r="3.2" strokeWidth="0.9" opacity="0.7" />
      </g>
    </svg>
  );
}

// Bo'luvchi: markazda yulduz, ikki yonida ingichka chiziq
export function Divider({ className = '' }) {
  return (
    <svg
      width="180"
      height="16"
      viewBox="0 0 180 16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <line x1="0" y1="8" x2="66" y2="8" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="114" y1="8" x2="180" y2="8" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <g transform="translate(90 8)" stroke="currentColor" fill="none">
        <rect x="-5" y="-5" width="10" height="10" strokeWidth="1.1" />
        <rect x="-5" y="-5" width="10" height="10" strokeWidth="1.1" transform="rotate(45)" />
      </g>
    </svg>
  );
}

// Muhr — konsentrik halqalar, sakkiz burchakli yulduz va aylana bo'ylab yozuv
export function Seal({ size = 104, text = 'USTOZ · TASDIQLANGAN · ', id = 'seal' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" aria-hidden="true">
      <defs>
        <path id={`${id}-arc`} d="M60 60 m -44 0 a 44 44 0 1 1 88 0 a 44 44 0 1 1 -88 0" />
      </defs>
      <circle cx="60" cy="60" r="56" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <circle cx="60" cy="60" r="37" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="60" cy="60" r="34" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />

      {/* Aylana bo'ylab matn */}
      <text fill="currentColor" fontSize="7.4" letterSpacing="2.6" fontWeight="600">
        <textPath href={`#${id}-arc`} startOffset="0">{text.repeat(2)}</textPath>
      </text>

      {/* Markaziy yulduz */}
      <g transform="translate(60 60)" stroke="currentColor" fill="none">
        <rect x="-15" y="-15" width="30" height="30" strokeWidth="1.3" />
        <rect x="-15" y="-15" width="30" height="30" strokeWidth="1.3" transform="rotate(45)" />
        <rect x="-8" y="-8" width="16" height="16" strokeWidth="0.9" opacity="0.75" transform="rotate(22.5)" />
        <circle r="3" fill="currentColor" stroke="none" opacity="0.85" />
      </g>
    </svg>
  );
}

// Fon naqshi — juda past kontrastli takrorlanuvchi panjara ("guilloche")
export function GuillochePattern({ id = 'guilloche' }) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden="true"
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id={id} width="36" height="36" patternUnits="userSpaceOnUse">
          <g stroke="currentColor" fill="none" strokeWidth="0.6">
            <rect x="9" y="9" width="18" height="18" />
            <rect x="9" y="9" width="18" height="18" transform="rotate(45 18 18)" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
