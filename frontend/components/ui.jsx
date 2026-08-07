// Kichik qayta ishlatiladigan UI komponentlar
import { Loader2, Inbox } from 'lucide-react';

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
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-50 text-slate-400">
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
