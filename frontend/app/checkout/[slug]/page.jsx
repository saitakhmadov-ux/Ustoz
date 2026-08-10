'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck, Loader2, CreditCard, Ticket, Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import { formatPrice, courseAccessMonthsLabel, LEVELS } from '@/lib/constants';
import RequireAuth from '@/components/RequireAuth';
import { Spinner, ErrorState } from '@/components/ui';

function CheckoutInner() {
  const { slug } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [provider, setProvider] = useState('CLICK');
  const [paying, setPaying] = useState(false);

  // Promo kod holati
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState(null); // tasdiqlangan kod
  const [promoError, setPromoError] = useState('');
  const [checking, setChecking] = useState(false);

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

  // Kodni tekshirib, chegirmani hisoblaydi
  const applyPromo = async (code, silent = false) => {
    const value = String(code || '').trim().toUpperCase();
    if (!value || !course) return;
    setChecking(true);
    setPromoError('');
    try {
      const res = await api.post('/payments/promo/validate', { code: value, courseId: course.id });
      if (res.valid) {
        setPromo(res);
        setPromoInput(res.code);
      } else {
        setPromo(null);
        // Havoladan avtomatik qo'llanganda xatoni jimgina o'tkazib yubormaymiz,
        // lekin uni yumshoqroq ko'rsatamiz
        setPromoError(silent ? `Havoladagi kod qo'llanmadi: ${res.reason}` : res.reason);
      }
    } catch (err) {
      setPromo(null);
      setPromoError(err.message);
    } finally {
      setChecking(false);
    }
  };

  // Havolada ?promo=KOD bo'lsa — kurs yuklangach avtomatik qo'llaymiz
  useEffect(() => {
    const fromUrl = searchParams.get('promo');
    if (course && fromUrl && !promo) {
      setPromoInput(fromUrl.toUpperCase());
      applyPromo(fromUrl, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course]);

  const clearPromo = () => {
    setPromo(null);
    setPromoInput('');
    setPromoError('');
  };

  const handlePay = async () => {
    setPaying(true);
    setError('');
    try {
      const res = await api.post('/payments', {
        courseId: course.id,
        provider,
        ...(promo ? { promoCode: promo.code } : {}),
      });
      router.push(`/receipt/${res.payment.id}`);
    } catch (err) {
      setError(err.message);
      setPaying(false);
    }
  };

  const finalPrice = promo ? promo.finalAmount : (course ? course.price : 0);

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

          {/* Promo kod */}
          <div className="mt-5 border-t border-line pt-4">
            <label className="label flex items-center gap-1.5">
              <Ticket size={14} /> Promo kod
            </label>
            {promo ? (
              <div className="flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5">
                <span className="inline-flex min-w-0 items-center gap-2 text-sm text-emerald-800">
                  <Check size={16} className="shrink-0" />
                  <b className="font-mono">{promo.code}</b>
                  <span className="truncate">−{promo.discountPct}%</span>
                </span>
                <button
                  type="button"
                  onClick={clearPromo}
                  className="shrink-0 rounded-lg p-1 text-emerald-700 hover:bg-emerald-100"
                  title="Kodni olib tashlash"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  className="input font-mono uppercase"
                  value={promoInput}
                  onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyPromo(promoInput); } }}
                  placeholder="Kod bo'lsa kiriting"
                  maxLength={24}
                />
                <button
                  type="button"
                  onClick={() => applyPromo(promoInput)}
                  disabled={checking || !promoInput.trim()}
                  className="btn-outline shrink-0 disabled:opacity-50"
                >
                  {checking ? <Loader2 size={16} className="animate-spin" /> : 'Qo\'llash'}
                </button>
              </div>
            )}
            {promoError && <p className="mt-2 text-xs text-red-600">{promoError}</p>}
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Kurs narxi</span>
              <span className={promo ? 'text-muted line-through' : ''}>{formatPrice(course.price)}</span>
            </div>
            {promo && (
              <div className="mt-2 flex justify-between text-sm text-emerald-700">
                <span>Chegirma ({promo.discountPct}%)</span>
                <span>− {formatPrice(promo.discountAmount)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted">Foydalanish muddati</span>
              <span className="font-medium">{courseAccessMonthsLabel(course)} ({LEVELS[course.level]})</span>
            </div>
            <div className="mt-3 flex justify-between font-display text-lg font-bold">
              <span>Jami</span>
              <span className="text-primary">{formatPrice(finalPrice)}</span>
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
      {/* useSearchParams (?promo=...) Suspense chegarasini talab qiladi */}
      <Suspense fallback={<Spinner />}>
        <CheckoutInner />
      </Suspense>
    </RequireAuth>
  );
}
