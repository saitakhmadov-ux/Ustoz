'use client';

import { useState } from 'react';
import { Loader2, Upload, Link2, Trash2, PlayCircle, FileText, X } from 'lucide-react';
import { api } from '@/lib/api';
import { fileUrl } from '@/lib/constants';

// Dars qo'shish/tahrirlash formasi
// mode: 'create' (sectionId kerak) yoki 'edit' (lesson kerak)
export default function LessonEditor({ sectionId, lesson, onDone, onCancel }) {
  const [form, setForm] = useState({
    title: lesson?.title || '',
    videoUrl: lesson?.videoUrl || '',
    content: lesson?.content || '',
    isFreePreview: lesson?.isFreePreview || false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Materiallar (faqat mavjud darsda — lessonId kerak)
  const [materials, setMaterials] = useState(lesson?.materials || []);

  const save = async () => {
    setError('');
    if (form.title.trim().length < 2) return setError('Dars nomi juda qisqa');
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        videoUrl: form.videoUrl || undefined,
        content: form.content || undefined,
        isFreePreview: form.isFreePreview,
      };
      if (lesson) {
        await api.put(`/admin/lessons/${lesson.id}`, payload);
      } else {
        await api.post('/admin/lessons', { sectionId, ...payload });
      }
      onDone?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-line bg-white p-3">
      {error && <div className="mb-2 rounded bg-red-50 px-3 py-1.5 text-xs text-red-700">{error}</div>}
      <input className="input mb-2 text-sm" placeholder="Dars nomi" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <input className="input mb-2 text-sm" placeholder="Asosiy video URL (YouTube/Vimeo/mp4) — ixtiyoriy" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} />
      <textarea className="input mb-2 min-h-[80px] text-sm" placeholder="Matnli material (ixtiyoriy)" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <input type="checkbox" checked={form.isFreePreview} onChange={(e) => setForm({ ...form, isFreePreview: e.target.checked })} className="h-4 w-4 rounded text-primary focus:ring-primary" />
        Bepul ko'rish (preview)
      </label>

      {/* Materiallar bo'limi — faqat saqlangan darsda */}
      <div className="mt-3 border-t border-line pt-3">
        <p className="mb-2 text-xs font-semibold uppercase text-muted">Qo'shimcha materiallar (video / PDF)</p>
        {lesson ? (
          <MaterialsManager lessonId={lesson.id} materials={materials} setMaterials={setMaterials} />
        ) : (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-muted">
            Materiallar (video/PDF) qo'shish uchun avval darsni saqlang.
          </p>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={save} disabled={saving} className="btn-primary py-1.5 text-sm">
          {saving && <Loader2 size={14} className="animate-spin" />} {lesson ? 'Saqlash' : 'Qo\'shish'}
        </button>
        <button onClick={onCancel} className="btn-ghost py-1.5 text-sm">{lesson ? 'Yopish' : 'Bekor qilish'}</button>
      </div>
    </div>
  );
}

// Dars materiallarini boshqarish: fayl yuklash yoki URL qo'shish + o'chirish
function MaterialsManager({ lessonId, materials, setMaterials }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [err, setErr] = useState('');

  // URL qo'shish rejimi
  const [urlMode, setUrlMode] = useState(false);
  const [urlForm, setUrlForm] = useState({ type: 'VIDEO', title: '', url: '' });
  const [addingUrl, setAddingUrl] = useState(false);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // bir xil faylni qayta tanlash imkoni
    if (!file) return;
    setErr('');
    setUploading(true);
    setProgress(0);
    try {
      // 1) Faylni serverga yuklaymiz
      const up = await api.upload('/admin/upload', file, { onProgress: setProgress });
      // 2) Material yozuvini yaratamiz
      const res = await api.post('/admin/materials', {
        lessonId,
        type: up.type,
        title: up.originalName || file.name,
        url: up.url,
      });
      setMaterials((prev) => [...prev, res.material]);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const addUrl = async () => {
    setErr('');
    if (!urlForm.title.trim()) return setErr('Material nomini kiriting');
    if (!/^https?:\/\//i.test(urlForm.url)) return setErr('To\'g\'ri URL kiriting (http...)');
    setAddingUrl(true);
    try {
      const res = await api.post('/admin/materials', {
        lessonId,
        type: urlForm.type,
        title: urlForm.title.trim(),
        url: urlForm.url.trim(),
      });
      setMaterials((prev) => [...prev, res.material]);
      setUrlForm({ type: 'VIDEO', title: '', url: '' });
      setUrlMode(false);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setAddingUrl(false);
    }
  };

  const remove = async (id) => {
    if (!confirm('Bu materialni o\'chirasizmi?')) return;
    try {
      await api.del(`/admin/materials/${id}`);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } catch (e2) { alert(e2.message); }
  };

  return (
    <div>
      {err && <div className="mb-2 rounded bg-red-50 px-3 py-1.5 text-xs text-red-700">{err}</div>}

      {/* Mavjud materiallar ro'yxati */}
      {materials.length > 0 && (
        <ul className="mb-2 space-y-1.5">
          {materials.map((m) => (
            <li key={m.id} className="flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-sm">
              {m.type === 'VIDEO'
                ? <PlayCircle size={15} className="shrink-0 text-primary" />
                : <FileText size={15} className="shrink-0 text-red-500" />}
              <a href={fileUrl(m.url)} target="_blank" rel="noreferrer" className="flex-1 truncate hover:text-primary hover:underline">
                {m.title}
              </a>
              <span className="badge bg-slate-100 text-xs text-slate-600">{m.type}</span>
              <button onClick={() => remove(m.id)} className="text-red-500 hover:text-red-700" title="O'chirish">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Yuklash jarayoni */}
      {uploading && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-muted"><span>Yuklanmoqda...</span><span>{progress}%</span></div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* URL qo'shish formasi */}
      {urlMode ? (
        <div className="mb-2 rounded-lg border border-line p-2.5">
          <div className="flex gap-2">
            <select className="input w-28 text-sm" value={urlForm.type} onChange={(e) => setUrlForm({ ...urlForm, type: e.target.value })}>
              <option value="VIDEO">Video</option>
              <option value="PDF">PDF</option>
            </select>
            <input className="input flex-1 text-sm" placeholder="Material nomi" value={urlForm.title} onChange={(e) => setUrlForm({ ...urlForm, title: e.target.value })} />
          </div>
          <input className="input mt-2 text-sm" placeholder="https://... (havola)" value={urlForm.url} onChange={(e) => setUrlForm({ ...urlForm, url: e.target.value })} />
          <div className="mt-2 flex gap-2">
            <button onClick={addUrl} disabled={addingUrl} className="btn-primary py-1 text-xs">
              {addingUrl && <Loader2 size={12} className="animate-spin" />} Qo'shish
            </button>
            <button onClick={() => { setUrlMode(false); setErr(''); }} className="btn-ghost py-1 text-xs"><X size={12} /> Bekor</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <label className={`btn-outline cursor-pointer py-1.5 text-sm ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
            <Upload size={14} /> Fayl yuklash (video/PDF)
            <input type="file" accept=".mp4,.webm,.mov,.mkv,.pdf,video/*,application/pdf" className="hidden" onChange={onFile} disabled={uploading} />
          </label>
          <button type="button" onClick={() => setUrlMode(true)} className="btn-ghost py-1.5 text-sm">
            <Link2 size={14} /> URL orqali qo'shish
          </button>
        </div>
      )}
    </div>
  );
}
