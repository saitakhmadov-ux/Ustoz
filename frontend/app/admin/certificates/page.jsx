'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Award, Trash2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Spinner, ErrorState, EmptyState, Pagination } from '@/components/ui';

export default function AdminCertificatesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (q) params.set('q', q);

    api.get(`/admin/certificates?${params}`)
      .then((res) => { setData(res); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [q, page]);

  useEffect(() => { load(); }, [load]);

  const certificates = data?.certificates || [];

  const revoke = async (c) => {
    const who = c.user?.fullName || 'Foydalanuvchi';
    if (!confirm(
      `${who}ning "${c.course?.title}" sertifikatini bekor qilasizmi?\n\n` +
      'Eslatma: agar o\'quvchi kursni 100% tugatgan holatda qolsa, keyingi ' +
      'vazifa bajarilishida sertifikat qayta beriladi.'
    )) return;
    try {
      await api.del(`/admin/certificates/${c.id}`);
      if (certificates.length === 1 && page > 1) setPage(page - 1);
      else load();
    } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <h1 className="text-2xl">Sertifikatlar</h1>
      <p className="mt-1 text-sm text-muted">Kursni tugatgan o'quvchilarga berilgan sertifikatlar</p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            placeholder="Ism, email, kurs yoki sertifikat raqami..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {q && (
          <button type="button" onClick={() => { setSearch(''); setQ(''); setPage(1); }} className="btn-ghost">
            <X size={16} /> Tozalash
          </button>
        )}
      </div>

      <div className="mt-4">
        {error ? <ErrorState message={error} /> : loading ? <Spinner /> : certificates.length === 0 ? (
          <EmptyState
            title="Sertifikat topilmadi"
            text={q ? 'Qidiruvni o\'zgartirib ko\'ring.' : 'Hali hech kim kursni tugatmagan.'}
            icon={Award}
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-slate-50 text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">O'quvchi</th>
                    <th className="px-4 py-3">Kurs</th>
                    <th className="px-4 py-3">Raqam</th>
                    <th className="px-4 py-3">Berilgan sana</th>
                    <th className="px-4 py-3 text-right">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {certificates.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <Link href={`/admin/users/${c.user?.id}`} className="font-medium hover:text-primary">
                          {c.user?.fullName}
                        </Link>
                        <p className="text-xs text-muted">{c.user?.email}</p>
                      </td>
                      <td className="px-4 py-3"><span className="line-clamp-1">{c.course?.title}</span></td>
                      <td className="px-4 py-3 font-mono text-xs text-muted">{c.serial}</td>
                      <td className="px-4 py-3 text-muted">
                        {new Date(c.issuedAt).toLocaleDateString('uz-UZ')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/certificates/${c.id}`} className="text-primary hover:underline">
                            Ko'rish
                          </Link>
                          <button
                            onClick={() => revoke(c)}
                            title="Bekor qilish"
                            className="grid h-8 w-8 place-items-center rounded-lg text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={data.pagination.page}
              pages={data.pagination.pages}
              total={data.pagination.total}
              onChange={setPage}
              label="sertifikat"
            />
          </div>
        )}
      </div>
    </div>
  );
}
