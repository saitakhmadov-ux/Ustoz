'use client';

// "Diqqat talab qiladi" — boshqaruv panelini passiv hisobotdan ish roʻyxatiga
// aylantiradi. Backend faqat haqiqatan qoʻl tekkizish kerak boʻlgan holatlarni
// qaytaradi; hech narsa boʻlmasa xotirjam holat koʻrsatiladi.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, CheckCircle2, ArrowRight, BookOpen, UserPlus, Send, FolderPlus,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/constants';

const TONES = {
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  slate: 'bg-slate-50 text-slate-600 border-slate-200',
};

// Eng koʻp ishlatiladigan toʻrtta amal — har biri ikki klik tejaydi
const QUICK_ACTIONS = [
  { href: '/admin/courses/new', label: 'Yangi kurs', icon: BookOpen },
  { href: '/admin/users', label: 'Yangi odam', icon: UserPlus },
  { href: '/admin/messages', label: 'Xabar yuborish', icon: Send },
  { href: '/admin/categories', label: 'Kategoriya', icon: FolderPlus },
];

export function QuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {QUICK_ACTIONS.map((a) => {
        const Icon = a.icon;
        return (
          <Link key={a.href} href={a.href} className="btn-outline py-2 text-sm">
            <Icon size={15} /> {a.label}
          </Link>
        );
      })}
    </div>
  );
}

export function AttentionPanel() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.get('/admin/attention')
      .then((res) => setItems(res.items))
      .catch(() => setItems([]));
  }, []);

  if (items === null) return null;

  if (items.length === 0) {
    return (
      <div className="card flex items-center gap-3 p-4 text-sm">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={18} />
        </span>
        <span>
          <b className="text-ink">Hammasi joyida.</b>{' '}
          <span className="text-muted">Hozircha qoʻl tekkizish kerak boʻlgan holat yoʻq.</span>
        </span>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h2 className="flex items-center gap-2 text-lg">
        <AlertTriangle size={18} className="text-amber-500" />
        Diqqat talab qiladi
        <span className="badge bg-slate-100 text-slate-600">{items.length}</span>
      </h2>

      <ul className="mt-4 space-y-2">
        {items.map((it) => (
          <li
            key={it.key}
            className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${TONES[it.tone] || TONES.slate}`}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {it.title}
                {it.amount != null && (
                  <span className="ml-1.5 tabular-nums">— {formatMoney(it.amount)}</span>
                )}
              </p>
              <p className="mt-0.5 text-xs opacity-80">{it.text}</p>
            </div>
            <Link
              href={it.href}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-surface-glass px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface"
            >
              {it.action} <ArrowRight size={13} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
