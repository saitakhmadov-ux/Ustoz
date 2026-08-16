'use client';

// Baza — bosh admin uchun: hajm manzarasi, avtomatik tozalash muddatlari va
// zaxira yuklab olish.
//
// Tiklash (restore) tugmasi ATAYLAB yo'q: bitta tasodifiy bosish butun bazani
// almashtirib yuborishi mumkin. Tiklash terminal orqali qilinadi (README).

import { useEffect, useState } from 'react';
import {
  Database, Download, Loader2, Save, Trash2, AlertTriangle, ShieldAlert,
  RefreshCw, HardDrive, Eye, CheckCircle2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Spinner, ErrorState } from '@/components/ui';

// Avtomatik tozalanadigan jadvallar — ro'yxatda belgilab turamiz
const CLEANED = {
  TypingAttempt: 'klaviatura urinishlari',
  QuizAttempt: 'test urinishlari',
  IeltsAttempt: 'IELTS insholari',
  AiUsage: 'AI so\'rovlari',
  Notification: 'bildirishnomalar',
  VerificationCode: 'tasdiqlash kodlari',
  TelegramLink: 'ulash havolalari',
};

// Tozalash natijasidagi kalitlar uchun o'zbekcha nom
const RESULT_LABELS = {
  verificationCodes: 'Tasdiqlash kodlari',
  telegramLinks: 'Telegram havolalari',
  notificationsRead: 'O\'qilgan bildirishnomalar',
  notificationsUnread: 'O\'qilmagan bildirishnomalar',
  aiUsage: 'AI so\'rovlari tarixi',
  typingAttempts: 'Klaviatura urinishlari',
  quizAttempts: 'Test urinishlari',
  ieltsAttempts: 'IELTS insholari',
};

// Sozlama maydonlari — guruhlar bo'yicha
const GROUPS = [
  {
    title: 'Mashq va test urinishlari',
    hint: 'Har (o\'quvchi × dars) juftligi uchun oxirgi N ta urinish yoshidan '
      + 'qat\'i nazar saqlanadi. Progress va sertifikat alohida jadvalda — ular o\'chmaydi.',
    rows: [
      { label: 'Klaviatura mashqi', days: 'typingAttemptDays', keep: 'typingAttemptKeep' },
      { label: 'Testlar', days: 'quizAttemptDays', keep: 'quizAttemptKeep' },
      { label: 'IELTS insholari', days: 'ieltsAttemptDays', keep: 'ieltsAttemptKeep' },
    ],
  },
  {
    title: 'Xabarlar va tarix',
    hint: 'Bildirishnomalar o\'qilgan-o\'qilmaganiga qarab alohida muddat bilan saqlanadi.',
    rows: [
      { label: 'O\'qilgan bildirishnomalar', days: 'notificationReadDays' },
      { label: 'O\'qilmagan bildirishnomalar', days: 'notificationUnreadDays' },
      { label: 'AI so\'rovlari tarixi', days: 'aiUsageDays' },
    ],
  },
  {
    title: 'Vaqtinchalik yozuvlar',
    hint: 'Bir martalik kodlar va havolalar — ishlatilgandan keyin keraksiz.',
    rows: [
      { label: 'Tasdiqlash kodlari', days: 'verificationCodeDays' },
      { label: 'Telegram ulash havolalari', days: 'telegramLinkDays' },
    ],
  },
];

export default function AdminDatabasePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    return api.get('/admin/db/stats')
      .then((res) => { setData(res); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading && !data) return <Spinner label="Baza holati o'qilmoqda..." />;
  if (error && !data) return <ErrorState message={error} />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-primary">
            <Database size={22} />
          </span>
          <div>
            <h1 className="text-2xl">Baza</h1>
            <p className="text-sm text-muted">Hajm, avtomatik tozalash va zaxira nusxa.</p>
          </div>
        </div>
        <button type="button" onClick={load} className="btn-outline px-3 py-2 text-sm">
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Yangilash
        </button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SizeCard db={data.db} />
        <div className="space-y-6">
          <BackupCard pgDump={data.pgDump} />
          <CleanupCard lastCleanup={data.lastCleanup} onDone={load} />
        </div>
      </div>

      <RetentionCard retention={data.retention} defaults={data.defaults} />
    </div>
  );
}

