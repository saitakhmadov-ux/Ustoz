'use client';

// IELTS mashqi natijasi + Gemini bahosi.
//
// Baho TAXMINIY: bu rasmiy IELTS bahosi emas va shu ekranda ochiq yozib
// qo'yiladi — foydalanuvchi uni imtihon natijasi deb o'ylab qolmasligi kerak.

import { useState } from 'react';
import {
  CheckCircle2, AlertTriangle, Sparkles, Loader2, RotateCcw, Shuffle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatTime } from '@/lib/ielts';

function Stat({ value, label, tone = null }) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 text-center">
      <p className={`font-display text-3xl font-bold ${tone === 'good' ? 'text-accent-dark' : tone === 'warn' ? 'text-amber-600' : 'text-ink'}`}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  );
}

// 4 ta IELTS mezoni — nomlar inglizcha (rasmiy atamalar), izohlar o'zbekcha
function Criteria({ items }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      {items.map((c) => (
        <div key={c.name} className="rounded-xl border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <b className="text-sm text-ink">{c.name}</b>
            {typeof c.band === 'number' && (
              <span className="badge bg-indigo-50 text-indigo-700">Band {c.band}</span>
            )}
          </div>
          {c.comment && <p className="mt-1.5 text-sm leading-relaxed text-muted">{c.comment}</p>}
        </div>
      ))}
    </div>
  );
}

export default function IeltsResults({
  attempt, slug, canEvaluate, onRetry, onNewTask,
}) {
  const [ai, setAi] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const evaluate = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.post(`/learn/${slug}/ielts/attempt/${attempt.id}/evaluate`);
      setAi(res.evaluation);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isCopy = attempt.type === 'TYPING' || attempt.type === 'VOCAB';
  const met = attempt.metMinWords;

  return (
    <div className="space-y-4">
      <div className="card p-6">
        <h3 className="font-display text-lg font-semibold text-heading">Your Result</h3>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat value={attempt.wpm} label={isCopy ? 'WPM' : "so'z/daqiqa"} />
          {isCopy ? (
            <Stat value={`${attempt.accuracy}%`} label="Accuracy" tone={attempt.accuracy >= 95 ? 'good' : null} />
          ) : (
            <Stat value={attempt.words} label="Words" tone={met === false ? 'warn' : met ? 'good' : null} />
          )}
          <Stat value={isCopy ? attempt.errors : attempt.chars} label={isCopy ? 'Errors' : 'Characters'} />
          <Stat value={formatTime(attempt.durationMs / 1000)} label="Time" />
        </div>

        {isCopy && attempt.correctWords != null && (
          <p className="mt-3 text-sm text-muted">
            To'g'ri yozilgan so'zlar: <b className="text-ink">{attempt.correctWords}</b>
            {attempt.totalWords ? ` / ${attempt.totalWords}` : ''}
          </p>
        )}

        {/* Minimal so'z talabi — yozma topshiriqlarda */}
        {!isCopy && attempt.minWords && (
          <div className={`mt-4 flex items-start gap-2.5 rounded-xl p-4 ${met ? 'bg-emerald-50' : 'bg-amber-50'}`}>
            {met ? <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
              : <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />}
            <div className="text-sm">
              <p className={met ? 'text-emerald-800' : 'text-amber-800'}>
                <b>Minimum word requirement:</b> {attempt.minWords} words
                {' · '}
                <b>Your word count:</b> {attempt.words} words
              </p>
              {!met && (
                <p className="mt-0.5 text-amber-700">
                  Minimal so'z soniga yetmadingiz — haqiqiy imtihonda bu ball pasayishiga olib keladi.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* AI baholash */}
      {canEvaluate && (
        <div className="card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-100 text-primary">
                <Sparkles size={18} />
              </span>
              <div>
                <b className="text-ink">AI baholash</b>
                <p className="text-xs text-muted">IELTS mezonlari bo'yicha tahlil va tuzatishlar</p>
              </div>
            </div>
            {!ai && (
              <button type="button" onClick={evaluate} disabled={loading} className="btn-primary disabled:opacity-50">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {loading ? 'Tahlil qilinmoqda…' : 'Esseni baholash'}
              </button>
            )}
          </div>

          {error && <div className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

          {ai && (
            <>
              <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl bg-indigo-50 p-4">
                <span className="flex items-baseline gap-2">
                  <b className="font-display text-4xl text-primary">{ai.band}</b>
                  <span className="text-sm text-indigo-800">taxminiy band</span>
                </span>
                <p className="text-xs text-indigo-700">
                  Bu — mashq uchun taxminiy baho. Rasmiy IELTS natijasi emas va imtihon
                  ballini kafolatlamaydi.
                </p>
              </div>

              {ai.summary && <p className="mt-4 leading-relaxed text-ink">{ai.summary}</p>}
              <Criteria items={ai.criteria} />

              {Array.isArray(ai.fixes) && ai.fixes.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Tuzatish namunalari</p>
                  <div className="space-y-2">
                    {ai.fixes.map((f, i) => (
                      <div key={i} className="rounded-xl border border-line bg-white p-3 text-sm">
                        <p className="text-red-600 line-through decoration-red-300">{f.before}</p>
                        <p className="mt-1 text-emerald-700">{f.after}</p>
                        {f.why && <p className="mt-1 text-xs text-muted">{f.why}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onRetry} className="btn-outline">
          <RotateCcw size={16} /> Shu topshiriqni qayta ishlash
        </button>
        <button type="button" onClick={onNewTask} className="btn-primary">
          <Shuffle size={16} /> Yangi topshiriq
        </button>
      </div>
    </div>
  );
}
