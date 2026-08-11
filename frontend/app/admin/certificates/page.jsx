'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Award, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useTableQuery } from '@/lib/useTableQuery';
import { Spinner, ErrorState, EmptyState, Pagination } from '@/components/ui';
import { PageHeader, DataToolbar, DataTable } from '@/components/admin/table';

const COLUMNS = [
  { label: "O'quvchi" },
  { label: 'Kurs' },
  { label: 'Raqam' },
  { label: 'Berilgan sana' },
  { label: 'Amal', align: 'right' },
];

export default function AdminCertificatesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const t = useTableQuery({ filters: { q: '' } });

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/certificates?${t.params}`)
      .then((res) => { setData(res); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [t.params]);

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
      t.pageBackIfEmpty(certificates.length, load);
    } catch (err) { alert(err.message); }
  };

  return (
    <div>
      <PageHeader
        title="Sertifikatlar"
        subtitle="Kursni tugatgan o'quvchilarga berilgan sertifikatlar"
      />

      <DataToolbar
        search={t.search}
        onSearch={t.setSearch}
        placeholder="Ism, email, kurs yoki sertifikat raqami..."
        hasFilters={t.hasFilters}
        onReset={t.reset}
      />

      <div className="mt-4">
        {error ? <ErrorState message={error} /> : loading ? <Spinner /> : certificates.length === 0 ? (
          <EmptyState
            title="Sertifikat topilmadi"
            text={t.hasFilters ? 'Qidiruvni o\'zgartirib ko\'ring.' : 'Hali hech kim kursni tugatmagan.'}
            icon={Award}
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
                label="sertifikat"
              />
            }
          >
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
          </DataTable>
        )}
      </div>
    </div>
  );
}
