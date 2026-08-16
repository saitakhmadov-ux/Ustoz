'use client';

// "Kontaktlar" sahifasini to'liq boshqarish: sarlavha, aloqa kartochkalari,
// ish vaqti, xarita va aloqa formasi ko'rinishi.
// Ommaviy /contact sahifasi aynan shu ma'lumotdan chiziladi.

import { useEffect, useState } from 'react';
import {
  Save, Loader2, Plus, Trash2, ChevronUp, ChevronDown, Info, ExternalLink, Map,
} from 'lucide-react';
import { api } from '@/lib/api';
import { CONTACT_ICON_NAMES, contactIcon } from '@/lib/contactIcons';
import { Spinner, ErrorState } from '@/components/ui';

const MAX_ITEMS = 10;

const newId = () => Math.random().toString(36).slice(2, 10);

export default function ContactEditor() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    api.get('/admin/contact')
      .then((res) => setForm(res.contact))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Har qanday o'zgarish "Saqlandi" belgisini o'chiradi — nima saqlanmagani aniq bo'lsin
  const patch = (changes) => { setForm((f) => ({ ...f, ...changes })); setSavedMsg(''); };

  const items = {
    add: () => {
      if (form.items.length >= MAX_ITEMS) return;
      patch({
        items: [...form.items, {
          id: newId(), icon: 'Mail', label: '', value: '', url: '',
        }],
      });
    },
    update: (i, changes) => patch({
      items: form.items.map((it, idx) => (idx === i ? { ...it, ...changes } : it)),
    }),
    remove: (i) => patch({ items: form.items.filter((_, idx) => idx !== i) }),
    move: (i, dir) => {
      const to = i + dir;
      if (to < 0 || to >= form.items.length) return;
      const next = [...form.items];
      [next[i], next[to]] = [next[to], next[i]];
      patch({ items: next });
    },
  };

  const save = async () => {
    setSaving(true); setSavedMsg('');
    try {
      const res = await api.put('/admin/contact', form);
      setForm(res.contact);
      setSavedMsg('Saqlandi ✓');
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  if (error) return <ErrorState message={error} />;
  if (loading || !form) return <Spinner />;

  return (
    <div className="space-y-4">
      {/* Sarlavha */}
      <div className="card space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold text-heading">Sahifa sarlavhasi</h2>
        <div>
          <label className="label">Sarlavha</label>
          <input className="input" value={form.title} onChange={(e) => patch({ title: e.target.value })} />
        </div>
        <div>
          <label className="label">Kirish matni</label>
          <input className="input" value={form.subtitle} onChange={(e) => patch({ subtitle: e.target.value })} />
        </div>
        <p className="flex items-start gap-1.5 text-xs text-muted">
          <Info size={14} className="mt-px shrink-0" /> Bo'sh qoldirsangiz standart matn ko'rsatiladi.
        </p>
      </div>

      {/* Aloqa kartochkalari */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-heading">
              Aloqa kartochkalari <span className="text-sm font-normal text-muted">({form.items.length}/{MAX_ITEMS})</span>
            </h2>
            <p className="mt-1 text-sm text-muted">Email, telefon, manzil, Telegram, ijtimoiy tarmoqlar.</p>
          </div>
          <button type="button" onClick={items.add} disabled={form.items.length >= MAX_ITEMS} className="btn-outline disabled:opacity-50">
            <Plus size={16} /> Kartochka qo'shish
          </button>
        </div>

        {form.items.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-line py-6 text-center text-sm text-muted">
            Kartochka yo'q — sahifada aloqa ma'lumotlari ko'rinmaydi.
          </p>
        ) : (
          <div className="mt-5 space-y-3">
            {form.items.map((it, i) => {
              const Icon = contactIcon(it.icon);
              return (
                <div key={it.id} className="rounded-xl border border-line p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-primary">
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-[180px_1fr_180px]">
                        <input
                          className="input"
                          placeholder="Nomi (Email)"
                          value={it.label}
                          onChange={(e) => items.update(i, { label: e.target.value })}
                        />
                        <input
                          className="input"
                          placeholder="Qiymati (info@ustoz.uz)"
                          value={it.value}
                          onChange={(e) => items.update(i, { value: e.target.value })}
                        />
                        <select className="input" value={it.icon} onChange={(e) => items.update(i, { icon: e.target.value })}>
                          {CONTACT_ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <input
                        className="input"
                        placeholder="Havola (ixtiyoriy): mailto:..., tel:..., https://t.me/..."
                        value={it.url}
                        onChange={(e) => items.update(i, { url: e.target.value })}
                      />
                    </div>
                    <RowActions index={i} total={form.items.length} onMove={items.move} onRemove={items.remove} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-4 flex items-start gap-1.5 text-xs text-muted">
          <Info size={14} className="mt-px shrink-0" />
          Havola qo'shsangiz kartochka bosiladigan bo'ladi. Faqat <code>https://</code>,{' '}
          <code>mailto:</code>, <code>tel:</code> va sayt ichidagi manzillar qabul qilinadi.
        </p>
      </div>

      {/* Ish vaqti */}
      <div className="card space-y-4 p-6">
        <div>
          <h2 className="font-display text-lg font-semibold text-heading">Ish vaqti</h2>
          <p className="mt-1 text-sm text-muted">Bo'sh qoldirsangiz bu blok ko'rinmaydi.</p>
        </div>
        <textarea
          className="input min-h-[70px]"
          placeholder={'Dushanba–Juma: 9:00–18:00\nShanba: 10:00–15:00'}
          value={form.workHours}
          onChange={(e) => patch({ workHours: e.target.value })}
        />
      </div>

      {/* Xarita */}
      <div className="card space-y-4 p-6">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-heading">
            <Map size={18} className="text-primary" /> Xarita
          </h2>
          <p className="mt-1 text-sm text-muted">
            Google Maps'da joyni toping → "Share" → "Embed a map" → <code>iframe</code> ichidagi{' '}
            <code>src</code> havolasini shu yerga qo'ying.
          </p>
        </div>
        <input
          className="input"
          placeholder="https://www.google.com/maps/embed?pb=..."
          value={form.mapUrl}
          onChange={(e) => patch({ mapUrl: e.target.value })}
        />
        {form.mapUrl && (
          <div className="aspect-[16/9] overflow-hidden rounded-xl border border-line">
            <iframe src={form.mapUrl} title="Xarita ko'rinishi" className="h-full w-full" loading="lazy" />
          </div>
        )}
      </div>

      {/* Forma */}
      <div className="card space-y-4 p-6">
        <div>
          <h2 className="font-display text-lg font-semibold text-heading">Aloqa formasi</h2>
          <p className="mt-1 text-sm text-muted">
            Forma hozircha <b>namuna</b> — to'ldirilgan xabar hech qayerga yuborilmaydi.
            Shuning uchun ostidagi izohni o'zgartirish yoki formani butunlay yashirish mumkin.
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-indigo-600"
            checked={form.formEnabled}
            onChange={(e) => patch({ formEnabled: e.target.checked })}
          />
          Formani sahifada ko'rsatish
        </label>
        {form.formEnabled && (
          <div>
            <label className="label">Forma ostidagi izoh</label>
            <input
              className="input"
              value={form.formNote}
              onChange={(e) => patch({ formNote: e.target.value })}
              placeholder="Ixtiyoriy"
            />
          </div>
        )}
      </div>

      <div className="sticky bottom-4 flex items-center gap-3 rounded-xl border border-line bg-surface-glass p-3 shadow-sm backdrop-blur">
        <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Saqlash
        </button>
        {savedMsg && <span className="text-sm font-medium text-accent">{savedMsg}</span>}
        <a href="/contact" target="_blank" rel="noreferrer" className="ml-auto text-sm text-primary hover:underline">
          Sahifani ko'rish <ExternalLink size={13} className="inline" />
        </a>
      </div>
    </div>
  );
}

// Ro'yxat qatori uchun tartib va o'chirish tugmalari
function RowActions({ index, total, onMove, onRemove }) {
  return (
    <div className="flex shrink-0 flex-col gap-1">
      <button type="button" onClick={() => onMove(index, -1)} disabled={index === 0} title="Yuqoriga" className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-slate-100 disabled:opacity-30">
        <ChevronUp size={15} />
      </button>
      <button type="button" onClick={() => onMove(index, 1)} disabled={index === total - 1} title="Pastga" className="grid h-7 w-7 place-items-center rounded-lg text-muted hover:bg-slate-100 disabled:opacity-30">
        <ChevronDown size={15} />
      </button>
      <button type="button" onClick={() => onRemove(index)} title="O'chirish" className="grid h-7 w-7 place-items-center rounded-lg text-red-600 hover:bg-red-50">
        <Trash2 size={15} />
      </button>
    </div>
  );
}
