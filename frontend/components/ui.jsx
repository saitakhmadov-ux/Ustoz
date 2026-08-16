// Kichik qayta ishlatiladigan UI komponentlar
import { Loader2, Inbox, ChevronLeft, ChevronRight } from 'lucide-react';

export function Spinner({ label = 'Yuklanmoqda...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted">
      <Loader2 size={28} className="animate-spin text-primary" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ title = 'Hozircha bo\'sh', text, icon: Icon = Inbox }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line py-16 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-50 text-subtle">
        <Icon size={26} />
      </span>
      <div>
        <p className="font-semibold text-ink">{title}</p>
        {text && <p className="mt-1 text-sm text-muted">{text}</p>}
      </div>
    </div>
  );
}

export function ErrorState({ message = 'Xatolik yuz berdi' }) {
  return (
    <div className="rounded-2xl bg-red-50 px-4 py-4 text-center text-sm text-red-700">
      {message}
    </div>
  );
}

// Sahifalash — admin ro'yxatlari uchun (foydalanuvchilar, sharhlar, to'lovlar)
export function Pagination({ page, pages, total, onChange, label = 'yozuv' }) {
  if (!pages || pages <= 1) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 text-sm">
      <span className="text-muted">
        Jami {total} ta {label} · {page}/{pages} sahifa
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="btn-outline px-3 py-1.5"
        >
          <ChevronLeft size={15} /> Oldingi
        </button>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
          className="btn-outline px-3 py-1.5"
        >
          Keyingi <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-video animate-pulse bg-slate-100" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}
