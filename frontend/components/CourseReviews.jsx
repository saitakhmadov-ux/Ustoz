'use client';

import { useEffect, useState } from 'react';
import { Loader2, Star, Trash2, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { StarRating, StarInput } from '@/components/Stars';
import { Spinner } from '@/components/ui';

export default function CourseReviews({ slug }) {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Baho berish formasi
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    try {
      const res = await api.get(`/courses/${slug}/reviews`);
      setData(res);
      if (res.myReview) {
        setRating(res.myReview.rating);
        setComment(res.myReview.comment || '');
      }
    } catch {
      /* jim */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (rating < 1) return setFormError('Iltimos, yulduz tanlang');
    setSaving(true);
    try {
      await api.post(`/courses/${slug}/reviews`, { rating, comment: comment || undefined });
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeReview = async () => {
    if (!confirm('Bahoyingizni o\'chirasizmi?')) return;
    try {
      await api.del(`/courses/${slug}/reviews`);
      setRating(0); setComment('');
      await load();
    } catch (err) { alert(err.message); }
  };

  if (loading) return <Spinner />;
  if (!data) return null;

  const { summary, distribution, reviews, myReview, canReview } = data;
  const maxDist = Math.max(1, ...Object.values(distribution));

  return (
    <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
      {/* Xulosa */}
      <div>
        <div className="card p-6 text-center">
          <div className="font-display text-5xl font-bold text-ink">{summary.average.toFixed(1)}</div>
          <div className="mt-2 flex justify-center"><StarRating value={summary.average} size={20} /></div>
          <p className="mt-2 text-sm text-muted">{summary.count} ta baho</p>
        </div>

        {/* Taqsimot */}
        <div className="mt-4 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="flex w-8 items-center gap-0.5 text-muted">{star} <Star size={11} className="text-amber-400" fill="currentColor" /></span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-amber-400" style={{ width: `${(distribution[star] / maxDist) * 100}%` }} />
              </div>
              <span className="w-6 text-right text-muted">{distribution[star]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Forma + sharhlar */}
      <div>
        {/* Baho berish */}
        {isAuthenticated && canReview ? (
          <form onSubmit={submit} className="card mb-6 p-5">
            <h3 className="font-semibold">{myReview ? 'Bahoyingizni yangilang' : 'Kursga baho bering'}</h3>
            {formError && <div className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700">{formError}</div>}
            <div className="mt-3"><StarInput value={rating} onChange={setRating} /></div>
            <textarea
              className="input mt-3 min-h-[80px]"
              placeholder="Fikringizni yozing (ixtiyoriy)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
            />
            <div className="mt-3 flex gap-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving && <Loader2 size={16} className="animate-spin" />} {myReview ? 'Yangilash' : 'Yuborish'}
              </button>
              {myReview && (
                <button type="button" onClick={removeReview} className="btn-ghost text-red-600">
                  <Trash2 size={16} /> O'chirish
                </button>
              )}
            </div>
          </form>
        ) : isAuthenticated ? (
          <div className="mb-6 rounded-xl bg-slate-50 px-4 py-3 text-sm text-muted">
            Baho berish uchun avval kursga yoziling.
          </div>
        ) : null}

        {/* Sharhlar ro'yxati */}
        {reviews.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line py-12 text-center text-muted">
            <MessageSquare size={28} className="text-slate-300" />
            <p className="text-sm">Hali baho yo'q. Birinchi bo'lib baho bering!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div key={r.id} className="card p-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-primary text-xs font-bold text-white">
                    {r.user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{r.user?.fullName}</p>
                    <StarRating value={r.rating} size={13} />
                  </div>
                  <span className="text-xs text-muted">{new Date(r.createdAt).toLocaleDateString('uz-UZ')}</span>
                </div>
                {r.comment && <p className="mt-3 whitespace-pre-wrap text-sm text-ink/90">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
