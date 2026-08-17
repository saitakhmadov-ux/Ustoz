'use client';

// Moliya boʻlimining "Toʻlovlar" yorligʻi — barcha tranzaksiyalar roʻyxati.
// Yigʻindi kartochkalari faqat filtr qoʻllanganda koʻrsatiladi: filtrsiz holatda
// bu raqamlar sahifa boshidagi "Jami aylanma" bilan bir xil boʻlardi.

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Wallet, Receipt } from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/constants';
import { useTableQuery } from '@/lib/useTableQuery';
import { Spinner, ErrorState, EmptyState, Pagination } from '@/components/ui';
import { DataToolbar, FilterSelect, DataTable, StatCard } from '@/components/admin/table';

const STATUS = {
  PAID: { label: "Toʻlangan", cls: 'bg-emerald-50 text-emerald-700' },
  PENDING: { label: 'Kutilmoqda', cls: 'bg-amber-50 text-amber-700' },
  FAILED: { label: 'Muvaffaqiyatsiz', cls: 'bg-red-50 text-red-700' },
};

const STATUS_OPTIONS = [
  { value: 'PAID', label: "Toʻlangan" },
  { value: 'PENDING', label: 'Kutilmoqda' },
  { value: 'FAILED', label: 'Muvaffaqiyatsiz' },
];

const PROVIDER_OPTIONS = [
  { value: 'CLICK', label: 'Click' },
  { value: 'PAYME', label: 'Payme' },
];

const COLUMNS = [
  { label: 'Foydalanuvchi' },
  { label: 'Kurs' },
  { label: 'Summa' },
  { label: 'Provayder' },
  { label: 'Holat' },
  { label: 'Sana' },
  { label: 'Chek', align: 'right' },
];

export default function PaymentsTable() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const t = useTableQuery({ filters: { q: '', status: '', provider: '' } });

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/payments?${t.params}`)
      .then((res) => { setData(res); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [t.params]);

  useEffect(() => { load(); }, [load]);

  const payments = data?.payments || [];

  return (
    <div>
      <DataToolbar
        search={t.search}
        onSearch={t.setSearch}
        placeholder="Ism, email, kurs yoki tranzaksiya ID..."
        hasFilters={t.hasFilters}
        onReset={t.reset}
      >
        <FilterSelect
          value={t.values.status}
          onChange={(v) => t.set('status', v)}
          options={STATUS_OPTIONS}
          placeholder="Barcha holatlar"
          width="180px"
        />
        <FilterSelect
          value={t.values.provider}
          onChange={(v) => t.set('provider', v)}
          options={PROVIDER_OPTIONS}
          placeholder="Barcha provayder"
          width="160px"
        />
      </DataToolbar>

      {/* Faqat filtrlangan kesim uchun yigʻindi */}
      {t.hasFilters && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <StatCard
            icon={Wallet}
            tone="emerald"
            value={formatPrice(data?.summary?.paidRevenue || 0)}
            label="Filtr boʻyicha aylanma"
          />
          <StatCard
            icon={Receipt}
            tone="indigo"
            value={data?.summary?.paidCount || 0}
            label="Filtr boʻyicha sotuv"
          />
        </div>
      )}

      <div className="mt-4">
        {error ? <ErrorState message={error} /> : loading ? <Spinner /> : payments.length === 0 ? (
          <EmptyState
            title="Toʻlov topilmadi"
            text={t.hasFilters ? 'Filtrni oʻzgartirib koʻring.' : 'Hali hech qanday toʻlov amalga oshirilmagan.'}
            icon={Wallet}
          />
        ) : (
          <DataTable
            columns={COLUMNS}
            footer={
              <Pagination
                page={data.pagination.page}
                pages={data.pagination.pages}
                total={data.pagination.total}
                onChange={t.setPage}
                label="toʻlov"
              />
            }
          >
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
                      Koʻrish
                    </Link>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </div>
    </div>
  );
}
