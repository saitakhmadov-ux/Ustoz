/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
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
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        surface: 'var(--color-surface)',
        line: 'var(--color-line)',
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
        // Soft depth — yumshoq, qatlamli, nozik indigo-tintli chuqurlik
        card: '0 2px 4px rgba(30,27,75,0.04), 0 12px 32px rgba(99,102,241,0.08)',
        'card-hover': '0 6px 16px rgba(30,27,75,0.08), 0 22px 48px rgba(99,102,241,0.16)',
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
