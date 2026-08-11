'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, BookOpen, FolderTree, Users, BarChart3, Send,
  LayoutTemplate, Bot, ArrowLeft, MessageSquare, Award, UserCheck, Coins,
  Menu, X, Search as SearchIcon,
} from 'lucide-react';
import RequireAuth from '@/components/RequireAuth';
import { useAuth } from '@/lib/auth';
import CommandPalette from '@/components/admin/CommandPalette';

// Yon menyudagi qidiruv tugmasi — Ctrl+K bilan bir xil oynani ochadi
function PaletteButton({ className = '' }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event('admin-palette-open'))}
      className={`flex w-full items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm text-muted transition-colors hover:bg-slate-50 ${className}`}
    >
      <SearchIcon size={16} />
      <span className="flex-1 text-left">Qidirish</span>
      <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px]">Ctrl K</kbd>
    </button>
  );
}

// Menyu vazifasi yaqin bo'limlar bo'yicha guruhlangan:
// katalog (kurs/kategoriya), o'quvchi bilan ishlash, pul, odamlar, sozlamalar.
const adminGroups = [
  {
    title: 'Umumiy',
    items: [
      // Statistika shu sahifaning ikkinchi yorlig'i — alohida bo'lim emas
      { href: '/admin', label: 'Boshqaruv paneli', icon: LayoutDashboard, exact: true },
    ],
  },
  {
    title: "Ta'lim",
    items: [
      { href: '/admin/courses', label: 'Kurslar', icon: BookOpen },
      { href: '/admin/categories', label: 'Kategoriyalar', icon: FolderTree },
    ],
  },
  {
    title: "O'quvchilar",
    items: [
      { href: '/admin/students', label: "O'quvchilar", icon: UserCheck },
      { href: '/admin/reviews', label: 'Sharhlar', icon: MessageSquare },
      { href: '/admin/certificates', label: 'Sertifikatlar', icon: Award },
      { href: '/admin/messages', label: 'Xabarlar', icon: Send },
    ],
  },
  {
    title: 'Moliya',
    items: [
      // To'lovlar, taqsimot, o'tkazmalar va foizlar — hammasi yorliqlar ichida
      { href: '/admin/earnings', label: 'Moliya', icon: Coins },
    ],
  },
  {
    title: 'Odamlar',
    items: [
      // O'quvchi, ustoz va admin bitta sahifada — ichida rol yorliqlari bor
      { href: '/admin/users', label: 'Odamlar', icon: Users },
    ],
  },
  {
    title: 'Sozlamalar',
    items: [
      { href: '/admin/ai', label: 'Ustoz AI', icon: Bot },
      { href: '/admin/home', label: 'Bosh sahifa', icon: LayoutTemplate },
    ],
  },
];

// Ustoz admin uchun cheklangan menyu — faqat o'z kurslari, o'quvchilari va maoshi
const instructorGroups = [
  {
    title: "Ta'lim",
    items: [
      { href: '/admin/courses', label: 'Kurslarim', icon: BookOpen },
      { href: '/admin/stats', label: 'Statistika', icon: BarChart3 },
    ],
  },
  {
    title: "O'quvchilarim",
    items: [
      { href: '/admin/students', label: "O'quvchilarim", icon: UserCheck },
      { href: '/admin/messages', label: 'Xabarlar', icon: Send },
    ],
  },
  {
    title: 'Moliya',
    items: [
      { href: '/admin/earnings', label: 'Maoshim', icon: Coins },
    ],
  },
];

// Ustoz kira oladigan yo'llar (boshqalaridan qaytariladi)
const instructorAllowed = [
  '/admin/courses', '/admin/students', '/admin/earnings', '/admin/stats', '/admin/messages',
];

const isActive = (item, pathname) =>
  item.exact ? pathname === item.href : pathname.startsWith(item.href);

// Yon menyu mazmuni — desktopda ustunda, mobilda drawer ichida bir xil ishlatiladi
function NavGroups({ groups, pathname, onNavigate }) {
  return (
    <nav className="space-y-5">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {group.title}
          </p>
          <div className="space-y-1">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors
                    ${isActive(item, pathname) ? 'bg-primary text-white' : 'text-muted hover:bg-slate-100'}`}
                >
                  <Icon size={18} /> {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, isStaff, loading } = useAuth();
  const groups = isAdmin ? adminGroups : instructorGroups;
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Ustoz faqat ruxsat etilgan bo'limlarga kira oladi — boshqalaridan qaytaramiz
  useEffect(() => {
    if (loading || !isStaff || isAdmin) return;
    const allowed = instructorAllowed.some((p) => pathname.startsWith(p));
    if (!allowed) router.replace('/admin/courses');
  }, [loading, isStaff, isAdmin, pathname, router]);

  // Drawer ochiq bo'lsa: sahifa scroll'ini to'xtatamiz va Esc bilan yopamiz
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') setDrawerOpen(false); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  // Yo'l o'zgarganda drawer yopiladi
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  // Mobil sarlavha uchun joriy bo'lim nomi
  const currentLabel = groups
    .flatMap((g) => g.items)
    .find((item) => isActive(item, pathname))?.label || 'Panel';

  const roleBadge = (
    <span className="badge bg-indigo-50 text-indigo-700">{isAdmin ? 'Bosh admin' : 'Ustoz'}</span>
  );

  return (
    <RequireAuth staffOnly>
      {/* Ctrl+K qidiruv — faqat bosh admin uchun (endpoint ham adminOnly) */}
      {isAdmin && <CommandPalette />}

      {/* Mobil yuqori panel — menyuni drawer sifatida ochadi */}
      <div className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur lg:hidden">
        <div className="container-page flex items-center gap-3 py-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Menyuni ochish"
            className="grid h-9 w-9 place-items-center rounded-xl border border-line text-ink hover:bg-slate-50"
          >
            <Menu size={18} />
          </button>
          <span className="min-w-0 flex-1 truncate font-display font-semibold text-ink">
            {currentLabel}
          </span>
          {roleBadge}
        </div>
      </div>

      {/* Mobil drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-[280px] max-w-[85vw] flex-col overflow-y-auto bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              {roleBadge}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Menyuni yopish"
                className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            {isAdmin && <div className="mb-4"><PaletteButton /></div>}
            <NavGroups groups={groups} pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            <Link href="/" className="mt-5 flex items-center gap-2 px-3 text-sm text-muted hover:text-primary">
              <ArrowLeft size={16} /> Saytga qaytish
            </Link>
          </aside>
        </div>
      )}

      <div className="container-page grid gap-8 py-8 lg:grid-cols-[240px_1fr]">
        {/* Desktop yon menyu */}
        <aside className="hidden lg:block">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
            {roleBadge}
          </div>
          <div className="sticky top-6">
            {isAdmin && <div className="mb-4"><PaletteButton /></div>}
            <NavGroups groups={groups} pathname={pathname} />
            <Link href="/" className="mt-5 flex items-center gap-2 px-3 text-sm text-muted hover:text-primary">
              <ArrowLeft size={16} /> Saytga qaytish
            </Link>
          </div>
        </aside>

        {/* Kontent */}
        <div className="min-w-0">{children}</div>
      </div>
    </RequireAuth>
  );
}
