import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { SITE_NAME } from '@/lib/constants';

// Admin tahrirlagan footer matnini serverdan oladi (yo'q bo'lsa — standart).
async function getFooterText() {
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const res = await fetch(`${base}/home/content`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.content?.footerText || null;
  } catch {
    return null;
  }
}

export default async function Footer() {
  const footerText =
    (await getFooterText()) ||
    `© ${new Date().getFullYear()} ${SITE_NAME}. Barcha huquqlar himoyalangan.`;

  const cols = [
    {
      title: 'Platforma',
      links: [
        { href: '/courses', label: 'Barcha kurslar' },
        { href: '/categories', label: 'Kategoriyalar' },
        { href: '/about', label: 'Biz haqimizda' },
      ],
    },
    {
      title: 'Hisob',
      links: [
        { href: '/login', label: 'Kirish' },
        { href: '/register', label: 'Ro\'yxatdan o\'tish' },
        { href: '/dashboard', label: 'Shaxsiy kabinet' },
      ],
    },
    {
      title: 'Yordam',
      links: [
        { href: '/contact', label: 'Kontaktlar' },
        { href: '/faq', label: 'Ko\'p so\'raladigan savollar' },
      ],
    },
  ];

  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="container-page py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-on-primary">
                <GraduationCap size={20} />
              </span>
              <span className="font-display text-xl font-bold">{SITE_NAME}</span>
            </Link>
            <p className="mt-3 text-sm text-muted">
              O'zbek tilidagi onlayn IT ta'lim platformasi. Zamonaviy kasblarni o'zlashtiring.
            </p>
          </div>

          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-sm font-semibold text-heading">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-muted hover:text-primary transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-line pt-6 text-center text-sm text-muted">
          {footerText}
        </div>
      </div>
    </footer>
  );
}
