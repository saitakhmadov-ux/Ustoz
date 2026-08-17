'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Award } from 'lucide-react';
import { api } from '@/lib/api';
import RequireAuth from '@/components/RequireAuth';
import { Spinner, ErrorState, EmptyState } from '@/components/ui';

function CertificatesInner() {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/me/certificates')
      .then((res) => setCertificates(res.certificates))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl">Sertifikatlarim</h1>
      <p className="mt-1 text-muted">Tugatgan kurslaringiz uchun olingan sertifikatlar</p>

      <div className="mt-6">
        {error ? (
          <ErrorState message={error} />
        ) : loading ? (
          <Spinner />
        ) : certificates.length === 0 ? (
          <EmptyState
            title="Hali sertifikat yoʻq"
            text="Kursni 100% tugatganingizda sertifikat avtomatik beriladi"
            icon={Award}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {certificates.map((c) => (
              <Link key={c.id} href={`/certificates/${c.id}`} className="card p-6 transition-all hover:shadow-card-hover">
                <Award size={32} className="text-amber-500" />
                <h3 className="mt-3 font-display font-semibold leading-snug">{c.course.title}</h3>
                <p className="mt-1 font-mono text-xs text-muted">{c.serial}</p>
                <p className="mt-2 text-sm text-muted">
                  {new Date(c.issuedAt).toLocaleDateString('uz-UZ')}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CertificatesPage() {
  return (
    <RequireAuth>
      <CertificatesInner />
    </RequireAuth>
  );
}
