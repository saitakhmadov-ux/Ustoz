'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Download, PlayCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice, PAYMENT_PROVIDERS, PAYMENT_STATUS } from '@/lib/constants';
import RequireAuth from '@/components/RequireAuth';
import { Spinner, ErrorState } from '@/components/ui';

function ReceiptInner() {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/payments/${id}`)
      .then((res) => setPayment(res.payment))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner />;
  if (error) return <div className="container-page py-10"><ErrorState message={error} /></div>;
  if (!payment) return null;

  const paid = payment.status === 'PAID';
  const date = new Date(payment.createdAt).toLocaleString('uz-UZ');

  return (
    <div className="container-page max-w-lg py-10">
      <div className="card overflow-hidden">
        {/* Sarlavha */}
        <div className={`px-6 py-8 text-center text-white ${paid ? 'bg-gradient-to-r from-band-from to-band-to' : 'bg-inverse'}`}>
          {paid && <CheckCircle2 size={48} className="mx-auto" />}
          <h1 className="mt-3 text-2xl text-white">
            {paid ? 'Toʻlov muvaffaqiyatli!' : 'Toʻlov holati'}
          </h1>
          <p className="mt-1 text-white/85">{PAYMENT_STATUS[payment.status]}</p>
        </div>

        {/* Chek tafsilotlari */}
        <div className="p-6">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-sm font-semibold">{payment.course.title}</p>
          </div>

          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Chek raqami</dt>
              <dd className="font-mono text-xs">{payment.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Tranzaksiya ID</dt>
              <dd className="font-mono text-xs">{payment.transactionId}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Toʻlov usuli</dt>
              <dd>{PAYMENT_PROVIDERS[payment.provider]}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Xaridor</dt>
              <dd>{payment.user.fullName}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Sana</dt>
              <dd>{date}</dd>
            </div>
            {/* Promo kod ishlatilgan boʻlsa — asl narx va chegirma koʻrsatiladi */}
            {payment.discountPct > 0 && (
              <>
                <div className="flex justify-between border-t border-line pt-3">
                  <dt className="text-muted">Kurs narxi</dt>
                  <dd className="text-muted line-through">
                    {formatPrice(payment.originalAmount || payment.amount)}
                  </dd>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <dt>
                    Chegirma ({payment.discountPct}%)
                    {payment.promoCode && (
                      <span className="ml-1.5 font-mono text-xs">{payment.promoCode.code}</span>
                    )}
                  </dt>
                  <dd>
                    − {formatPrice((payment.originalAmount || payment.amount) - payment.amount)}
                  </dd>
                </div>
              </>
            )}
            <div className="flex justify-between border-t border-line pt-3 font-display text-base font-bold">
              <dt>Jami</dt>
              <dd className="text-primary">{formatPrice(payment.amount)}</dd>
            </div>
          </dl>

          {paid && (
            <Link href={`/learn/${payment.course.slug}`} className="btn-primary mt-6 w-full">
              <PlayCircle size={18} /> Kursni boshlash
            </Link>
          )}
          <button onClick={() => window.print()} className="btn-outline mt-2 w-full">
            <Download size={16} /> Chekni chop etish
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReceiptPage() {
  return (
    <RequireAuth>
      <ReceiptInner />
    </RequireAuth>
  );
}
