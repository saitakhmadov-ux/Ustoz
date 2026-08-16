'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Upload, Trash2, Loader2, Image as ImageIcon, Save, Info, Type, LayoutTemplate,
  Building2, Phone,
} from 'lucide-react';
import { api } from '@/lib/api';
import { fileUrl } from '@/lib/constants';
import { Spinner, ErrorState } from '@/components/ui';
import AboutEditor from '@/components/admin/AboutEditor';
import ContactEditor from '@/components/admin/ContactEditor';

const MAX_IMAGES = 5;

// Tahrirlanadigan matn maydonlari
const FIELDS = [
  { key: 'heroTitle', label: 'Hero sarlavha', type: 'input', hint: 'Bosh sahifadagi katta sarlavha.' },
  { key: 'heroSubtitle', label: 'Hero matni', type: 'textarea', hint: 'Sarlavha ostidagi tavsif matni.' },
  { key: 'ctaTitle', label: 'CTA sarlavha', type: 'input', hint: 'Pastdagi chaqiruv bloki sarlavhasi.' },
  { key: 'ctaSubtitle', label: 'CTA matni', type: 'textarea', hint: 'Chaqiruv bloki tavsifi.' },
  { key: 'footerText', label: 'Footer matni', type: 'input', hint: 'Sahifa pastidagi mualliflik matni.' },
];
const EMPTY = { heroTitle: '', heroSubtitle: '', ctaTitle: '', ctaSubtitle: '', footerText: '' };

export default function AdminHomePage() {
  const [tab, setTab] = useState('images');
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-primary"><LayoutTemplate size={22} /></span>
        <div>
          <h1 className="text-2xl">Sayt sahifalari</h1>
          <p className="text-sm text-muted">
            Bosh sahifadagi rasmlar, matnlar hamda "Biz haqimizda" va "Kontaktlar" sahifalari.
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-1 border-b border-line">
        {[
          { id: 'images', label: 'Rasmlar', icon: ImageIcon },
          { id: 'texts', label: 'Matnlar', icon: Type },
          { id: 'about', label: 'Biz haqimizda', icon: Building2 },
          { id: 'contact', label: 'Kontaktlar', icon: Phone },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors
                ${tab === t.id ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink'}`}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {tab === 'images' && <ImagesTab />}
        {tab === 'texts' && <TextsTab />}
        {tab === 'about' && <AboutEditor />}
        {tab === 'contact' && <ContactEditor />}
      </div>
    </div>
  );
}

/* ---------------- Rasmlar ---------------- */
function ImagesTab() {
  const [images, setImages] = useState([]);
  const [intervalSec, setIntervalSec] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    api.get('/admin/hero')
      .then((res) => { setImages(res.hero?.images || []); setIntervalSec(res.hero?.intervalSec || 5); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (images.length >= MAX_IMAGES) { alert(`Ko'pi bilan ${MAX_IMAGES} ta rasm.`); return; }
    setUploading(true); setProgress(0); setSavedMsg('');
    try {
      const res = await api.upload('/admin/hero/upload', file, { onProgress: setProgress });
      setImages((prev) => [...prev, res.url].slice(0, MAX_IMAGES));
    } catch (err) { alert(err.message); }
    finally { setUploading(false); setProgress(0); }
  };

  const removeAt = (i) => { setImages((prev) => prev.filter((_, idx) => idx !== i)); setSavedMsg(''); };

  const save = async () => {
    setSaving(true); setSavedMsg('');
    try {
      const res = await api.put('/admin/hero', { images, intervalSec: Number(intervalSec) });
      setImages(res.hero.images); setIntervalSec(res.hero.intervalSec); setSavedMsg('Saqlandi ✓');
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  if (error) return <ErrorState message={error} />;
  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-heading">
            Rasmlar <span className="text-sm font-normal text-muted">({images.length}/{MAX_IMAGES})</span>
          </h2>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={onPick} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading || images.length >= MAX_IMAGES} className="btn-primary disabled:opacity-50">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? `Yuklanmoqda… ${progress}%` : 'Rasm yuklash'}
          </button>
        </div>

        {images.length === 0 ? (
          <div className="mt-5 grid place-items-center rounded-xl border-2 border-dashed border-line py-12 text-center text-muted">
            <ImageIcon size={32} className="mb-2 opacity-60" />
            <p className="text-sm">Hali rasm yuklanmagan.</p>
            <p className="text-xs">Rasm yuklanmasa bosh sahifada standart surat ko'rsatiladi.</p>
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {images.map((src, i) => (
              <div key={`${src}-${i}`} className="group relative aspect-[4/5] overflow-hidden rounded-xl border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileUrl(src)} alt={`Hero rasm ${i + 1}`} className="h-full w-full object-cover" />
                <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-xs font-semibold text-white">{i + 1}</span>
                <button type="button" onClick={() => removeAt(i)} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-red-500 opacity-0 shadow transition-opacity hover:bg-white group-hover:opacity-100" title="O'chirish">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5">
        <h2 className="font-display text-lg font-semibold text-heading">Almashish oralig'i</h2>
        <p className="mt-1 text-sm text-muted">Har bir rasm necha soniyada bir marta almashsin (2–30 soniya).</p>
        <div className="mt-3 flex items-center gap-3">
          <input type="range" min="2" max="30" step="1" value={intervalSec} onChange={(e) => { setIntervalSec(Number(e.target.value)); setSavedMsg(''); }} className="w-64 max-w-full accent-indigo-600" />
          <div className="w-24">
            <div className="flex items-center rounded-lg border border-line px-2">
              <input type="number" min="2" max="30" value={intervalSec} onChange={(e) => { setIntervalSec(Number(e.target.value)); setSavedMsg(''); }} className="w-12 border-0 bg-transparent py-1.5 text-right outline-none" />
              <span className="text-sm text-muted">sek</span>
            </div>
          </div>
        </div>
        {images.length < 2 && (
          <p className="mt-3 flex items-start gap-1.5 text-xs text-muted"><Info size={14} className="mt-px shrink-0" /> Almashinish faqat 2 va undan ortiq rasm bo'lganda ishlaydi.</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Saqlash
        </button>
        {savedMsg && <span className="text-sm font-medium text-accent">{savedMsg}</span>}
      </div>
    </div>
  );
}

/* ---------------- Matnlar ---------------- */
function TextsTab() {
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    api.get('/admin/content')
      .then((res) => setForm({ ...EMPTY, ...(res.content || {}) }))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const set = (key, value) => { setForm((f) => ({ ...f, [key]: value })); setSavedMsg(''); };

  const save = async () => {
    setSaving(true); setSavedMsg('');
    try {
      const res = await api.put('/admin/content', form);
      setForm({ ...EMPTY, ...(res.content || {}) }); setSavedMsg('Saqlandi ✓');
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  if (error) return <ErrorState message={error} />;
  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="card space-y-5 p-6">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="label">{f.label}</label>
            {f.type === 'textarea' ? (
              <textarea className="input min-h-[90px]" value={form[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} />
            ) : (
              <input className="input" value={form[f.key] || ''} onChange={(e) => set(f.key, e.target.value)} />
            )}
            <p className="mt-1 text-xs text-muted">{f.hint}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Saqlash
        </button>
        {savedMsg && <span className="text-sm font-medium text-accent">{savedMsg}</span>}
      </div>

      <p className="flex items-start gap-1.5 text-xs text-muted">
        <Info size={14} className="mt-px shrink-0" /> Maydonni bo'sh qoldirsangiz, o'sha joyda standart matn ko'rsatiladi.
      </p>
    </div>
  );
}