/* ---------------- Hajm ---------------- */
function SizeCard({ db }) {
  const max = db.tables.length ? db.tables[0].bytes : 1;
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <HardDrive size={18} className="text-primary" /> Jadvallar
        </h2>
        <span className="badge bg-indigo-50 text-primary">Jami {db.size}</span>
      </div>

      <div className="mt-4 max-h-[26rem] space-y-1 overflow-y-auto pr-1">
        {db.tables.map((t) => (
          <div key={t.name} className="rounded-lg px-2 py-1.5 hover:bg-slate-50">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate font-medium text-ink">
                {t.name}
                {CLEANED[t.name] && (
                  <span className="ml-2 badge bg-emerald-50 text-emerald-700">tozalanadi</span>
                )}
              </span>
              <span className="shrink-0 text-xs text-muted">
                {t.rows.toLocaleString('uz')} qator · {t.size}
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-primary/60"
                style={{ width: `${Math.max(2, Math.round((t.bytes / max) * 100))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Zaxira ---------------- */
function BackupCard({ pgDump }) {
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState('');

  const download = async (format) => {
    setBusy(format);
    setErr('');
    try {
      await api.download(
        `/admin/db/backup?format=${format}`,
        format === 'sql' ? 'ustoz-zaxira.dump' : 'ustoz-zaxira.ndjson.gz'
      );
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="card p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Download size={18} className="text-primary" /> Zaxira nusxa
      </h2>
      <p className="mt-1 text-sm text-muted">
        Barcha jadvallar bitta faylga yig'iladi. Sxemaga yangi jadval qo'shilsa,
        u ham avtomatik zaxiraga tushadi.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => download('json')}
          disabled={Boolean(busy)}
          className="btn-primary px-4 py-2 text-sm"
        >
          {busy === 'json' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
          JSON zaxira
        </button>
        {pgDump.available && (
          <button
            type="button"
            onClick={() => download('sql')}
            disabled={Boolean(busy)}
            className="btn-outline px-4 py-2 text-sm"
          >
            {busy === 'sql' ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            SQL (pg_dump)
          </button>
        )}
      </div>

      {!pgDump.available && (
        <p className="mt-2 text-xs text-muted">
          SQL zaxira bu serverda mavjud emas (<code>pg_dump</code> o'rnatilmagan) —
          JSON zaxira barcha maʼlumotni to'liq saqlaydi.
        </p>
      )}
      {busy && <p className="mt-2 text-xs text-muted">Fayl tayyorlanmoqda, kuting…</p>}
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}

      <div className="mt-4 flex gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
        <ShieldAlert size={16} className="mt-0.5 shrink-0" />
        <p>
          Faylda foydalanuvchi maʼlumotlari va maxfiy kalitlar (bot tokeni, SMTP
          paroli, AI kaliti) bo'ladi. Uni ochiq joyga qo'ymang.
          <br />
          Tiklash panelda ataylab yo'q — terminal orqali:{' '}
          <code>npm run db:restore -- fayl.ndjson.gz</code>
        </p>
      </div>
    </div>
  );
}

/* ---------------- Tozalash ---------------- */
function CleanupCard({ lastCleanup, onDone }) {
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState('');
  const [done, setDone] = useState(null);
  const [err, setErr] = useState('');

  const run = async (dryRun) => {
    setBusy(dryRun ? 'preview' : 'run');
    setErr('');
    try {
      const res = await api.post(`/admin/db/cleanup${dryRun ? '?dryRun=1' : ''}`);
      if (dryRun) { setPreview(res.result); setDone(null); } else {
        setDone(res.result);
        setPreview(null);
        await onDone();
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  };

  const shown = preview || done;
  const rows = shown ? Object.entries(shown.tables).filter(([, n]) => n > 0) : [];

  return (
    <div className="card p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <Trash2 size={18} className="text-primary" /> Tozalash
      </h2>
      <p className="mt-1 text-sm text-muted">
        Har kuni avtomatik ishlaydi. Bu yerdan qo'lda ham ishga tushirish mumkin.
      </p>

      {lastCleanup && !shown && (
        <p className="mt-3 text-xs text-muted">
          Oxirgi tozalash: {new Date(lastCleanup.at).toLocaleString('uz')} ·{' '}
          {lastCleanup.total} ta yozuv o'chirilgan
        </p>
      )}

      {shown && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm">
          <p className={`font-medium ${done ? 'text-emerald-700' : 'text-ink'}`}>
            {done
              ? <><CheckCircle2 size={15} className="mr-1 inline" />{done.total} ta yozuv o'chirildi</>
              : `${preview.total} ta yozuv o'chiriladi`}
          </p>
          {rows.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-muted">
              {rows.map(([key, n]) => (
                <li key={key}>{RESULT_LABELS[key] || key}: {n.toLocaleString('uz')}</li>
              ))}
            </ul>
          )}
          {rows.length === 0 && (
            <p className="mt-1 text-xs text-muted">Tozalanadigan eskirgan yozuv yo'q.</p>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => run(true)}
          disabled={Boolean(busy)}
          className="btn-outline px-4 py-2 text-sm"
        >
          {busy === 'preview' ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
          Nima o'chishini ko'rish
        </button>
        {preview && preview.total > 0 && (
          <button
            type="button"
            onClick={() => run(false)}
            disabled={Boolean(busy)}
            className="btn-primary px-4 py-2 text-sm"
          >
            {busy === 'run' ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            Tozalash
          </button>
        )}
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}

/* ---------------- Muddatlar ---------------- */
function RetentionCard({ retention, defaults }) {
  const [form, setForm] = useState(retention);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { setForm(retention); }, [retention]);

  const change = (key, value) => {
    setForm((f) => ({ ...f, [key]: value === '' ? 0 : Number(value) }));
    setSaved('');
  };

  const save = async () => {
    setSaving(true);
    setErr('');
    try {
      const res = await api.put('/admin/db/retention', form);
      setForm(res.retention);
      setSaved('Saqlandi');
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const changed = JSON.stringify(form) !== JSON.stringify(retention);

  return (
    <div className="card mt-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Saqlash muddatlari</h2>
          <p className="mt-1 text-sm text-muted">
            <strong>0</strong> qo'ysangiz o'sha qoida o'chadi — hech narsa o'chirilmaydi.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-emerald-600">{saved}</span>}
          <button
            type="button"
            onClick={() => setForm(defaults)}
            className="btn-ghost px-3 py-2 text-sm"
          >
            Standartga qaytarish
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || !changed}
            className="btn-primary px-4 py-2 text-sm"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Saqlash
          </button>
        </div>
      </div>

      {err && <p className="mt-3 text-sm text-red-600">{err}</p>}

      <div className="mt-5 grid gap-6 lg:grid-cols-3">
        {GROUPS.map((group) => (
          <div key={group.title}>
            <p className="text-sm font-semibold text-ink">{group.title}</p>
            <p className="mt-1 text-xs text-muted">{group.hint}</p>
            <div className="mt-3 space-y-3">
              {group.rows.map((row) => (
                <div key={row.label} className="flex items-end gap-3">
                  <div className="min-w-0 flex-1">
                    <label className="label text-xs">{row.label}</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        value={form[row.days]}
                        onChange={(e) => change(row.days, e.target.value)}
                        className="input w-20 py-1.5 text-sm"
                      />
                      <span className="text-xs text-muted">kun</span>
                    </div>
                  </div>
                  {row.keep && (
                    <div>
                      <label className="label text-xs">oxirgi</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          value={form[row.keep]}
                          onChange={(e) => change(row.keep, e.target.value)}
                          className="input w-20 py-1.5 text-sm"
                        />
                        <span className="text-xs text-muted">ta</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex gap-2 rounded-xl bg-slate-50 p-3 text-xs text-muted">
        <AlertTriangle size={16} className="mt-0.5 shrink-0 text-subtle" />
        <p>
          To'lovlar, daromadlar, o'tkazmalar, sertifikatlar, yozilishlar, progress
          va sharhlar <strong>hech qachon</strong> o'chirilmaydi — bu yerdagi
          muddatlar ularga taalluqli emas.
        </p>
      </div>
    </div>
  );
}
