'use client';

// Darsning klaviatura mashqini tahrirlash (faqat TYPING turidagi kurslarda).
//
// Mashq matni — oʻquvchi yozib chiqadigan matn. Oʻtish sharti ikkita:
// maqsadli tezlik (soʻz/daqiqa) va aniqlik. Ikkalasiga yetmasa dars
// yakunlanmaydi, ammo qayta urinish soni cheklanmagan.

import { useState } from 'react';
import {
  Save, Loader2, Trash2, Keyboard, Info,
} from 'lucide-react';
import { api } from '@/lib/api';
import { MODE_LABEL } from '@/lib/typing';

const MODES = ['KEYS', 'WORDS', 'TEXT', 'TIMED'];

const MODE_HINT = {
  KEYS: 'Alohida harflar va boʻgʻinlar: "asdf jkl; fj dk". Yangi tugmalarni oʻrgatish uchun.',
  WORDS: 'Probel bilan ajratilgan soʻzlar roʻyxati.',
  TEXT: 'Yaxlit matn — jumlalar, tinish belgilari bilan.',
  TIMED: 'Vaqtga qarshi: matn tugamaydi (takrorlanadi), mashq belgilangan vaqtda yakunlanadi.',
};

export default function TypingDrillEditor({ lesson, onChange }) {
  const d = lesson.typingDrill;
  const [form, setForm] = useState({
    mode: d?.mode || 'KEYS',
    content: d?.content || '',
    targetWpm: d?.targetWpm ?? 15,
    targetAccuracy: d?.targetAccuracy ?? 95,
    durationSec: d?.durationSec ?? 60,
    showKeyboard: d?.showKeyboard ?? true,
    hint: d?.hint || '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const set = (changes) => { setForm((f) => ({ ...f, ...changes })); setMsg(''); };

  const save = async () => {
    setSaving(true); setError(''); setMsg('');
    try {
      await api.put(`/admin/lessons/${lesson.id}/typing`, {
        mode: form.mode,
        content: form.content,
        targetWpm: Number(form.targetWpm),
        targetAccuracy: Number(form.targetAccuracy),
        durationSec: form.mode === 'TIMED' ? Number(form.durationSec) : null,
        showKeyboard: form.showKeyboard,
        hint: form.hint || null,
      });
      setMsg('Saqlandi ✓');
      onChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm('Mashqni oʻchirasizmi? Dars mashqsiz qoladi va oʻquvchilarda "bajarilgan" belgisi ham olib tashlanadi.')) return;
    setSaving(true); setError('');
    try {
      await api.del(`/admin/lessons/${lesson.id}/typing`);
      onChange?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const chars = form.content.trim().replace(/\s+/g, ' ').length;

  return (
    <div className="rounded-xl border border-line bg-slate-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Keyboard size={16} className="text-primary" />
        <b className="text-sm">Yozish mashqi</b>
        {d && <span className="badge bg-emerald-50 text-emerald-700">Sozlangan</span>}
      </div>

      {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-4">
        <div>
          <label className="label text-xs">Rejim</label>
          <select className="input text-sm" value={form.mode} onChange={(e) => set({ mode: e.target.value })}>
            {MODES.map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
          </select>
        </div>
        <div>
          <label className="label text-xs">Maqsad: tezlik</label>
          <input
            type="number" min="1" max="200" className="input text-sm"
            value={form.targetWpm}
            onChange={(e) => set({ targetWpm: e.target.value })}
          />
        </div>
        <div>
          <label className="label text-xs">Maqsad: aniqlik (%)</label>
          <input
            type="number" min="50" max="100" className="input text-sm"
            value={form.targetAccuracy}
            onChange={(e) => set({ targetAccuracy: e.target.value })}
          />
        </div>
        {form.mode === 'TIMED' ? (
          <div>
            <label className="label text-xs">Davomiyligi (soniya)</label>
            <input
              type="number" min="10" max="600" className="input text-sm"
              value={form.durationSec}
              onChange={(e) => set({ durationSec: e.target.value })}
            />
          </div>
        ) : (
          <div className="grid items-end">
            <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-indigo-600"
                checked={form.showKeyboard}
                onChange={(e) => set({ showKeyboard: e.target.checked })}
              />
              Klaviatura tasviri
            </label>
          </div>
        )}
      </div>

      <p className="mt-2 flex items-start gap-1.5 text-xs text-muted">
        <Info size={13} className="mt-px shrink-0" /> {MODE_HINT[form.mode]}
      </p>

      <div className="mt-3">
        <label className="label text-xs">Mashq matni <span className="font-normal text-muted">({chars} belgi)</span></label>
        <textarea
          className="input min-h-[90px] font-mono text-sm"
          placeholder="fff jjj fjf jfj fj jf"
          value={form.content}
          onChange={(e) => set({ content: e.target.value })}
        />
        <p className="mt-1 text-xs text-muted">
          Qator va ortiqcha probellar saqlashda bitta probelga aylanadi.
          oʻ va gʻ uchun apostrof yozing — oʻquvchi oddiy <code>&apos;</code> bossa ham toʻgʻri hisoblanadi.
        </p>
      </div>

      <div className="mt-3">
        <label className="label text-xs">Maslahat (ixtiyoriy)</label>
        <input
          className="input text-sm"
          placeholder="Barmoqlaringizni asdf—jkl ustiga qoʻying"
          value={form.hint}
          onChange={(e) => set({ hint: e.target.value })}
        />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button type="button" onClick={save} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Saqlash
        </button>
        {msg && <span className="text-sm font-medium text-accent">{msg}</span>}
        {d && (
          <button type="button" onClick={remove} disabled={saving} className="ml-auto btn-ghost text-sm text-red-600">
            <Trash2 size={15} /> Mashqni oʻchirish
          </button>
        )}
      </div>
    </div>
  );
}
