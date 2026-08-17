'use client';

import { useState } from 'react';
import { Plus, Trash2, CheckCircle2, Loader2, X, Image as ImageIcon, Settings2, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import { fileUrl } from '@/lib/constants';

// Bitta dars uchun test bazasini va sozlamalarini boshqarish.
// Bazadan tasodifiy `quizDraw` ta savol beriladi; baza kamida 2×draw boʻlishi kerak.
export default function QuizManager({ lesson, onChange }) {
  const [adding, setAdding] = useState(false);
  const [question, setQuestion] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imgUploading, setImgUploading] = useState(false);
  const [options, setOptions] = useState(['', '']);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Sozlamalar
  const [cfg, setCfg] = useState({
    quizDraw: lesson.quizDraw ?? 10,
    quizPassPercent: lesson.quizPassPercent ?? 60,
    quizTimePerQ: lesson.quizTimePerQ ?? 20,
    quizCooldownHours: lesson.quizCooldownHours ?? 3,
  });
  const [cfgOpen, setCfgOpen] = useState(false);
  const [cfgSaving, setCfgSaving] = useState(false);

  const bank = lesson.questions?.length || 0;
  // Sof test-dars — faqat savoldan iborat (video/matn/material yoʻq).
  const pure = !lesson.videoUrl
    && !(lesson.content && lesson.content.trim())
    && (lesson.materials?.length || 0) === 0
    && bank > 0;
  const required = (Number(cfg.quizDraw) || 10) * 2;
  const enough = !pure || bank >= required;

  const reset = () => {
    setQuestion(''); setImageUrl(''); setOptions(['', '']); setCorrectIndex(0); setAdding(false); setError('');
  };

  const addOption = () => setOptions([...options, '']);
  const setOption = (i, v) => setOptions(options.map((o, idx) => (idx === i ? v : o)));
  const removeOption = (i) => {
    const next = options.filter((_, idx) => idx !== i);
    setOptions(next);
    if (correctIndex >= next.length) setCorrectIndex(0);
  };

  const onImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setImgUploading(true);
    try {
      const up = await api.upload('/admin/upload-image', file);
      setImageUrl(up.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setImgUploading(false);
    }
  };

  const save = async () => {
    setError('');
    const cleaned = options.map((o) => o.trim()).filter(Boolean);
    if (question.trim().length < 3) return setError('Savol juda qisqa');
    if (cleaned.length < 2) return setError('Kamida 2 ta variant kerak');
    if (correctIndex >= cleaned.length) return setError('Toʻgʻri javobni tanlang');
    setSaving(true);
    try {
      await api.post('/admin/questions', {
        lessonId: lesson.id,
        question: question.trim(),
        imageUrl: imageUrl || undefined,
        options: cleaned,
        correctIndex,
      });
      reset();
      onChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeQuestion = async (qid) => {
    if (!confirm('Savolni oʻchirasizmi?')) return;
    try { await api.del(`/admin/questions/${qid}`); onChange?.(); }
    catch (err) { alert(err.message); }
  };

  const saveConfig = async () => {
    setCfgSaving(true);
    try {
      await api.put(`/admin/lessons/${lesson.id}`, {
        quizDraw: Number(cfg.quizDraw),
        quizPassPercent: Number(cfg.quizPassPercent),
        quizTimePerQ: Number(cfg.quizTimePerQ),
        quizCooldownHours: Number(cfg.quizCooldownHours),
      });
      onChange?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setCfgSaving(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl bg-slate-50 p-4">
      {/* Baza holati + sozlamalar tugmasi */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          {pure ? (
            <>
              <p className="text-xs font-semibold uppercase text-muted">
                Test bazasi — {bank} / {required} savol (tasodifiy {Math.min(cfg.quizDraw, bank) || cfg.quizDraw} tasi beriladi)
              </p>
              {/* Toʻlganlik koʻrsatkichi */}
              <div className="mt-1.5 h-1.5 w-48 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all ${enough ? 'bg-emerald-500' : 'bg-amber-500'}`}
                  style={{ width: `${Math.min(100, (bank / required) * 100)}%` }}
                />
              </div>
              {!enough && (
                <p className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                  <AlertTriangle size={12} /> Yana {required - bank} ta savol kerak — shundagina test foydalanuvchiga ochiladi.
                </p>
              )}
            </>
          ) : (
            <p className="text-xs font-semibold uppercase text-muted">
              Kichik test — {bank} ta savol (bu darsda barcha savollar beriladi)
            </p>
          )}
        </div>
        <button onClick={() => setCfgOpen(!cfgOpen)} className="flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-medium hover:bg-slate-100">
          <Settings2 size={13} /> Sozlamalar
        </button>
      </div>

      {/* Sozlamalar paneli */}
      {cfgOpen && (
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-lg border border-line bg-surface p-3 sm:grid-cols-4">
          <label className="text-xs">
            <span className="text-muted">Beriladigan savol</span>
            <input type="number" min="1" className="input mt-1 text-sm" value={cfg.quizDraw} onChange={(e) => setCfg({ ...cfg, quizDraw: e.target.value })} />
          </label>
          <label className="text-xs">
            <span className="text-muted">Oʻtish (%)</span>
            <input type="number" min="1" max="100" className="input mt-1 text-sm" value={cfg.quizPassPercent} onChange={(e) => setCfg({ ...cfg, quizPassPercent: e.target.value })} />
          </label>
          <label className="text-xs">
            <span className="text-muted">Vaqt (soniya)</span>
            <input type="number" min="5" className="input mt-1 text-sm" value={cfg.quizTimePerQ} onChange={(e) => setCfg({ ...cfg, quizTimePerQ: e.target.value })} />
          </label>
          <label className="text-xs">
            <span className="text-muted">Kuldown (soat)</span>
            <input type="number" min="0" className="input mt-1 text-sm" value={cfg.quizCooldownHours} onChange={(e) => setCfg({ ...cfg, quizCooldownHours: e.target.value })} />
          </label>
          <div className="col-span-2 sm:col-span-4">
            <button onClick={saveConfig} disabled={cfgSaving} className="btn-primary py-1.5 text-sm">
              {cfgSaving && <Loader2 size={14} className="animate-spin" />} Sozlamalarni saqlash
            </button>
            <p className="mt-1.5 text-xs text-muted">Boʻlim testi odatda 10 savol (baza ≥20), yakuniy test 40 savol (baza ≥80).</p>
          </div>
        </div>
      )}

      {/* Mavjud savollar */}
      <div className="space-y-2">
        {(lesson.questions || []).map((q, qi) => (
          <div key={q.id} className="rounded-lg border border-line bg-surface p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{qi + 1}. {q.question}</p>
              <button onClick={() => removeQuestion(q.id)} className="text-red-500 hover:text-red-700"><Trash2 size={15} /></button>
            </div>
            {q.imageUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={fileUrl(q.imageUrl)} alt="Savol rasmi" className="mt-2 max-h-28 rounded-lg border border-line" />
            )}
            <ul className="mt-1.5 space-y-0.5">
              {q.options.map((opt, oi) => (
                <li key={oi} className={`flex items-center gap-1.5 text-xs ${oi === q.correctIndex ? 'font-semibold text-indigo-700' : 'text-muted'}`}>
                  {oi === q.correctIndex ? <CheckCircle2 size={13} /> : <span className="w-[13px]" />} {opt}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Yangi savol qoʻshish */}
      {adding ? (
        <div className="mt-3 rounded-lg border border-line bg-surface p-3">
          {error && <div className="mb-2 rounded bg-red-50 px-3 py-1.5 text-xs text-red-700">{error}</div>}
          <textarea className="input mb-2 min-h-[54px] text-sm" placeholder="Savol matni" value={question} onChange={(e) => setQuestion(e.target.value)} />

          {/* Rasm (ixtiyoriy) */}
          <div className="mb-2">
            {imageUrl ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileUrl(imageUrl)} alt="Savol rasmi" className="max-h-32 rounded-lg border border-line" />
                <button onClick={() => setImageUrl('')} className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-surface text-red-500 shadow-card"><X size={13} /></button>
              </div>
            ) : (
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-line px-3 py-1.5 text-xs font-medium text-muted hover:border-primary hover:text-primary">
                {imgUploading ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
                {imgUploading ? 'Yuklanmoqda...' : 'Skrinshot/rasm qoʻshish'}
                <input type="file" accept="image/*" className="hidden" onChange={onImage} disabled={imgUploading} />
              </label>
            )}
          </div>

          <div className="space-y-1.5">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name="correct" checked={correctIndex === i} onChange={() => setCorrectIndex(i)} title="Toʻgʻri javob" className="text-primary" />
                <input className="input text-sm" placeholder={`Variant ${i + 1}`} value={opt} onChange={(e) => setOption(i, e.target.value)} />
                {options.length > 2 && <button onClick={() => removeOption(i)} className="text-subtle hover:text-red-500"><X size={15} /></button>}
              </div>
            ))}
          </div>
          <button onClick={addOption} className="mt-2 text-xs font-medium text-primary hover:underline">+ Variant qoʻshish</button>
          <p className="mt-1 text-xs text-muted">Radio tugma orqali toʻgʻri javobni belgilang</p>
          <div className="mt-3 flex gap-2">
            <button onClick={save} disabled={saving} className="btn-primary py-1.5 text-sm">
              {saving && <Loader2 size={14} className="animate-spin" />} Saqlash
            </button>
            <button onClick={reset} className="btn-ghost py-1.5 text-sm">Bekor qilish</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="mt-3 flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <Plus size={15} /> Savol qoʻshish
        </button>
      )}
    </div>
  );
}
