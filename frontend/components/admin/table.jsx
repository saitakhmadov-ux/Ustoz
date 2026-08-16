'use client';

// Admin panelidagi ro'yxat sahifalari uchun umumiy qismlar.
// Avval har bir sahifa qidiruv maydonini, filtr tugmalarini, sarlavhani va
// ko'rsatkich kartochkasini o'zi qaytadan yozardi — endi manba bitta.

import { useState } from 'react';
import { Search, X, Info } from 'lucide-react';

// Sahifa sarlavhasi: nom, tavsif va o'ng tomonda amal tugmalari
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

// Qidiruv maydoni + filtrlar + tozalash tugmasi
export function DataToolbar({ search, onSearch, placeholder = 'Qidirish...', hasFilters, onReset, children }) {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <div className="relative min-w-[240px] flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          className="input pl-9"
          placeholder={placeholder}
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      {children}
      {hasFilters && (
        <button type="button" onClick={onReset} className="btn-ghost">
          <X size={16} /> Tozalash
        </button>
      )}
    </div>
  );
}

// Filtr uchun tanlov ro'yxati
export function FilterSelect({ value, onChange, options, placeholder, width = '190px' }) {
  return (
    <select
      className="input"
      style={{ maxWidth: width }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// Filtr uchun belgilash katagi
export function FilterCheckbox({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-line accent-indigo-600"
      />
      {label}
    </label>
  );
}

// Yorliqlar qatori — davr tanlash, holat filtri, sahifa ichidagi bo'limlar uchun
export function SegmentedTabs({ value, onChange, items, size = 'md' }) {
  const pad = size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-3 py-1.5 text-sm';
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onChange(item.key)}
          className={`rounded-lg font-medium transition-colors ${pad}
            ${value === item.key ? 'bg-white text-primary shadow-sm' : 'text-muted hover:text-ink'}`}
        >
          {item.label}
          {item.count != null && (
            <span className={`ml-1.5 text-xs ${value === item.key ? 'text-primary/60' : 'text-subtle'}`}>
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// Holat yorliqlari — hisoblagichli, kattaroq (o'quvchilar sahifasidagi kabi)
export function CountTabs({ value, onChange, items }) {
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {items.map((item) => {
        const active = value === item.key;
        return (
          <button
            key={item.key || 'all'}
            type="button"
            onClick={() => onChange(item.key)}
            className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-colors
              ${active ? 'bg-primary text-white' : 'bg-slate-100 text-muted hover:bg-slate-200'}`}
          >
            {item.label}
            <span className={`ml-2 text-xs ${active ? 'text-white/70' : 'text-subtle'}`}>
              {item.count ?? 0}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// Ko'rsatkich izohi — raqam nimani anglatishini tushuntiradi
export function InfoTip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-label={text}
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        className="text-subtle transition-colors hover:text-ink"
      >
        <Info size={14} />
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-20 mb-1.5 w-56 -translate-x-1/2 rounded-lg bg-ink px-3 py-2 text-xs font-normal leading-snug text-white shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}

const TONES = {
  blue: 'bg-blue-50 text-blue-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-600',
};

// Ko'rsatkich kartochkasi — dashboard, statistika va moliya sahifalarida bir xil
export function StatCard({ icon: Icon, tone = 'indigo', value, label, hint, tip, children }) {
  return (
    <div className="card p-5">
      {Icon && (
        <span className={`grid h-11 w-11 place-items-center rounded-xl ${TONES[tone] || TONES.indigo}`}>
          <Icon size={20} />
        </span>
      )}
      <div className="mt-3 font-display text-2xl font-bold">{value}</div>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm text-muted">
          {label}
          {tip && <InfoTip text={tip} />}
        </span>
        {children}
      </div>
      {hint && <div className="mt-0.5 text-xs text-muted">{hint}</div>}
    </div>
  );
}

// Jadval qobig'i — kartochka, gorizontal scroll va bir xil sarlavha uslubi
export function DataTable({ columns, children, footer }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line bg-slate-50 text-left text-xs uppercase text-muted">
            <tr>
              {columns.map((c, i) => (
                <th
                  key={i}
                  className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : ''}`}
                  style={c.minWidth ? { minWidth: c.minWidth } : undefined}
                >
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">{children}</tbody>
        </table>
      </div>
      {footer}
    </div>
  );
}

// Ism bosh harfi bilan dumaloq avatar
export function Avatar({ name, size = 8 }) {
  const cls = size === 9 ? 'h-9 w-9' : size === 11 ? 'h-11 w-11' : 'h-8 w-8';
  return (
    <span className={`grid ${cls} shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white`}>
      {name?.charAt(0)?.toUpperCase() || 'U'}
    </span>
  );
}
