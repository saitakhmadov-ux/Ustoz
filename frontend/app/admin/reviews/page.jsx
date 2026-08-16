'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { MessageSquare, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useTableQuery } from '@/lib/useTableQuery';
import { StarRating } from '@/components/Stars';
import { Spinner, ErrorState, EmptyState, Pagination } from '@/components/ui';
import { PageHeader, DataToolbar, FilterSelect, FilterCheckbox, Avatar } from '@/components/admin/table';

const RATINGS = [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} yulduz` }));

export default function AdminReviewsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const t = useTableQuery({ filters: { q: '', rating: '', withComment: false } });

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/reviews?${t.params}`)
      .then((res) => { setData(res); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [t.params]);

  useEffect(() => { load(); }, [load]);

  const reviews = data?.reviews || [];

  const remove = async (r) => {
    const who = r.user?.fullName || 'Foydalanuvchi';
    if (!confirm(`${who}ning "${r.course?.title}" kursiga qoldirgan sharhini o'chirasizmi?`)) return;
    try {
      await api.del(`/admin/reviews/${r.id}`);
      t.pageBackIfEmpty(reviews.length, load);
    } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <PageHeader
        title="Sharhlar"
        subtitle="O'quvchilar qoldirgan baho va izohlar — nomaqbullarini o'chirishingiz mumkin"
      />

      <DataToolbar
        search={t.search}
        onSearch={t.setSearch}
        placeholder="Izoh matni, ism, email yoki kurs..."
        hasFilters={t.hasFilters}
        onReset={t.reset}
      >
        <FilterSelect
          value={t.values.rating}
          onChange={(v) => t.set('rating', v)}
          options={RATINGS}
          placeholder="Barcha baholar"
          width="160px"
        />
        <FilterCheckbox
          checked={!!t.values.withComment}
          onChange={(v) => t.set('withComment', v)}
          label="Faqat izohlilari"
        />
      </DataToolbar>

      <div className="mt-4">
        {error ? <ErrorState message={error} /> : loading ? <Spinner /> : reviews.length === 0 ? (
          <EmptyState
            title="Sharh topilmadi"
            text={t.hasFilters ? 'Filtrni o\'zgartirib ko\'ring.' : 'Hali hech kim baho qoldirmagan.'}
            icon={MessageSquare}
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="divide-y divide-line">
              {reviews.map((r) => (
                <div key={r.id} className="flex gap-4 p-5 hover:bg-slate-50">
                  <Avatar name={r.user?.fullName} size={9} />

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
                      <p className="mt-2 text-sm italic text-subtle">Izohsiz — faqat baho</p>
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
              onChange={t.setPage}
              label="sharh"
            />
          </div>
        )}
      </div>
    </div>
  );
}
