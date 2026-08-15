'use client';

// IELTS topshirig'ini tahrirlash.
//
// Diagramma ma'lumoti jadval ko'rinishida kiritiladi (yorliqlar + seriyalar) —
// admin rasm qidirib yurmaydi, sayt diagrammani o'zi chizadi. Jarayon (Process)
// va xarita (Map) uchun esa rasm yuklanadi, chunki ularni sondan chizib bo'lmaydi.

import { useRef, useState } from 'react';
import {
  Save, Loader2, X, Upload, Info, Image as ImageIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { fileUrl } from '@/lib/constants';

const TYPES = [
  { id: 'ACADEMIC_T1', label: 'Academic Task 1' },
  { id: 'GENERAL_T1', label: 'General Task 1 (xat)' },
  { id: 'TASK2', label: 'Task 2 (esse)' },
  { id: 'TYPING', label: 'Typing paragraph' },
  { id: 'VOCAB', label: 'Vocabulary' },
];
const VISUALS = ['NONE', 'LINE', 'BAR', 'PIE', 'TABLE', 'PROCESS', 'MAP'];
const CHART_VISUALS = ['LINE', 'BAR', 'PIE', 'TABLE'];

const emptyForm = {
  type: 'TASK2',
  subtype: '',
  level: '',
  title: '',
  prompt: '',
  visual: 'NONE',
  unit: '',
  caption: '',
  labels: '',
  series: [{ name: '', values: '' }],
  imageUrl: '',
  dataSummary: '',
  body: '',
  minWords: 250,
  durationSec: 2400,
  active: true,
};

// Bazadagi topshiriqni forma ko'rinishiga aylantiradi
function toForm(task) {
  if (!task) return emptyForm;
  const d = task.chartData || {};
  return {
    type: task.type,
    subtype: task.subtype || '',
    level: task.level || '',
    title: task.title || '',
    prompt: task.prompt || '',
    visual: task.visual || 'NONE',
    unit: d.unit || '',
    caption: d.caption || '',
    labels: (d.labels || []).join(', '),
    series: (d.series || []).length
      ? d.series.map((s) => ({ name: s.name, values: (s.values || []).join(', ') }))
      : [{ name: '', values: '' }],
    imageUrl: task.imageUrl || '',
    dataSummary: task.dataSummary || '',
    body: task.body || '',
    minWords: task.minWords ?? '',
    durationSec: task.durationSec ?? '',
    active: task.active !== false,
  };
}

const splitList = (s) => String(s || '').split(',').map((x) => x.trim()).filter(Boolean);

export default function IeltsTaskEditor({ task, onDone, onCancel }) {
  const [form, setForm] = useState(() => toForm(task));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const set = (changes) => { setForm((f) => ({ ...f, ...changes })); setError(''); };
  const isChart = CHART_VISUALS.includes(form.visual);
  const isImage = form.visual === 'PROCESS' || form.visual === 'MAP';
  const isCopy = form.type === 'TYPING' || form.type === 'VOCAB';

  const setSeries = (i, changes) => set({
    series: form.series.map((s, idx) => (idx === i ? { ...s, ...changes } : s)),
  });

  const pickImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.upload('/admin/upload-image', file);
      set({ imageUrl: res.url });
    } catch (err) { setError(err.message); }
    finally { setUploading(false); }
  };

  const save = async () => {
    setSaving(true); setError('');
    try {
      const labels = splitList(form.labels);
      const payload = {
        type: form.type,
        subtype: form.subtype || null,
        level: form.level || null,
        title: form.title.trim(),
        prompt: form.prompt.trim(),
        visual: form.type === 'ACADEMIC_T1' ? form.visual : 'NONE',
        dataSummary: form.dataSummary || null,
        body: isCopy ? form.body : null,
        minWords: isCopy ? null : Number(form.minWords) || null,
        durationSec: isCopy ? null : Number(form.durationSec) || null,
        active: form.active,
        imageUrl: isImage ? (form.imageUrl || null) : null,
        chartData: isChart ? {
          unit: form.unit || null,
          caption: form.caption || null,
          labels,
          series: form.series
            .filter((s) => s.name.trim())
            .map((s) => ({ name: s.name.trim(), values: splitList(s.values).map(Number) })),
        } : null,
      };

      if (task) await api.put(`/admin/ielts/tasks/${task.id}`, payload);
      else await api.post('/admin/ielts/tasks', payload);
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card space-y-4 p-5">
      <div className="flex items-center justify-between">
        <b className="font-display text-lg text-ink">{task ? 'Topshiriqni tahrirlash' : 'Yangi topshiriq'}</b>
        <button type="button" onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100">
          <X size={17} />
        </button>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="label">Turi</label>
          <select className="input" value={form.type} onChange={(e) => set({ type: e.target.value })}>
            {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Kichik turi</label>
          <input
            className="input"
            placeholder="Line Graph / Opinion Essay / Formal Letter"
            value={form.subtype}
            onChange={(e) => set({ subtype: e.target.value })}
          />
        </div>
        {form.type === 'VOCAB' ? (
          <div>
            <label className="label">Daraja</label>
            <select className="input" value={form.level} onChange={(e) => set({ level: e.target.value })}>
              <option value="">Tanlang…</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>
        ) : (
          <div className="grid items-end">
            <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-indigo-600"
                checked={form.active}
                onChange={(e) => set({ active: e.target.checked })}
              />
              Faol (mashqlarda chiqadi)
            </label>
          </div>
        )}
      </div>

      <div>
        <label className="label">Nomi (admin ro'yxati uchun)</label>
        <input className="input" value={form.title} onChange={(e) => set({ title: e.target.value })} />
      </div>

      <div>
        <label className="label">Savol matni (inglizcha)</label>
        <textarea
          className="input min-h-[130px]"
          value={form.prompt}
          onChange={(e) => set({ prompt: e.target.value })}
        />
      </div>

      {!isCopy && (
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="label">Minimal so'z</label>
            <input type="number" className="input" value={form.minWords} onChange={(e) => set({ minWords: e.target.value })} />
          </div>
          <div>
            <label className="label">Davomiyligi (soniya)</label>
            <input type="number" className="input" value={form.durationSec} onChange={(e) => set({ durationSec: e.target.value })} />
          </div>
        </div>
      )}

      {isCopy && (
        <div>
          <label className="label">
            {form.type === 'VOCAB' ? "So'zlar (probel bilan)" : 'Paragraf matni'}
          </label>
          <textarea
            className="input min-h-[100px] font-mono text-sm"
            value={form.body}
            onChange={(e) => set({ body: e.target.value })}
          />
        </div>
      )}

      {/* Academic Task 1 — vizual */}
      {form.type === 'ACADEMIC_T1' && (
        <div className="rounded-xl border border-line bg-slate-50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="label mb-0">Vizual turi</label>
            <select className="input max-w-[200px]" value={form.visual} onChange={(e) => set({ visual: e.target.value })}>
              {VISUALS.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>

          {isChart && (
            <div className="mt-4 space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="label">O'lchov birligi</label>
                  <input className="input" placeholder="% / mln / kWh" value={form.unit} onChange={(e) => set({ unit: e.target.value })} />
                </div>
                <div>
                  <label className="label">Diagramma sarlavhasi</label>
                  <input className="input" value={form.caption} onChange={(e) => set({ caption: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="label">Yorliqlar (vergul bilan)</label>
                <input
                  className="input font-mono text-sm"
                  placeholder="2000, 2005, 2010, 2015, 2020"
                  value={form.labels}
                  onChange={(e) => set({ labels: e.target.value })}
                />
                <p className="mt-1 text-xs text-muted">{splitList(form.labels).length} ta yorliq</p>
              </div>

              <div className="space-y-2">
                <label className="label">Seriyalar</label>
                {form.series.map((s, i) => {
                  const n = splitList(s.values).length;
                  const mos = n === splitList(form.labels).length;
                  return (
                    <div key={i} className="grid gap-2 sm:grid-cols-[180px_1fr_auto]">
                      <input
                        className="input"
                        placeholder="Nomi (Canada)"
                        value={s.name}
                        onChange={(e) => setSeries(i, { name: e.target.value })}
                      />
                      <input
                        className={`input font-mono text-sm ${s.values && !mos ? 'border-amber-400' : ''}`}
                        placeholder="51, 72, 80, 90, 94"
                        value={s.values}
                        onChange={(e) => setSeries(i, { values: e.target.value })}
                      />
                      <button
                        type="button"
                        onClick={() => set({ series: form.series.filter((_, idx) => idx !== i) })}
                        className="btn-ghost text-sm text-red-600"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() => set({ series: [...form.series, { name: '', values: '' }] })}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  + Seriya qo'shish
                </button>
                <p className="flex items-start gap-1.5 text-xs text-muted">
                  <Info size={13} className="mt-px shrink-0" />
                  Har bir seriyadagi sonlar soni yorliqlar soniga teng bo'lishi kerak.
                </p>
              </div>
            </div>
          )}

          {isImage && (
            <div className="mt-4">
              <label className="label">Sxema / xarita rasmi</label>
              <div className="flex flex-wrap items-center gap-3">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={pickImage} />
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-outline text-sm disabled:opacity-50">
                  {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                  {form.imageUrl ? 'Rasmni almashtirish' : 'Rasm yuklash'}
                </button>
                {form.imageUrl ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fileUrl(form.imageUrl)} alt="" className="h-16 rounded-lg border border-line" />
                    <button type="button" onClick={() => set({ imageUrl: '' })} className="btn-ghost text-sm">
                      <X size={15} /> Olib tashlash
                    </button>
                  </>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs text-amber-700">
                    <ImageIcon size={13} /> Rasm yuklanmaguncha o'quvchiga matnli tavsif ko'rsatiladi
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!isCopy && (
        <div>
          <label className="label">Ma'lumot tavsifi (inglizcha)</label>
          <textarea
            className="input min-h-[80px]"
            placeholder="What the chart/diagram shows — used by AI grading and as image alt text"
            value={form.dataSummary}
            onChange={(e) => set({ dataSummary: e.target.value })}
          />
          <p className="mt-1 text-xs text-muted">
            AI esseni baholaganda shu tavsifni va yuqoridagi sonlarni o'qiydi — talabaning
            ma'lumot haqidagi da'volari to'g'riligini tekshirish uchun.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Saqlash
        </button>
        <button type="button" onClick={onCancel} className="btn-ghost">Bekor qilish</button>
      </div>
    </div>
  );
}
