'use client';

// Ctrl+K (Mac'da ⌘K) — panel bo'ylab tezkor qidiruv va bo'limlarga sakrash.
// 14 ta bo'lim orasida sichqoncha bilan yurish o'rniga bir necha harf yetadi.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, CornerDownLeft, LayoutDashboard, BookOpen, FolderTree, UserCheck,
  MessageSquare, Award, Send, Coins, Users, Bot, LayoutTemplate, Loader2, Mail,
  Database,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/constants';

// Bo'limlar — qidiruvsiz ham ko'rinadigan asosiy ro'yxat
const SECTIONS = [
  { label: 'Boshqaruv paneli', href: '/admin', icon: LayoutDashboard, keywords: 'dashboard statistika asosiy' },
  { label: "O'quvchilar tahlili", href: '/admin?tab=students', icon: LayoutDashboard, keywords: 'statistika funnel tugatish' },
  { label: 'Kurslar', href: '/admin/courses', icon: BookOpen, keywords: 'course dars kontent' },
  { label: 'Kategoriyalar', href: '/admin/categories', icon: FolderTree, keywords: 'category yo\'nalish' },
  { label: "O'quvchilar", href: '/admin/students', icon: UserCheck, keywords: 'student progress' },
  { label: 'Sharhlar', href: '/admin/reviews', icon: MessageSquare, keywords: 'review baho izoh' },
  { label: 'Sertifikatlar', href: '/admin/certificates', icon: Award, keywords: 'certificate diplom' },
  { label: 'Xabarlar', href: '/admin/messages', icon: Send, keywords: 'notification bildirishnoma' },
  { label: 'Moliya', href: '/admin/earnings', icon: Coins, keywords: 'maosh pul daromad aylanma' },
  { label: "To'lovlar", href: '/admin/earnings?tab=payments', icon: Coins, keywords: 'payment tranzaksiya click payme' },
  { label: "O'tkazmalar", href: '/admin/earnings?tab=payouts', icon: Coins, keywords: 'payout maosh to\'lash' },
  { label: 'Odamlar', href: '/admin/users', icon: Users, keywords: 'foydalanuvchi user' },
  { label: 'Ustozlar', href: '/admin/users?role=INSTRUCTOR', icon: Users, keywords: 'instructor teacher' },
  { label: 'Ustoz AI', href: '/admin/ai', icon: Bot, keywords: 'gemini sun\'iy intellekt' },
  { label: 'Bosh sahifa', href: '/admin/home', icon: LayoutTemplate, keywords: 'hero banner matn' },
  { label: 'Aloqa va himoya', href: '/admin/email', icon: Mail, keywords: 'smtp pochta xat email telegram bot captcha turnstile' },
  { label: 'Baza', href: '/admin/database', icon: Database, keywords: 'database zaxira backup tozalash hajm sql' },
];

const ROLE_LABEL = { ADMIN: 'Bosh admin', INSTRUCTOR: 'Ustoz', USER: "O'quvchi" };

export default function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef(null);

  // Ctrl+K / ⌘K bilan ochish
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    // Yon menyudagi tugma ham shu orqali ochadi
    const onRequest = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('admin-palette-open', onRequest);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('admin-palette-open', onRequest);
    };
  }, []);

  // Ochilganda maydonga fokus, yopilganda holatni tozalash
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setQ('');
      setResults(null);
      setCursor(0);
    }
  }, [open]);

  // Serverdan qidiruv — yozishni to'xtatgandan 250ms keyin
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults(null); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(() => {
      api.get(`/admin/search?q=${encodeURIComponent(term)}`)
        .then((res) => setResults(res))
        .catch(() => setResults(null))
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  // Bo'limlar mahalliy filtrlanadi — server kutilmaydi
  const sections = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return SECTIONS.slice(0, 6);
    return SECTIONS.filter(
      (s) => s.label.toLowerCase().includes(term) || s.keywords.includes(term),
    );
  }, [q]);

  // Barcha natijalar bitta tekis ro'yxatda — klaviatura bilan yurish uchun
  const flat = useMemo(() => {
    const out = sections.map((s) => ({ type: 'section', href: s.href, label: s.label, icon: s.icon }));
    for (const u of results?.users || []) {
      out.push({ type: 'user', href: `/admin/users/${u.id}`, label: u.fullName, meta: `${ROLE_LABEL[u.role] || u.role} · ${u.email}` });
    }
    for (const c of results?.courses || []) {
      out.push({ type: 'course', href: `/admin/courses/${c.id}`, label: c.title, meta: c.published ? 'Nashr etilgan' : 'Qoralama' });
    }
    for (const p of results?.payments || []) {
      out.push({ type: 'payment', href: `/receipt/${p.id}`, label: `${formatPrice(p.amount)} — ${p.course?.title || ''}`, meta: `${p.user?.fullName || ''} · ${p.status}` });
    }
    return out;
  }, [sections, results]);

  useEffect(() => { setCursor(0); }, [q]);

  const go = useCallback((item) => {
    if (!item) return;
    setOpen(false);
    // Query'li havolalar sahifa mount bo'lishidan oldin manzilda turishi kerak
    if (item.href.includes('?')) window.location.assign(item.href);
    else router.push(item.href);
  }, [router]);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { setOpen(false); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(c + 1, flat.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === 'Enter') { e.preventDefault(); go(flat[cursor]); }
  };

  if (!open) return null;

  const groups = [
    { title: "Bo'limlar", items: flat.filter((i) => i.type === 'section') },
    { title: 'Odamlar', items: flat.filter((i) => i.type === 'user') },
    { title: 'Kurslar', items: flat.filter((i) => i.type === 'course') },
    { title: "To'lovlar", items: flat.filter((i) => i.type === 'payment') },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[10vh]">
      <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} aria-hidden="true" />

      <div
        role="dialog"
        aria-label="Tezkor qidiruv"
        className="relative flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          {loading
            ? <Loader2 size={18} className="animate-spin text-muted" />
            : <Search size={18} className="text-muted" />}
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Bo'lim, odam, kurs yoki to'lov qidiring..."
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle"
          />
          <kbd className="rounded border border-line px-1.5 py-0.5 text-[10px] text-muted">Esc</kbd>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {flat.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">
              {q.trim().length < 2 ? 'Kamida 2 ta harf yozing' : 'Hech narsa topilmadi'}
            </p>
          ) : groups.map((g) => (
            <div key={g.title} className="mb-1">
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-subtle">
                {g.title}
              </p>
              {g.items.map((item) => {
                const idx = flat.indexOf(item);
                const active = idx === cursor;
                const Icon = item.icon;
                return (
                  <button
                    key={`${item.type}-${item.href}-${item.label}`}
                    type="button"
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => go(item)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors
                      ${active ? 'bg-primary text-white' : 'hover:bg-slate-50'}`}
                  >
                    {Icon && <Icon size={16} className={active ? 'text-white' : 'text-muted'} />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{item.label}</span>
                      {item.meta && (
                        <span className={`block truncate text-xs ${active ? 'text-white/70' : 'text-muted'}`}>
                          {item.meta}
                        </span>
                      )}
                    </span>
                    {active && <CornerDownLeft size={14} className="shrink-0 text-white/70" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-[11px] text-muted">
          <span>↑↓ tanlash</span>
          <span>↵ ochish</span>
          <span className="ml-auto">Ctrl+K</span>
        </div>
      </div>
    </div>
  );
}
