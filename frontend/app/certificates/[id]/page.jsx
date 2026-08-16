'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Printer, Share2, FileText } from 'lucide-react';
import { api } from '@/lib/api';
import { Spinner, ErrorState } from '@/components/ui';
import CourseRatingForm from '@/components/CourseRatingForm';
import CertificateSheet from '@/components/certificate/CertificateSheet';
import ShareCard from '@/components/certificate/ShareCard';

export default function CertificatePage() {
  const { id } = useParams();
  const [cert, setCert] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('sheet'); // 'sheet' | 'share'
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    setOrigin(window.location.origin);
    api.get(`/certificates/${id}`, { auth: false })
      .then((res) => setCert(res.certificate))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <div className="container-page py-10"><ErrorState message={error} /></div>;
  if (!cert) return null;

  const verifyUrl = `${origin}/certificates/${cert.id}`;

  return (
    <div className="container-page max-w-4xl py-8 sm:py-12">
      {/* Ko'rinish tanlash — varaqa yoki ulashish kartasi */}
      <div className="no-print mb-6 flex justify-center">
        <div className="inline-flex rounded-xl border border-line bg-surface p-1">
          <button
            type="button"
            onClick={() => setTab('sheet')}
            aria-pressed={tab === 'sheet'}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors
              ${tab === 'sheet' ? 'bg-primary text-on-primary' : 'text-muted hover:bg-slate-100'}`}
          >
            <FileText size={16} /> Sertifikat
          </button>
          <button
            type="button"
            onClick={() => setTab('share')}
            aria-pressed={tab === 'share'}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors
              ${tab === 'share' ? 'bg-primary text-on-primary' : 'text-muted hover:bg-slate-100'}`}
          >
            <Share2 size={16} /> Ulashish kartasi
          </button>
        </div>
      </div>

      {/* Varaqa har doim DOM da qoladi — chop etishda faqat shu chiqadi */}
      <div className={tab === 'sheet' ? '' : 'hidden print:block'}>
        <CertificateSheet
          fullName={cert.user.fullName}
          courseTitle={cert.course.title}
          authorName={cert.course.authorName}
          serial={cert.serial}
          issuedAt={cert.issuedAt}
          verifyUrl={verifyUrl}
        />

        <div className="no-print mt-6 text-center">
          <button onClick={() => window.print()} className="btn-primary">
            <Printer size={16} /> Chop etish / PDF saqlash
          </button>
          <p className="mt-2 text-xs text-muted">
            Bosma oynasida «Maqsad: PDF sifatida saqlash» ni tanlang.
          </p>
        </div>
      </div>

      {tab === 'share' && (
        <div className="print:hidden">
          <ShareCard cert={cert} verifyUrl={verifyUrl} />
          <p className="mt-4 text-center text-sm text-muted">
            Kvadrat karta — Instagram, Telegram va LinkedIn uchun mos.
          </p>
        </div>
      )}

      {/* Kursga baho + izoh (bir marta qo'yilgan baho hamma sahifada ko'rinadi) */}
      {cert.course?.slug && (
        <div className="no-print mx-auto mt-12 max-w-xl border-t border-line pt-8">
          <div className="mb-3 text-center">
            <h2 className="text-lg font-semibold text-heading">Kursni baholang</h2>
            <p className="text-sm text-muted">Tajribangiz haqida fikringizni qoldiring.</p>
          </div>
          <CourseRatingForm slug={cert.course.slug} />
        </div>
      )}

      <style jsx global>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          header, footer, .no-print { display: none !important; }
          body { background: #fff !important; }
          .certificate {
            box-shadow: none !important;
            border-radius: 0 !important;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
