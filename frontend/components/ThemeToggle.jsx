'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { getStoredTheme, setTheme, applyTheme } from '@/lib/theme';

const OPTIONS = [
  { value: 'light', label: 'Yorug\'', Icon: Sun },
  { value: 'dark', label: 'Kecha', Icon: Moon },
  { value: 'system', label: 'Tizim', Icon: Monitor },
];

// Tema almashtirgich — uchta holat: yorug' / kecha / tizim.
// Serverda va mijozda bir xil chiqishi uchun tanlov faqat mount'dan keyin
// ko'rsatiladi (localStorage serverda yo'q).
export default function ThemeToggle({ compact = false }) {
  const [theme, setThemeState] = useState('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setThemeState(getStoredTheme());
    setReady(true);
  }, []);

  // "Tizim" tanlangan bo'lsa, qurilma sozlamasi o'zgarganda darhol ergashadi
  useEffect(() => {
    if (theme !== 'system') return undefined;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const pick = (value) => {
    setThemeState(value);
    setTheme(value);
  };

  if (compact) {
    // Mobil menyu uchun: bitta qatorda uchta tugma
    return (
      <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
        {OPTIONS.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            onClick={() => pick(value)}
            aria-pressed={ready && theme === value}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors
              ${ready && theme === value ? 'bg-primary text-on-primary' : 'text-muted hover:bg-slate-100'}`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>
    );
  }

  // Ish stoli uchun: bitta tugma, bosilganda keyingi holatga o'tadi
  const idx = OPTIONS.findIndex((o) => o.value === theme);
  const current = OPTIONS[idx === -1 ? 2 : idx];
  const next = OPTIONS[((idx === -1 ? 2 : idx) + 1) % OPTIONS.length];
  const { Icon } = current;

  return (
    <button
      type="button"
      onClick={() => pick(next.value)}
      title={`Tema: ${current.label} — bosing: ${next.label}`}
      aria-label={`Tema: ${current.label}. Bosing: ${next.label}`}
      className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-surface text-muted transition-colors hover:border-primary hover:text-primary"
    >
      {/* Mount bo'lgunicha neytral ikonka — server bilan mos kelishi uchun */}
      <Icon size={17} className={ready ? '' : 'opacity-50'} />
    </button>
  );
}
