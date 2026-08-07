'use client';

import { useEffect, useRef, useState } from 'react';
import { Upload, Trash2, Loader2, Image as ImageIcon, Save, Info } from 'lucide-react';
import { api } from '@/lib/api';
import { fileUrl } from '@/lib/constants';
import { Spinner, ErrorState } from '@/components/ui';

const MAX_IMAGES = 5;

export default function AdminHeroPage() {
  const [images, setImages] = useState([]); // ['/uploads/..', ...]
  const [intervalSec, setIntervalSec] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const fileRef = useRef(null);

  const load = () => {
    api.get('/admin/hero')
      .then((res) => {
        setImages(res.hero?.images || []);
        setIntervalSec(res.hero?.intervalSec || 5);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const onPick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // qayta tanlashga ruxsat
    if (!file) return;
    if (images.length >= MAX_IMAGES) {
      alert(`Ko'pi bilan ${MAX_IMAGES} ta rasm yuklash mumkin.`);
      return;
    }
    setUploading(true);
    setProgress(0);
    setSavedMsg('');
    try {
      const res = await api.upload('/admin/hero/upload', file, {
        onProgress: (p) => setProgress(p),
      });
      setImages((prev) => [...prev, res.url].slice(0, MAX_IMAGES));
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const removeAt = (i) => {
    setImages((prev) => prev.filter((_, idx) => idx !== i));
    setSavedMsg('');
  };

  const save = async () => {
    setSaving(true);
    setSavedMsg('');
    try {
      const res = await api.put('/admin/hero', { images, intervalSec: Number(intervalSec) });
      setImages(res.hero.images);
      setIntervalSec(res.hero.intervalSec);
      setSavedMsg('Saqlandi ✓');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl">Bosh sahifa rasmi</h1>
      <p className="mt-1 text-sm text-muted">
        Bosh sahifadagi hero rasmini boshqarish. Bir nechta (5 tagacha) rasm yuklasangiz, ular
        belgilangan interval bilan avtomatik almashib turadi.
      </p>

      {error ? (
        <div className="mt-6"><ErrorState message={error} /></div>
      ) : loading ? (
        <div className="mt-6"><Spinner /></div>
      ) : (
        <>
          {/* Rasmlar */}
          <div className="card mt-6 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">
                Rasmlar <span className="text-sm font-normal text-muted">({images.length}/{MAX_IMAGES})</span>
              </h2>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={onPick} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading || images.length >= MAX_IMAGES}
                className="btn-primary disabled:opacity-50"
              >
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
                    <span className="absolute left-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-xs font-semibold text-white">
                      {i + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAt(i)}
                      className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-red-500 opacity-0 shadow transition-opacity hover:bg-white group-hover:opacity-100"
                      title="O'chirish"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interval sozlamasi */}
          <div className="card mt-4 p-5">
            <h2 className="font-display text-lg font-semibold text-ink">Almashish oralig'i</h2>
            <p className="mt-1 text-sm text-muted">Har bir rasm necha soniyada bir marta almashsin (2–30 soniya).</p>
            <div className="mt-3 flex items-center gap-3">
              <input
                type="range"
                min="2"
                max="30"
                step="1"
                value={intervalSec}
                onChange={(e) => { setIntervalSec(Number(e.target.value)); setSavedMsg(''); }}
                className="w-64 max-w-full accent-indigo-600"
              />
              <div className="w-24">
                <div className="flex items-center rounded-lg border border-line px-2">
                  <input
                    type="number"
                    min="2"
                    max="30"
                    value={intervalSec}
                    onChange={(e) => { setIntervalSec(Number(e.target.value)); setSavedMsg(''); }}
                    className="w-12 border-0 bg-transparent py-1.5 text-right outline-none"
                  />
                  <span className="text-sm text-muted">sek</span>
                </div>
              </div>
            </div>
            {images.length < 2 && (
              <p className="mt-3 flex items-start gap-1.5 text-xs text-muted">
                <Info size={14} className="mt-px shrink-0" />
                Almashinish faqat 2 va undan ortiq rasm bo'lganda ishlaydi.
              </p>
            )}
          </div>

          {/* Saqlash */}
          <div className="mt-4 flex items-center gap-3">
            <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Saqlash
            </button>
            {savedMsg && <span className="text-sm font-medium text-accent">{savedMsg}</span>}
          </div>
        </>
      )}
    </div>
  );
}
