import Link from 'next/link';
import { GraduationCap, CheckCircle2 } from 'lucide-react';
import { SITE_NAME } from '@/lib/constants';

const perks = [
  'O\'zbek tilidagi amaliy IT kurslar',
  'Video darslar, testlar va sertifikat',
  'O\'z tezligingizda, istalgan vaqtda',
];

// Kirish/Ro'yxat sahifalari uchun ikki panelli qobiq
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      {/* Brend paneli (faqat desktop) */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-band-from via-band-from to-band-to p-12 text-white lg:flex lg:flex-col lg:justify-between">
        {/* dekor */}
        <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
          <div className="blob absolute -left-16 -top-16 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
          <div className="blob absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-amber-300/30 blur-3xl" style={{ animationDelay: '3s' }} />
        </div>

        <Link href="/" className="relative flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 backdrop-blur">
            <GraduationCap size={22} />
          </span>
          <span className="font-display text-xl font-bold">{SITE_NAME}</span>
        </Link>

        <div className="relative">
          <h2 className="font-display text-3xl font-bold leading-tight text-white">
            Kelajak kasbini bugun o'rganing
          </h2>
          <p className="mt-3 max-w-sm text-white/85">
            Ustoz jamoasiga qo'shiling — bilim olish hech qachon bunchalik qulay bo'lmagan.
          </p>
          <ul className="mt-6 space-y-3">
            {perks.map((p) => (
              <li key={p} className="flex items-center gap-3 text-sm text-white/85">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/15">
                  <CheckCircle2 size={14} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-indigo-100/70">© {new Date().getFullYear()} {SITE_NAME}. Barcha huquqlar himoyalangan.</p>
      </div>

      {/* Forma paneli */}
      <div className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center lg:text-left">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-on-primary lg:mx-0">
              <GraduationCap size={26} />
            </span>
            <h1 className="mt-4 text-2xl">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          </div>
          {children}
          {footer}
        </div>
      </div>
    </div>
  );
}
