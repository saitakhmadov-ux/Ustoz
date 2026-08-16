'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X, GraduationCap, LayoutDashboard, LogOut, Shield, User, Bell } from 'lucide-react';
import { SITE_NAME } from '@/lib/constants';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import SearchBox from '@/components/SearchBox';
import ThemeToggle from '@/components/ThemeToggle';

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const { user, isAuthenticated, isAdmin, isStaff, logout, loading } = useAuth();
  const router = useRouter();

  // O'qilmagan bildirishnomalar sonini olish (va vaqti-vaqti bilan yangilash)
  useEffect(() => {
    if (!isAuthenticated) { setUnread(0); return; }
    let alive = true;
    const fetchCount = () => api.get('/me/notifications/unread-count')
      .then((res) => { if (alive) setUnread(res.unread); })
      .catch(() => {});
    fetchCount();
    const t = setInterval(fetchCount, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [isAuthenticated]);

  const nav = [
    { href: '/courses', label: 'Kurslar' },
    { href: '/categories', label: 'Kategoriyalar' },
    { href: '/about', label: 'Biz haqimizda' },
    { href: '/contact', label: 'Kontaktlar' },
  ];

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    setOpen(false);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface-glass backdrop-blur">
      <div className="container-page flex h-16 items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-on-primary">
            <GraduationCap size={20} />
          </span>
          <span className="font-display text-xl font-bold text-ink">{SITE_NAME}</span>
        </Link>

        {/* Qidiruv (desktop) */}
        <SearchBox className="hidden flex-1 max-w-md md:flex" />

        {/* Navigatsiya (desktop) */}
        <nav className="ml-auto hidden items-center gap-6 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted hover:text-primary transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* O'ng tomon (desktop) */}
        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {loading ? (
            <div className="h-9 w-24 animate-pulse rounded-xl bg-slate-100" />
          ) : isAuthenticated ? (
            <>
              {/* Bildirishnoma qo'ng'irog'i */}
              <Link
                href="/notifications"
                className="relative grid h-9 w-9 place-items-center rounded-xl border border-line hover:border-primary"
                title="Xabarlar"
                aria-label="Xabarlar"
              >
                <Bell size={18} />
                {unread > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-xl border border-line px-2.5 py-1.5 hover:border-primary"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-bold text-on-primary">
                  {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </span>
                <span className="max-w-[120px] truncate text-sm font-medium">{user.fullName}</span>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 rounded-xl border border-line bg-surface p-1.5 shadow-card"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <Link href="/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100" onClick={() => setMenuOpen(false)}>
                    <LayoutDashboard size={16} /> Shaxsiy kabinet
                  </Link>
                  <Link href="/profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100" onClick={() => setMenuOpen(false)}>
                    <User size={16} /> Profil
                  </Link>
                  <Link href="/notifications" className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100" onClick={() => setMenuOpen(false)}>
                    <span className="flex items-center gap-2"><Bell size={16} /> Xabarlar</span>
                    {unread > 0 && <span className="grid h-5 min-w-[20px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
                  </Link>
                  {isStaff && (
                    <Link href="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-primary hover:bg-slate-100" onClick={() => setMenuOpen(false)}>
                      <Shield size={16} /> {isAdmin ? 'Admin panel' : 'Ustoz paneli'}
                    </Link>
                  )}
                  <button onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                    <LogOut size={16} /> Chiqish
                  </button>
                </div>
              )}
            </div>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">Kirish</Link>
              <Link href="/register" className="btn-primary">Ro'yxatdan o'tish</Link>
            </>
          )}
        </div>

        {/* Mobil menyu tugmasi */}
        <button
          className="ml-auto grid h-10 w-10 place-items-center rounded-lg hover:bg-slate-100 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menyu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobil menyu */}
      {open && (
        <div className="border-t border-line bg-surface md:hidden">
          <div className="container-page flex flex-col gap-1 py-4">
            <SearchBox className="mb-2" onDone={() => setOpen(false)} />
            {nav.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-slate-100" onClick={() => setOpen(false)}>
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <ThemeToggle compact />
              {isAuthenticated ? (
                <>
                  <Link href="/dashboard" className="btn-outline" onClick={() => setOpen(false)}>Shaxsiy kabinet</Link>
                  <Link href="/notifications" className="btn-outline" onClick={() => setOpen(false)}>
                    Xabarlar {unread > 0 && <span className="ml-1 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
                  </Link>
                  {isStaff && <Link href="/admin" className="btn-outline" onClick={() => setOpen(false)}>{isAdmin ? 'Admin panel' : 'Ustoz paneli'}</Link>}
                  <button onClick={handleLogout} className="btn-ghost text-red-600">Chiqish</button>
                </>
              ) : (
                <>
                  <Link href="/login" className="btn-outline" onClick={() => setOpen(false)}>Kirish</Link>
                  <Link href="/register" className="btn-primary" onClick={() => setOpen(false)}>Ro'yxatdan o'tish</Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
