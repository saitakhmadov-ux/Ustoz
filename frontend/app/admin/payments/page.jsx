'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Wallet, Receipt, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/constants';
import { Spinner, ErrorState, EmptyState, Pagination } from '@/components/ui';

// To'lov holati bo'yicha ko'rinish
const STATUS = {
  PAID: { label: "To'langan", cls: 'bg-emerald-50 text-emerald-700' },
  PENDING: { label: 'Kutilmoqda', cls: 'bg-amber-50 text-amber-700' },
  FAILED: { label: 'Muvaffaqiyatsiz', cls: 'bg-red-50 text-red-700' },
};

export default function AdminPaymentsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtrlar
  const [search, setSearch] = useState('');   // input qiymati
  const [q, setQ] = useState('');             // haqiqiy so'rov (debounce'dan keyin)
  const [status, setStatus] = useState('');
  const [provider, setProvider] = useState('');
  const [page, setPage] = useState(1);

  // Yozishni to'xtatgandan 400ms keyin qidiramiz
  useEffect(() => {
    const t = setTimeout(() => { setQ(search.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    if (provider) params.set('provider', provider);

    api.get(`/admin/payments?${params}`)
      .then((res) => { setData(res); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [q, status, provider, page]);

  useEffect(() => { load(); }, [load]);

  const payments = data?.payments || [];
  const hasFilter = q || status || provider;

  const resetFilters = () => {
    setSearch(''); setQ(''); setStatus(''); setProvider(''); setPage(1);
  };

  return (
    <div>
      <h1 className="text-2xl">To'lovlar</h1>
      <p className="mt-1 text-sm text-muted">Platformadagi barcha to'lov tranzaksiyalari</p>

      {/* Joriy filtr bo'yicha yig'indi */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
            <Wallet size={20} />
          </span>
          <div className="mt-3 font-display text-2xl font-bold">
            {formatPrice(data?.summary?.paidRevenue || 0)}
          </div>
          <div className="text-sm text-muted">
            To'langan summa {hasFilter && <span className="text-xs">(filtr bo'yicha)</span>}
          </div>
        </div>
        <div className="card p-5">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
            <Receipt size={20} />
          </span>
          <div className="mt-3 font-display text-2xl font-bold">{data?.summary?.paidCount || 0}</div>
          <div className="text-sm text-muted">
            Muvaffaqiyatli sotuv {hasFilter && <span className="text-xs">(filtr bo'yicha)</span>}
          </div>
        </div>
      </div>

      {/* Qidiruv va filtrlar */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            placeholder="Ism, email, kurs yoki tranzaksiya ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="input max-w-[180px]"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">Barcha holatlar</option>
          <option value="PAID">To'langan</option>
          <option value="PENDING">Kutilmoqda</option>
          <option value="FAILED">Muvaffaqiyatsiz</option>
        </select>
        <select
          className="input max-w-[160px]"
          value={provider}
          onChange={(e) => { setProvider(e.target.value); setPage(1); }}
        >
          <option value="">Barcha provayder</option>
          <option value="CLICK">Click</option>
          <option value="PAYME">Payme</option>
        </select>
        {hasFilter && (
          <button type="button" onClick={resetFilters} className="btn-ghost">
            <X size={16} /> Tozalash
          </button>
        )}
      </div>

      <div className="mt-4">
        {error ? <ErrorState message={error} /> : loading ? <Spinner /> : payments.length === 0 ? (
          <EmptyState
            title="To'lov topilmadi"
            text={hasFilter ? 'Filtrni o\'zgartirib ko\'ring.' : 'Hali hech qanday to\'lov amalga oshirilmagan.'}
            icon={Wallet}
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-slate-50 text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Foydalanuvchi</th>
                    <th className="px-4 py-3">Kurs</th>
                    <th className="px-4 py-3">Summa</th>
                    <th className="px-4 py-3">Provayder</th>
                    <th className="px-4 py-3">Holat</th>
                    <th className="px-4 py-3">Sana</th>
                    <th className="px-4 py-3 text-right">Chek</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {payments.map((p) => {
                    const st = STATUS[p.status] || { label: p.status, cls: 'bg-slate-100 text-slate-600' };
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <p className="font-medium">{p.user?.fullName}</p>
                          <p className="text-xs text-muted">{p.user?.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="line-clamp-1">{p.course?.title}</span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-primary">{formatPrice(p.amount)}</td>
                        <td className="px-4 py-3 text-muted">{p.provider}</td>
                        <td className="px-4 py-3">
                          <span className={`badge ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {new Date(p.createdAt).toLocaleDateString('uz-UZ')}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/receipt/${p.id}`} className="text-primary hover:underline">
                            Ko'rish
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              page={data.pagination.page}
              pages={data.pagination.pages}
              total={data.pagination.total}
              onChange={setPage}
              label="to'lov"
            />
          </div>
        )}
      </div>
    </div>
  );
}
