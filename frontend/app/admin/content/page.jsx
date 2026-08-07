'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, Info } from 'lucide-react';
import { api } from '@/lib/api';
import { Spinner, ErrorState } from '@/components/ui';

// Tahrirlanadigan maydonlar tavsifi (label + turi)
const FIELDS = [
  { key: 'heroTitle', label: 'Hero sarlavha', type: 'input', hint: 'Bosh sahifadagi katta sarlavha.' },
  { key: 'heroSubtitle', label: 'Hero matni', type: 'textarea', hint: 'Sarlavha ostidagi tavsif matni.' },
  { key: 'ctaTitle', label: 'CTA sarlavha', type: 'input', hint: 'Pastdagi chaqiruv bloki sarlavhasi.' },
  { key: 'ctaSubtitle', label: 'CTA matni', type: 'textarea', hint: 'Chaqiruv bloki tavsifi.' },
  { key: 'footerText', label: 'Footer matni', type: 'input', hint: 'Sahifa pastidagi mualliflik matni.' },
];

const EMPTY = { heroTitle: '', heroSubtitle: '', ctaTitle: '', ctaSubtitle: '', footerText: '' };

export default function AdminContentPage() {
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
    setSaving(true);
    setSavedMsg('');
    try {
      const res = await api.put('/admin/content', form);
      setForm({ ...EMPTY, ...(res.content || {}) });
      setSavedMsg('Saqlandi ✓');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl">Sayt matnlari</h1>
      <p className="mt-1 text-sm text-muted">
        Bosh sahifadagi hero, chaqiruv (CTA) va footer matnlarini shu yerdan tahrirlang.
        O'zgarishlar saqlangach darhol saytda ko'rinadi.
      </p>

      {error ? (
        <div className="mt-6"><ErrorState message={error} /></div>
      ) : loading ? (
        <div className="mt-6"><Spinner /></div>
      ) : (
        <>
          <div className="card mt-6 space-y-5 p-6">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="label">{f.label}</label>
                {f.type === 'textarea' ? (
                  <textarea
                    className="input min-h-[90px]"
                    value={form[f.key] || ''}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                ) : (
                  <input
                    className="input"
                    value={form[f.key] || ''}
                    onChange={(e) => set(f.key, e.target.value)}
                  />
                )}
                <p className="mt-1 text-xs text-muted">{f.hint}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Saqlash
            </button>
            {savedMsg && <span className="text-sm font-medium text-accent">{savedMsg}</span>}
          </div>

          <p className="mt-4 flex items-start gap-1.5 text-xs text-muted">
            <Info size={14} className="mt-px shrink-0" />
            Maydonni bo'sh qoldirsangiz, o'sha joyda standart matn ko'rsatiladi.
          </p>
        </>
      )}
    </div>
  );
}
