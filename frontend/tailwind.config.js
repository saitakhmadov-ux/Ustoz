/** @type {import('tailwindcss').Config} */

// Rang shkalalari CSS o'zgaruvchilariga bog'langan (globals.css -> :root va
// [data-theme="dark"]). Shu tufayli `bg-slate-50`, `text-red-700` kabi mavjud
// yuzlab klass kecha rejimida avtomatik to'g'ri rangga o'tadi — har bir faylni
// qo'lda tuzatish shart emas.
//
// MUHIM: bu yerda sanab o'tilmagan qadam (masalan `bg-slate-800`) umuman
// mavjud bo'lmaydi — Tailwind standart shkalani to'liq almashtiradi.
// Yangi qadam ishlatsangiz, uni shu ro'yxatga VA globals.css ga qo'shing.
const themed = {
  slate: {
    50: 'var(--c-slate-50)',
    100: 'var(--c-slate-100)',
    200: 'var(--c-slate-200)',
    300: 'var(--c-slate-300)',
    400: 'var(--c-slate-400)',
    500: 'var(--c-slate-500)',
    600: 'var(--c-slate-600)',
    700: 'var(--c-slate-700)',
    900: 'var(--c-slate-900)',
  },
  indigo: {
    50: 'var(--c-indigo-50)',
    100: 'var(--c-indigo-100)',
    200: 'var(--c-indigo-200)',
    300: 'var(--c-indigo-300)',
    400: 'var(--c-indigo-400)',
    500: 'var(--c-indigo-500)',
    600: 'var(--c-indigo-600)',
    700: 'var(--c-indigo-700)',
    800: 'var(--c-indigo-800)',
  },
  emerald: {
    50: 'var(--c-emerald-50)',
    100: 'var(--c-emerald-100)',
    200: 'var(--c-emerald-200)',
    300: 'var(--c-emerald-300)',
    500: 'var(--c-emerald-500)',
    600: 'var(--c-emerald-600)',
    700: 'var(--c-emerald-700)',
    800: 'var(--c-emerald-800)',
  },
  red: {
    50: 'var(--c-red-50)',
    100: 'var(--c-red-100)',
    200: 'var(--c-red-200)',
    300: 'var(--c-red-300)',
    400: 'var(--c-red-400)',
    500: 'var(--c-red-500)',
    600: 'var(--c-red-600)',
    700: 'var(--c-red-700)',
  },
  amber: {
    50: 'var(--c-amber-50)',
    100: 'var(--c-amber-100)',
    200: 'var(--c-amber-200)',
    300: 'var(--c-amber-300)',
    400: 'var(--c-amber-400)',
    500: 'var(--c-amber-500)',
    600: 'var(--c-amber-600)',
    700: 'var(--c-amber-700)',
    800: 'var(--c-amber-800)',
  },
  rose: {
    50: 'var(--c-rose-50)',
    100: 'var(--c-rose-100)',
    500: 'var(--c-rose-500)',
    600: 'var(--c-rose-600)',
    700: 'var(--c-rose-700)',
  },
  violet: {
    50: 'var(--c-violet-50)',
    100: 'var(--c-violet-100)',
    600: 'var(--c-violet-600)',
  },
  blue: {
    50: 'var(--c-blue-50)',
    500: 'var(--c-blue-500)',
    600: 'var(--c-blue-600)',
  },
  purple: {
    50: 'var(--c-purple-50)',
    600: 'var(--c-purple-600)',
  },
  pink: {
    50: 'var(--c-pink-50)',
    600: 'var(--c-pink-600)',
  },
  orange: {
    50: 'var(--c-orange-50)',
    100: 'var(--c-orange-100)',
    200: 'var(--c-orange-200)',
    600: 'var(--c-orange-600)',
    700: 'var(--c-orange-700)',
  },
  sky: {
    50: 'var(--c-sky-50)',
    100: 'var(--c-sky-100)',
    600: 'var(--c-sky-600)',
    700: 'var(--c-sky-700)',
  },
};

module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        ...themed,
        // Ustoz brend ranglari (CSS o'zgaruvchilar orqali)
        primary: {
          DEFAULT: 'var(--color-primary)',
          light: 'var(--color-primary-light)',
          dark: 'var(--color-primary-dark)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          dark: 'var(--color-accent-dark)',
        },
        // Brend fon ustidagi matn/ikonka rangi. Yorug' temada oq, kecha
        // rejimida to'q — chunki u yerda primary/accent ochroq bo'ladi.
        'on-primary': 'var(--color-on-primary)',
        'on-accent': 'var(--color-on-accent)',
        // Teskari yuza (tooltip, to'q tugma) va modal pardasi — ikkalasi ham
        // har ikki temada TO'Q qoladi.
        inverse: 'var(--color-inverse)',
        'on-inverse': 'var(--color-on-inverse)',
        scrim: 'var(--color-scrim)',
        // Yarim shaffof yuza (yopishqoq sarlavha, suzuvchi karta)
        'surface-glass': 'var(--surface-glass)',
        // Rasm ustidagi belgi — temadan qat'i nazar oq fon / to'q matn
        chip: 'var(--chip-bg)',
        'on-chip': 'var(--chip-fg)',
        // Brend bandi gradienti — matni har doim oq
        'band-from': 'var(--band-from)',
        'band-to': 'var(--band-to)',
        'band-accent-from': 'var(--band-accent-from)',
        'band-accent-to': 'var(--band-accent-to)',
        'on-band': 'var(--color-on-band)',
        heading: 'var(--color-heading)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        subtle: 'var(--color-subtle)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        line: 'var(--color-line)',
        field: 'var(--color-field)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-sora)', 'var(--font-inter)', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        // Soft depth — yumshoq, qatlamli, nozik indigo-tintli chuqurlik.
        // Kecha rejimida soya ko'rinmaydi, shuning uchun kuchi o'zgaruvchida.
        card: 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
      },
      container: {
        center: true,
        padding: '1rem',
        screens: {
          '2xl': '1200px',
        },
      },
    },
  },
  plugins: [],
};
