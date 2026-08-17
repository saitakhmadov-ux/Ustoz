// Kurs muqovasi — rasmsiz kurslar uchun generativ (deterministik) qopqoq.
//
// Nega kerak: kurs rasmi bo'lmasa karta o'rnida kulrang bo'shliq va bitta
// `PlayCircle` ikonkasi turardi — o'lik joy. Bu yerda muqova kurs `slug`idan
// hisoblanadi: bir xil kurs har doim bir xil muqovani oladi (SSR va klientda
// mos keladi), lekin turli kurslar turlicha ko'rinadi.
//
// Motiv sertifikatdagi bilan bir xil — sakkiz burchakli yulduz (`components/
// certificate/ornaments.jsx`), shuning uchun muqovalar sayt bilan bitta
// vizual tilda gaplashadi.
//
// Ranglar CSS o'zgaruvchisi emas, qat'iy hex: muqova — brend bandi, u ikkala
// temada ham TO'Q qoladi (`--band-*` bilan bir mantiq), shu tufayli ustidagi
// oq matn har doim o'qiladi.

// FNV-1a — qisqa, tashqi kutubxonasiz, barqaror 32-bitli xesh.
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Bitlarni aralashtirish (murmur3 "avalanche"). FNV natijasining past bitlari
// zaif — `seed % 5` deyilsa palitralarning bir qismi umuman tanlanmaydi.
// Har bir tanlov o'z "tuzi" bilan qayta aralashtiriladi.
function mix(h) {
  let x = h >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 2246822507);
  x ^= x >>> 13;
  x = Math.imul(x, 3266489909);
  x ^= x >>> 16;
  return x >>> 0;
}

// Ro'yxatdan deterministik tanlov — bir xil (seed, salt) har doim bir xil
// natija beradi, shuning uchun serverda va klientda mos keladi.
function pick(seed, salt, arr) {
  return arr[mix(seed ^ Math.imul(salt + 1, 0x9e3779b1)) % arr.length];
}

// Brendga mos gradient juftliklari — hammasi sovuq va to'q, oq matn uchun.
const PALETTES = [
  ['#6366f1', '#3730a3'], // indigo-500 → indigo-800
  ['#4f46e5', '#1e1b4b'], // indigo-600 → siyoh ko'k
  ['#059669', '#065f46'], // emerald-600 → emerald-800
  ['#7c3aed', '#4338ca'], // violet-600 → indigo-700
  ['#047857', '#1e1b4b'], // emerald-700 → siyoh ko'k
];

// Gradient yo'nalishi
const ANGLES = [
  { x1: 0, y1: 0, x2: 1, y2: 1 },
  { x1: 0, y1: 0, x2: 1, y2: 0 },
  { x1: 0, y1: 1, x2: 1, y2: 0 },
];

const TILES = [28, 34, 42]; // naqsh panjarasining qadami
const ROTATIONS = [0, 22.5, 45]; // yulduz moduli burilishi
const MEDALLIONS = [122, 152, 184]; // katta yulduz o'lchami
const MED_Y = [40, 64, 88, 112, 136]; // medalyon markazining balandligi

// Sarlavhadan 1–2 harfli monogramma. O'zbekcha `o'`/`g'` apostrofi harfdan
// keyin kelgani uchun birinchi belgi olinsa yetarli ("O'zbek" → "O").
//
// Faqat HARF bilan boshlanadigan so'zlar hisobga olinadi: "JavaScript —
// boshlang'ich kurs" kabi sarlavhada tire alohida so'z bo'lib, monogramma
// "J—" bo'lib qolardi.
function monogramOf(title = '') {
  const words = String(title)
    .trim()
    .split(/\s+/)
    .filter((w) => /^[\p{L}\p{N}]/u.test(w));
  if (!words.length) return 'U';
  return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

export default function CourseCover({ title = '', slug = '', className = '' }) {
  const seed = hashString(slug || title || 'ustoz');
  const [from, to] = pick(seed, 0, PALETTES);
  const angle = pick(seed, 1, ANGLES);
  const tile = pick(seed, 2, TILES);
  const rot = pick(seed, 3, ROTATIONS);
  const medallion = pick(seed, 4, MEDALLIONS);
  const medY = pick(seed, 5, MED_Y);
  const mono = monogramOf(title);

  // Bir sahifada ko'p muqova bo'ladi — `defs` id'lari to'qnashmasligi kerak.
  const uid = `cc${seed.toString(36)}`;
  const half = tile / 2;
  const box = tile * 0.5; // yulduzni tashkil etuvchi kvadrat tomoni

  return (
    <svg
      viewBox="0 0 320 180"
      preserveAspectRatio="xMidYMid slice"
      className={`h-full w-full ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`${uid}-g`} x1={angle.x1} y1={angle.y1} x2={angle.x2} y2={angle.y2}>
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>

        {/* Yumshoq yorug'lik — tekis gradientga chuqurlik beradi */}
        <radialGradient id={`${uid}-glow`} cx="0.22" cy="0.18" r="0.9">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>

        {/* Naqsh: ikkita ustma-ust kvadrat = sakkiz burchakli yulduz */}
        <pattern id={`${uid}-p`} width={tile} height={tile} patternUnits="userSpaceOnUse">
          <g
            transform={`translate(${half} ${half}) rotate(${rot})`}
            stroke="#ffffff"
            fill="none"
            strokeWidth="0.9"
            opacity="0.22"
          >
            <rect x={-box / 2} y={-box / 2} width={box} height={box} />
            <rect x={-box / 2} y={-box / 2} width={box} height={box} transform="rotate(45)" />
          </g>
        </pattern>
      </defs>

      <rect width="320" height="180" fill={`url(#${uid}-g)`} />
      <rect width="320" height="180" fill={`url(#${uid}-p)`} />
      <rect width="320" height="180" fill={`url(#${uid}-glow)`} />

      {/* Katta medalyon — chetdan chiqib ketadi, SVG uni o'zi qirqadi */}
      <g
        transform={`translate(262 ${medY})`}
        stroke="#ffffff"
        fill="none"
        opacity="0.3"
      >
        <rect
          x={-medallion / 2}
          y={-medallion / 2}
          width={medallion}
          height={medallion}
          strokeWidth="1.4"
        />
        <rect
          x={-medallion / 2}
          y={-medallion / 2}
          width={medallion}
          height={medallion}
          strokeWidth="1.4"
          transform="rotate(45)"
        />
        <circle r={medallion * 0.16} strokeWidth="1" />
      </g>

      {/* Brend belgisi — kichik yulduz */}
      <g transform="translate(34 44)" stroke="#ffffff" fill="none" opacity="0.7">
        <rect x="-8" y="-8" width="16" height="16" strokeWidth="1.2" />
        <rect x="-8" y="-8" width="16" height="16" strokeWidth="1.2" transform="rotate(45)" />
      </g>

      {/* Monogramma — display shriftda, muqovaning "mavzusi" */}
      <text
        x="26"
        y="132"
        fill="#ffffff"
        fontSize="58"
        fontWeight="700"
        letterSpacing="-2"
        style={{ fontFamily: 'var(--font-display), system-ui, sans-serif' }}
      >
        {mono}
      </text>
      <rect x="28" y="146" width="38" height="3" rx="1.5" fill="#ffffff" opacity="0.55" />
    </svg>
  );
}
