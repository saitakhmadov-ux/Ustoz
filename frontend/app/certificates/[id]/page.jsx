'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Award, Download, GraduationCap } from 'lucide-react';
import { api } from '@/lib/api';
import { SITE_NAME } from '@/lib/constants';
import { Spinner, ErrorState } from '@/components/ui';

export default function CertificatePage() {
  const { id } = useParams();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/certificates/${id}`, { auth: false })
      .then((res) => setCert(res.certificate))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <div className="container-page py-10"><ErrorState message={error} /></div>;
  if (!cert) return null;

  const date = new Date(cert.issuedAt).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="container-page max-w-4xl py-10">
      {/* Sertifikat varaqasi */}
      <div className="certificate relative overflow-hidden rounded-3xl border-4 border-primary bg-white p-8 shadow-card md:p-14">
        {/* Bezak */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-50" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-amber-50" />

        <div className="relative text-center">
          <div className="flex items-center justify-center gap-2 text-primary">
            <GraduationCap size={28} />
            <span className="font-display text-xl font-bold">{SITE_NAME}</span>
          </div>

          <p className="mt-8 text-sm uppercase tracking-[0.3em] text-muted">Sertifikat</p>
          <div className="mx-auto mt-2 h-1 w-16 rounded bg-accent" />

          <p className="mt-8 text-muted">Ushbu sertifikat</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-ink md:text-4xl">{cert.user.fullName}</h1>
          <p className="mt-4 text-muted">quyidagi kursni muvaffaqiyatli tamomlaganini tasdiqlaydi:</p>
          <h2 className="mt-2 font-display text-xl font-semibold text-primary md:text-2xl">
            «{cert.course.title}»
          </h2>

          <div className="mt-10 flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="text-center sm:text-left">
              <p className="text-sm text-muted">Berilgan sana</p>
              <p className="font-semibold">{date}</p>
            </div>
            <Award size={56} className="text-amber-400" />
            <div className="text-center sm:text-right">
              <p className="text-sm text-muted">Sertifikat raqami</p>
              <p className="font-mono text-sm font-semibold">{cert.serial}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center no-print">
        <button onClick={() => window.print()} className="btn-primary">
          <Download size={16} /> Sertifikatni chop etish / PDF
        </button>
      </div>

      <style jsx global>{`
        @media print {
          header, footer, .no-print { display: none !important; }
          body { background: white !important; }
          .certificate { border-color: #0d9488 !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
