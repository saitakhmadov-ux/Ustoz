'use client';

// "Biz haqimizda" sahifasini to'liq boshqarish: sarlavha, video, qadriyat
// kartochkalari, missiya bloki va qo'shimcha bo'limlar.
// Ommaviy /about sahifasi aynan shu ma'lumotdan chiziladi.

import { useEffect, useRef, useState } from 'react';
import {
  Save, Loader2, Plus, Trash2, ChevronUp, ChevronDown, Upload, Video, X,
  Info, ExternalLink, Image as ImageIcon,
} from 'lucide-react';
import { api } from '@/lib/api';
import { fileUrl } from '@/lib/constants';
import { videoEmbed } from '@/lib/video';
import { ABOUT_ICON_NAMES, aboutIcon } from '@/lib/aboutIcons';
import { Spinner, ErrorState } from '@/components/ui';

const MAX_VALUES = 9;
const MAX_SECTIONS = 12;

const newId = () => Math.random().toString(36).slice(2, 10);

export default function AboutEditor() {
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    api.get('/admin/about')
      .then((res) => setForm(res.about))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Har qanday o'zgarish "Saqlandi" belgisini o'chiradi — nima saqlanmagani aniq bo'lsin
  const patch = (changes) => { setForm((f) => ({ ...f, ...changes })); setSavedMsg(''); };
  const patchIn = (key, changes) => patch({ [key]: { ...form[key], ...changes } });

  // Ro'yxatlar (values / sections) uchun umumiy amallar
  const listOps = (key, max, blank) => ({
    add: () => {
      if (form[key].length >= max) return;
      patch({ [key]: [...form[key], { id: newId(), ...blank }] });
    },
    update: (i, changes) => patch({
      [key]: form[key].map((item, idx) => (idx === i ? { ...item, ...changes } : item)),
    }),
    remove: (i) => patch({ [key]: form[key].filter((_, idx) => idx !== i) }),
    move: (i, dir) => {
      const to = i + dir;
      if (to < 0 || to >= form[key].length) return;
      const next = [...form[key]];
      [next[i], next[to]] = [next[to], next[i]];
      patch({ [key]: next });
    },
  });

  const save = async () => {
    setSaving(true); setSavedMsg('');
    try {
      const res = await api.put('/admin/about', form);
      setForm(res.about);
      setSavedMsg('Saqlandi ✓');
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  if (error) return <ErrorState message={error} />;
  if (loading || !form) return <Spinner />;

  const values = listOps('values', MAX_VALUES, { icon: 'Target', title: '', text: '' });
  const sections = listOps('sections', MAX_SECTIONS, { title: '', text: '', image: '' });

  return (
    <div className="space-y-4">
      {/* Sarlavha */}
      <div className="card space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold text-ink">Sahifa sarlavhasi</h2>
        <div>
          <label className="label">Sarlavha</label>
          <input className="input" value={form.title} onChange={(e) => patch({ title: e.target.value })} />
        </div>
        <div>
          <label className="label">Kirish matni</label>
          <textarea className="input min-h-[90px]" value={form.subtitle} onChange={(e) => patch({ subtitle: e.target.value })} />
        </div>
        <p className="flex items-start gap-1.5 text-xs text-muted">
          <Info size={14} className="mt-px shrink-0" /> Bo'sh qoldirsangiz standart matn ko'rsatiladi.
        </p>
      </div>

      {/* Video */}
      <VideoBlock video={form.video} onChange={(changes) => patchIn('video', changes)} />

      {/* Qadriyat kartochkalari */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              Kartochkalar <span className="text-sm font-normal text-muted">({form.values.length}/{MAX_VALUES})</span>
            </h2>
            <p className="mt-1 text-sm text-muted">Sahifadagi uch ustunli ikonkali bloklar.</p>
          </div>
          <button type="button" onClick={values.add} disabled={form.values.length >= MAX_VALUES} className="btn-outline disabled:opacity-50">
            <Plus size={16} /> Kartochka qo'shish
          </button>
        </div>

        {form.values.length === 0 ? (
          <EmptyHint text="Kartochka yo'q — sahifada bu blok butunlay ko'rinmaydi." />
        ) : (
          <div className="mt-5 space-y-3">
            {form.values.map((v, i) => {
              const Icon = aboutIcon(v.icon);
              return (
                <div key={v.id} className="rounded-xl border border-line p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-primary">
                      <Icon size={20} />
                    </span>
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                        <input
                          className="input"
                          placeholder="Sarlavha"
                          value={v.title}
                          onChange={(e) => values.update(i, { title: e.target.value })}
                        />
                        <select className="input" value={v.icon} onChange={(e) => values.update(i, { icon: e.target.value })}>
                          {ABOUT_ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <textarea
                        className="input min-h-[70px]"
                        placeholder="Tavsif matni"
                        value={v.text}
                        onChange={(e) => values.update(i, { text: e.target.value })}
                      />
                    </div>
                    <RowActions index={i} total={form.values.length} onMove={values.move} onRemove={values.remove} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Missiya */}
      <div className="card space-y-4 p-6">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Missiya bloki</h2>
          <p className="mt-1 text-sm text-muted">Sahifa pastidagi ajratilgan blok. Ikkalasi ham bo'sh bo'lsa ko'rinmaydi.</p>
        </div>
        <div>
          <label className="label">Sarlavha</label>
          <input className="input" value={form.mission.title} onChange={(e) => patchIn('mission', { title: e.target.value })} />
        </div>
        <div>
          <label className="label">Matn</label>
          <textarea className="input min-h-[90px]" value={form.mission.text} onChange={(e) => patchIn('mission', { text: e.target.value })} />
        </div>
      </div>

      {/* Qo'shimcha bo'limlar */}
      <div className="card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold text-ink">
              Qo'shimcha bo'limlar <span className="text-sm font-normal text-muted">({form.sections.length}/{MAX_SECTIONS})</span>
            </h2>
            <p className="mt-1 text-sm text-muted">Ixtiyoriy sondagi matnli bloklar — tarix, jamoa, hamkorlar va h.k.</p>
          </div>
          <button type="button" onClick={sections.add} disabled={form.sections.length >= MAX_SECTIONS} className="btn-outline disabled:opacity-50">
            <Plus size={16} /> Bo'lim qo'shish
          </button>
        </div>

        {form.sections.length === 0 ? (
          <EmptyHint text="Qo'shimcha bo'lim yo'q. Kerak bo'lsa yuqoridagi tugma orqali qo'shing." />
        ) : (
          <div className="mt-5 space-y-3">
            {form.sections.map((s, i) => (
              <SectionRow
                key={s.id}
                section={s}
                index={i}
                total={form.sections.length}
                onChange={(changes) => sections.update(i, changes)}
                onMove={sections.move}
                onRemove={sections.remove}
              />
            ))}
          </div>
        )}
      </div>

      <div className="sticky bottom-4 flex items-center gap-3 rounded-xl border border-line bg-white/95 p-3 shadow-sm backdrop-blur">
        <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Saqlash
        </button>
        {savedMsg && <span className="text-sm font-medium text-accent">{savedMsg}</span>}
        <a href="/about" target="_blank" rel="noreferrer" className="ml-auto text-sm text-primary hover:underline">
          Sahifani ko'rish <ExternalLink size={13} className="inline" />
        </a>
      </div>
    </div>
  );
}

function EmptyHint({ text }) {
  return (
    <p className="mt-4 rounded-xl border border-dashed border-line py-6 text-center text-sm text-muted">
      {text}
    </p>
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

// Video: havola (YouTube/Vimeo) yoki yuklangan fayl
function VideoBlock({ video, onChange }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true); setProgress(0);
    try {
      const res = await api.upload('/admin/upload', file, { onProgress: setProgress });
      onChange({ url: res.url });
    } catch (err) { alert(err.message); }
    finally { setUploading(false); setProgress(0); }
  };

  const embed = videoEmbed(video.url);
  const unknown = video.url.trim() && embed.kind === 'none';

  return (
    <div className="card space-y-4 p-6">
      <div>
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Video size={18} className="text-primary" /> Video
        </h2>
        <p className="mt-1 text-sm text-muted">
          YouTube yoki Vimeo havolasini qo'ying, yoki video faylni to'g'ridan-to'g'ri yuklang.
        </p>
      </div>

      <div>
        <label className="label">Video havolasi</label>
        <div className="flex flex-wrap gap-2">
          <input
            className="input min-w-[240px] flex-1"
            placeholder="https://youtu.be/... yoki /uploads/video.mp4"
            value={video.url}
            onChange={(e) => onChange({ url: e.target.value })}
          />
          <input ref={fileRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska" hidden onChange={pick} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-outline disabled:opacity-50">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploading ? `Yuklanmoqda… ${progress}%` : 'Video yuklash'}
          </button>
          {video.url && (
            <button type="button" onClick={() => onChange({ url: '' })} className="btn-ghost" title="Videoni olib tashlash">
              <X size={16} /> Olib tashlash
            </button>
          )}
        </div>
        {unknown && (
          <p className="mt-2 text-xs text-amber-700">
            Bu havola tanilmadi. YouTube, Vimeo yoki mp4/webm/mov/mkv fayl havolasi bo'lishi kerak — aks holda sahifada video ko'rsatilmaydi.
          </p>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label">Video sarlavhasi</label>
          <input className="input" value={video.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Ixtiyoriy" />
        </div>
        <div>
          <label className="label">Video ostidagi izoh</label>
          <input className="input" value={video.caption} onChange={(e) => onChange({ caption: e.target.value })} placeholder="Ixtiyoriy" />
        </div>
      </div>

      {/* Jonli ko'rinish — saqlashdan oldin tekshirib olish uchun */}
      {embed.kind !== 'none' && (
        <div>
          <p className="label">Ko'rinishi</p>
          <div className="aspect-video overflow-hidden rounded-xl border border-line bg-black">
            {embed.kind === 'embed' ? (
              <iframe
                src={embed.src}
                title={video.title || 'Video'}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video src={fileUrl(embed.src)} controls className="h-full w-full" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Qo'shimcha bo'lim: sarlavha, matn va ixtiyoriy rasm
function SectionRow({ section, index, total, onChange, onMove, onRemove }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.upload('/admin/upload-image', file);
      onChange({ image: res.url });
    } catch (err) { alert(err.message); }
    finally { setUploading(false); }
  };

  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs font-bold text-muted">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1 space-y-3">
          <input
            className="input"
            placeholder="Bo'lim sarlavhasi"
            value={section.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
          <textarea
            className="input min-h-[100px]"
            placeholder="Matn. Yangi qatordan yozsangiz sahifada ham alohida abzats bo'ladi."
            value={section.text}
            onChange={(e) => onChange({ text: e.target.value })}
          />

          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={pick} />
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-ghost text-sm disabled:opacity-50">
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImageIcon size={15} />}
              {section.image ? 'Rasmni almashtirish' : 'Rasm qo\'shish'}
            </button>
            {section.image && (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileUrl(section.image)} alt="" className="h-12 w-20 rounded-lg border border-line object-cover" />
                <button type="button" onClick={() => onChange({ image: '' })} className="btn-ghost text-sm">
                  <X size={15} /> Rasmni olib tashlash
                </button>
              </>
            )}
          </div>
        </div>
        <RowActions index={index} total={total} onMove={onMove} onRemove={onRemove} />
      </div>
    </div>
  );
}
