'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, BookOpen, FolderTree, Users, GraduationCap, BarChart3, Send, Image as ImageIcon, Type, ArrowLeft } from 'lucide-react';
import RequireAuth from '@/components/RequireAuth';
import { useAuth } from '@/lib/auth';

// Bosh admin uchun to'liq menyu
const adminMenu = [
  { href: '/admin', label: 'Boshqaruv paneli', icon: LayoutDashboard, exact: true },
  { href: '/admin/courses', label: 'Kurslar', icon: BookOpen },
  { href: '/admin/stats', label: 'Statistika', icon: BarChart3 },
  { href: '/admin/messages', label: 'Xabarlar', icon: Send },
  { href: '/admin/hero', label: 'Bosh sahifa', icon: ImageIcon },
  { href: '/admin/content', label: 'Sayt matnlari', icon: Type },
  { href: '/admin/categories', label: 'Kategoriyalar', icon: FolderTree },
  { href: '/admin/instructors', label: 'Ustozlar', icon: GraduationCap },
  { href: '/admin/users', label: 'Foydalanuvchilar', icon: Users },
];

// Ustoz admin uchun cheklangan menyu — faqat o'z kurslari, statistikasi va xabarlar
const instructorMenu = [
  { href: '/admin/courses', label: 'Kurslarim', icon: BookOpen },
  { href: '/admin/stats', label: 'Statistika', icon: BarChart3 },
  { href: '/admin/messages', label: 'Xabarlar', icon: Send },
];

// Ustoz kira oladigan yo'llar (boshqalaridan qaytariladi)
const instructorAllowed = ['/admin/courses', '/admin/stats', '/admin/messages'];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAdmin, isStaff, loading } = useAuth();
  const menu = isAdmin ? adminMenu : instructorMenu;

  // Ustoz faqat ruxsat etilgan bo'limlarga kira oladi — boshqalaridan qaytaramiz
  useEffect(() => {
    if (loading || !isStaff || isAdmin) return;
    const allowed = instructorAllowed.some((p) => pathname.startsWith(p));
    if (!allowed) router.replace('/admin/courses');
  }, [loading, isStaff, isAdmin, pathname, router]);

  const isActive = (item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  return (
    <RequireAuth staffOnly>
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[240px_1fr]">
        {/* Yon menyu */}
        <aside>
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-primary">
            <span className="badge bg-indigo-50 text-indigo-700">{isAdmin ? 'Bosh admin' : 'Ustoz'}</span>
          </div>
          <nav className="space-y-1">
            {menu.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors
                    ${isActive(item) ? 'bg-primary text-white' : 'text-muted hover:bg-slate-100'}`}
                >
                  <Icon size={18} /> {item.label}
                </Link>
              );
            })}
          </nav>
          <Link href="/" className="mt-4 flex items-center gap-2 px-3 text-sm text-muted hover:text-primary">
            <ArrowLeft size={16} /> Saytga qaytish
          </Link>
        </aside>

        {/* Kontent */}
        <div className="min-w-0">{children}</div>
      </div>
    </RequireAuth>
  );
}
