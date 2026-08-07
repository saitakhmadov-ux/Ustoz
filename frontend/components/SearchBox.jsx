'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

// Qidiruv oynasi — yuborilganda /courses?search=... ga o'tadi.
// withButton=true bo'lsa yonida "Qidirish" tugmasi chiqadi (hero uchun).
export default function SearchBox({
  placeholder = 'Kurs qidirish...',
  className = '',
  withButton = false,
  onDone,
}) {
  const [q, setQ] = useState('');
  const router = useRouter();

  const submit = (e) => {
    e.preventDefault();
    const query = q.trim();
    router.push(query ? `/courses?search=${encodeURIComponent(query)}` : '/courses');
    onDone?.();
  };

  return (
    <form onSubmit={submit} className={`flex gap-2 ${className}`}>
      <div className="relative flex-1">
        {/* Ikona ham submit tugmasi — bosib yoki Enter bilan qidirish mumkin */}
        <button
          type="submit"
          className="absolute left-0 top-0 grid h-full w-10 place-items-center text-slate-400 transition-colors hover:text-primary"
          aria-label="Qidirish"
        >
          <Search size={18} />
        </button>
        <input
          className="input w-full pl-10"
          placeholder={placeholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Kurs qidirish"
        />
      </div>
      {withButton && <button type="submit" className="btn-primary shrink-0">Qidirish</button>}
    </form>
  );
}
