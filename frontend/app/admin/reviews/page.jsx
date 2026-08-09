'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, MessageSquare, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { StarRating } from '@/components/Stars';
import { Spinner, ErrorState, EmptyState, Pagination } from '@/components/ui';

export default function AdminReviewsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtrlar
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [rating, setRating] = useState('');
  const [withComment, setWithComment] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (q) params.set('q', q);
    if (rating) params.set('rating', rating);
    if (withComment) params.set('withComment', '1');

    api.get(`/admin/reviews?${params}`)
      .then((res) => { setData(res); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [q, rating, withComment, page]);

  useEffect(() => { load(); }, [load]);

  const reviews = data?.reviews || [];
  const hasFilter = q || rating || withComment;

  const remove = async (r) => {
    const who = r.user?.fullName || 'Foydalanuvchi';
    if (!confirm(`${who}ning "${r.course?.title}" kursiga qoldirgan sharhini o'chirasizmi?`)) return;
    try {
      await api.del(`/admin/reviews/${r.id}`);
      // Sahifadagi oxirgi sharh o'chirilsa — bo'sh sahifada qolmaslik uchun orqaga qaytamiz
      if (reviews.length === 1 && page > 1) setPage(page - 1);
      else load();
    } catch (err) { alert(err.message); }
  };

  const resetFilters = () => {
    setSearch(''); setQ(''); setRating(''); setWithComment(false); setPage(1);
  };

  return (
    <div>
      <h1 className="text-2xl">Sharhlar</h1>
      <p className="mt-1 text-sm text-muted">
        O'quvchilar qoldirgan baho va izohlar — nomaqbullarini o'chirishingiz mumkin
      </p>

      {/* Qidiruv va filtrlar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            placeholder="Izoh matni, ism, email yoki kurs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input max-w-[160px]"
          value={rating}
          onChange={(e) => { setRating(e.target.value); setPage(1); }}
        >
          <option value="">Barcha baholar</option>
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>{n} yulduz</option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={withComment}
            onChange={(e) => { setWithComment(e.target.checked); setPage(1); }}
            className="h-4 w-4 rounded border-line accent-indigo-600"
          />
          Faqat izohlilari
        </label>
        {hasFilter && (
          <button type="button" onClick={resetFilters} className="btn-ghost">
            <X size={16} /> Tozalash
          </button>
        )}
      </div>

      <div className="mt-4">
        {error ? <ErrorState message={error} /> : loading ? <Spinner /> : reviews.length === 0 ? (
          <EmptyState
            title="Sharh topilmadi"
            text={hasFilter ? 'Filtrni o\'zgartirib ko\'ring.' : 'Hali hech kim baho qoldirmagan.'}
            icon={MessageSquare}
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="divide-y divide-line">
              {reviews.map((r) => (
                <div key={r.id} className="flex gap-4 p-5 hover:bg-slate-50">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-white">
                    {r.user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold">{r.user?.fullName}</span>
                      <span className="text-xs text-muted">{r.user?.email}</span>
                      <StarRating value={r.rating} size={13} />
                    </div>

                    <p className="mt-1 text-xs text-muted">
                      {r.course?.slug ? (
                        <Link href={`/courses/${r.course.slug}`} className="hover:text-primary hover:underline">
                          {r.course.title}
                        </Link>
                      ) : r.course?.title}
                      {' · '}
                      {new Date(r.createdAt).toLocaleDateString('uz-UZ')}
                    </p>

                    {r.comment ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-ink/90">{r.comment}</p>
                    ) : (
                      <p className="mt-2 text-sm italic text-slate-400">Izohsiz — faqat baho</p>
                    )}
                  </div>

                  <button
                    onClick={() => remove(r)}
                    title="Sharhni o'chirish"
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <Pagination
              page={data.pagination.page}
              pages={data.pagination.pages}
              total={data.pagination.total}
              onChange={setPage}
              label="sharh"
            />
          </div>
        )}
      </div>
    </div>
  );
}
