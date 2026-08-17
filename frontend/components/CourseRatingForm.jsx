'use client';

import { useEffect, useState } from 'react';
import { Loader2, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { StarInput } from '@/components/Stars';

// Kursga baho + izoh formasi. Holatni (myReview/canReview) oʻzi serverdan oladi.
// Har foydalanuvchiga kurs boʻyicha bitta baho — qaysi sahifada qoʻyilsa,
// boshqa sahifalarda (kurs, tugatish, sertifikat) ham shu koʻrinadi.
export default function CourseRatingForm({ slug, onSaved, className = '' }) {
  const { isAuthenticated } = useAuth();
  const [myReview, setMyReview] = useState(null);
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    try {
      const res = await api.get(`/courses/${slug}/reviews`);
      setCanReview(!!res.canReview);
      setMyReview(res.myReview || null);
      if (res.myReview) {
        setRating(res.myReview.rating);
        setComment(res.myReview.comment || '');
      }
    } catch {
      /* jim — ochiq sahifada token boʻlmasligi mumkin */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (slug) load(); /* eslint-disable-next-line */ }, [slug]);

  const submit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (rating < 1) return setFormError('Iltimos, yulduz tanlang');
    setSaving(true);
    try {
      await api.post(`/courses/${slug}/reviews`, { rating, comment: comment || undefined });
      await load();
      onSaved?.();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeReview = async () => {
    if (!confirm('Bahoyingizni oʻchirasizmi?')) return;
    try {
      await api.del(`/courses/${slug}/reviews`);
      setRating(0); setComment(''); setMyReview(null);
      await load();
      onSaved?.();
    } catch (err) { alert(err.message); }
  };

  // Kirmagan / yozilmagan / hali yuklanmoqda boʻlsa forma koʻrsatilmaydi
  if (!isAuthenticated || loading || !canReview) return null;

  return (
    <form onSubmit={submit} className={`card p-5 ${className}`}>
      <h3 className="flex items-center gap-2 font-semibold">
        {myReview ? (
          <>
            <CheckCircle2 size={17} className="text-accent" /> Bahoyingizni yangilang
          </>
        ) : (
          'Kursga baho bering'
        )}
      </h3>
      {formError && (
        <div className="mt-2 rounded-lg bg-red-50 px-3 py-1.5 text-sm text-red-700">{formError}</div>
      )}
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
            <Trash2 size={16} /> Oʻchirish
          </button>
        )}
      </div>
    </form>
  );
}
