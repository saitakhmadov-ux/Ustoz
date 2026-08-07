'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShieldCheck, Loader2, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice, courseAccessMonthsLabel, LEVELS } from '@/lib/constants';
import RequireAuth from '@/components/RequireAuth';
import { Spinner, ErrorState } from '@/components/ui';

function CheckoutInner() {
  const { slug } = useParams();
  const router = useRouter();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState('CLICK');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    api.get(`/courses/${slug}`)
      .then((res) => {
        if (res.course.isEnrolled) {
          router.replace(`/learn/${slug}`);
          return;
        }
        if (res.course.isFree) {
          router.replace(`/courses/${slug}`);
          return;
        }
        setCourse(res.course);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [slug, router]);

  const handlePay = async () => {
    setPaying(true);
    setError('');
    try {
      const res = await api.post('/payments', { courseId: course.id, provider });
      router.push(`/receipt/${res.payment.id}`);
    } catch (err) {
      setError(err.message);
      setPaying(false);
    }
  };

  if (loading) return <Spinner />;
  if (error && !course) return <div className="container-page py-10"><ErrorState message={error} /></div>;
  if (!course) return null;

  const providers = [
    { id: 'CLICK', name: 'Click', desc: 'Click orqali to\'lash', color: 'text-sky-600' },
    { id: 'PAYME', name: 'Payme', desc: 'Payme orqali to\'lash', color: 'text-indigo-600' },
  ];

  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-3xl">To'lovni rasmiylashtirish</h1>
      <p className="mt-2 text-muted">Kursga to'liq kirish uchun to'lovni amalga oshiring</p>

      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_320px]">
        {/* To'lov usuli */}
        <div className="card p-6">
          <h2 className="text-lg">To'lov usulini tanlang</h2>
          <div className="mt-4 space-y-3">
            {providers.map((p) => (
              <label
                key={p.id}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3.5 transition-colors
                  ${provider === p.id ? 'border-primary bg-indigo-50/50' : 'border-line hover:border-slate-300'}`}
              >
                <input
                  type="radio"
                  name="provider"
                  checked={provider === p.id}
                  onChange={() => setProvider(p.id)}
                  className="h-4 w-4 text-primary focus:ring-primary"
                />
                <CreditCard size={20} className={p.color} />
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-sm text-muted">{p.desc}</div>
                </div>
              </label>
            ))}
          </div>

          <div className="mt-5 flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <ShieldCheck size={18} className="mt-0.5 shrink-0" />
            <span>Test rejim: haqiqiy pul yechilmaydi. To'lov darhol tasdiqlanadi.</span>
          </div>

          {error && <div className="mt-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        </div>

        {/* Buyurtma xulosasi */}
        <div className="card h-fit p-6">
          <h2 className="text-lg">Buyurtma</h2>
          <div className="mt-4 flex gap-3">
            <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-slate-100">
              {course.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.thumbnail} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div>
              <p className="text-sm font-medium leading-snug">{course.title}</p>
              <p className="text-xs text-muted">{course.authorName}</p>
            </div>
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Kurs narxi</span>
              <span>{formatPrice(course.price)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted">Foydalanish muddati</span>
              <span className="font-medium">{courseAccessMonthsLabel(course)} ({LEVELS[course.level]})</span>
            </div>
            <div className="mt-3 flex justify-between font-display text-lg font-bold">
              <span>Jami</span>
              <span className="text-primary">{formatPrice(course.price)}</span>
            </div>
          </div>

          <button onClick={handlePay} disabled={paying} className="btn-primary mt-5 w-full">
            {paying && <Loader2 size={16} className="animate-spin" />}
            {paying ? 'To\'lanmoqda...' : 'To\'lash'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <CheckoutInner />
    </RequireAuth>
  );
}
