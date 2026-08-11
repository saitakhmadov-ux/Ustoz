'use client';

// Aloqa kanallari (email, Telegram bot) va bot himoyasi sozlamalari — hammasi
// bazadan boshqariladi, shuning uchun almashtirish uchun qayta joylash shart emas.

import { useEffect, useState } from 'react';
import {
  Mail, Save, Loader2, Send, Server, Power, ShieldCheck, KeyRound,
  Info, AtSign, Lock, CheckCircle2, AlertTriangle, Bot, Users,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Spinner, ErrorState } from '@/components/ui';

const TABS = [
  { id: 'email', label: 'Email (SMTP)', icon: Server },
  { id: 'telegram', label: 'Telegram bot', icon: Bot },
  { id: 'security', label: 'CAPTCHA', icon: ShieldCheck },
];

export default function AdminEmailPage() {
  const [tab, setTab] = useState('email');
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-primary"><Mail size={22} /></span>
        <div>
          <h1 className="text-2xl">Aloqa va himoya</h1>
          <p className="text-sm text-muted">Xat va Telegram orqali xabar berish, formalarni botlardan himoyalash.</p>
        </div>
      </div>

      {/* Tablar */}
      <div className="mt-6 flex gap-1 border-b border-line">
        {TABS.map((t) => {
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
        {tab === 'email' && <EmailTab />}
        {tab === 'telegram' && <TelegramTab />}
        {tab === 'security' && <SecurityTab />}
      </div>
    </div>
  );
}

// Manba yorlig'i — sozlama paneldan keldimi yoki .env dan
function SourceBadge({ source }) {
  const label = source === 'db' ? 'panel' : source === 'env' ? '.env' : 'sozlanmagan';
  return <span className="badge bg-slate-100 text-slate-600">{label}</span>;
}

// Tez to'ldirish uchun tayyor SMTP shablonlari
const PRESETS = [
  { label: 'Gmail', host: 'smtp.gmail.com', port: 587, secure: false },
  { label: 'Yandex', host: 'smtp.yandex.ru', port: 465, secure: true },
  { label: 'Resend', host: 'smtp.resend.com', port: 587, secure: false },
  { label: 'Mail.ru', host: 'smtp.mail.ru', port: 465, secure: true },
];

/* ---------------- Email (SMTP) ---------------- */
function EmailTab() {
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ from: '', host: '', port: 587, secure: false, user: '' });
  const [pass, setPass] = useState('');
  const [live, setLive] = useState(false); // "Haqiqiy xat yuborish" = !mock
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [testTo, setTestTo] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const applyCfg = (c) => {
    setCfg(c);
    setForm({
      from: c.from || '',
      host: c.host || '',
      port: c.port || 587,
      secure: Boolean(c.secure),
      user: c.user || '',
    });
    setLive(!c.mock);
    if (!testTo && c.user) setTestTo(c.user);
  };

  useEffect(() => {
    api.get('/admin/email')
      .then((res) => applyCfg(res.config))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Har qanday o'zgarish "Saqlandi" xabarini so'ndiradi — eskirgan holat ko'rinmasin
  const change = (patch) => { setForm((f) => ({ ...f, ...patch })); setSavedMsg(''); };

  const save = async () => {
    setSaving(true);
    setSavedMsg('');
    try {
      const body = {
        mock: !live,
        from: form.from,
        host: form.host,
        port: Number(form.port) || 587,
        secure: form.secure,
        user: form.user,
      };
      if (pass.trim()) body.pass = pass;
      const res = await api.put('/admin/email', body);
      applyCfg(res.config);
      setPass('');
      setSavedMsg('Saqlandi ✓');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post('/admin/email/test', { to: testTo.trim() });
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  if (error) return <ErrorState message={error} />;
  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {/* Holat */}
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <span className={`grid h-11 w-11 place-items-center rounded-xl ${live ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
          <Power size={20} />
        </span>
        <div className="flex-1">
          <p className="font-semibold text-ink">
            {live ? 'Haqiqiy xatlar yuborilmoqda' : 'Mock rejim — xatlar yuborilmaydi'}
          </p>
          <p className="text-sm text-muted">
            {live
              ? <>Server: <span className="font-mono">{cfg.host || '—'}</span> <SourceBadge source={cfg.source} /></>
              : "Tasdiqlash kodlari faqat server konsoliga chiqadi. Ishga tayyor bo'lgach yoqing."}
          </p>
        </div>
        <button
          onClick={() => { setLive((v) => !v); setSavedMsg(''); }}
          className={`relative h-7 w-12 rounded-full transition-colors ${live ? 'bg-emerald-500' : 'bg-slate-300'}`}
          aria-label="Haqiqiy xat yuborishni yoqish/o'chirish"
        >
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${live ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>

      {/* Yoqilgan, ammo server yo'q — jimgina ishlamay qolmasin */}
      {live && !form.host && (
        <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          SMTP server ko'rsatilmagan — yoqilgan bo'lsa ham xatlar yuborilmaydi. Quyidagi maydonlarni to'ldiring.
        </p>
      )}

      {/* Jo'natuvchi */}
      <div className="card p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <AtSign size={18} className="text-primary" /> Jo'natuvchi
        </h2>
        <p className="mt-1 text-sm text-muted">
          Xat kimdan kelayotgani. Ko'rinishi: <span className="font-mono">Ustoz &lt;no-reply@ustoz.uz&gt;</span>
        </p>
        <input
          value={form.from}
          onChange={(e) => change({ from: e.target.value })}
          placeholder="Ustoz <no-reply@ustoz.uz>"
          className="input mt-3"
        />
      </div>

      {/* SMTP server */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
            <Server size={18} className="text-primary" /> SMTP server
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => change({ host: p.host, port: p.port, secure: p.secure })}
                className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted transition-colors hover:bg-slate-50 hover:text-ink"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-sm text-muted">
          Bu yerni to'ldirsangiz <span className="font-mono">.env</span> dagi SMTP qiymatlari e'tiborga olinmaydi.
          Bo'sh qoldirsangiz — aksincha, <span className="font-mono">.env</span> ga qaytadi.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Server manzili">
            <input
              value={form.host}
              onChange={(e) => change({ host: e.target.value })}
              placeholder="smtp.gmail.com"
              className="input font-mono"
            />
          </Field>
          <Field label="Port">
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={form.port}
                onChange={(e) => change({ port: e.target.value })}
                className="input w-28 font-mono"
              />
              <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={form.secure}
                  onChange={(e) => change({ secure: e.target.checked })}
                  className="h-4 w-4 rounded border-line accent-indigo-600"
                />
                SSL (465-port uchun)
              </label>
            </div>
          </Field>
          <Field label="Foydalanuvchi (login)">
            <input
              value={form.user}
              onChange={(e) => change({ user: e.target.value })}
              placeholder="siz@gmail.com"
              className="input font-mono"
              autoComplete="off"
            />
          </Field>
          <Field label="Parol">
            <input
              type="password"
              value={pass}
              onChange={(e) => { setPass(e.target.value); setSavedMsg(''); }}
              placeholder={cfg.passSet ? `Joriy: ${cfg.passPreview} — yangisini kiriting` : 'Parol yoki App password'}
              className="input font-mono"
              autoComplete="new-password"
            />
          </Field>
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted">
          <Info size={14} className="mt-px shrink-0" />
          Gmail uchun oddiy parol emas, 16 belgili <b className="mx-1">App password</b> kerak
          (akkauntda 2 bosqichli tasdiqlash yoqilgan bo'lishi shart). Parol bo'sh qoldirilsa mavjudi o'zgarmaydi.
        </p>
      </div>

      {/* Saqlash */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Saqlash
        </button>
        {savedMsg && <span className="text-sm font-medium text-accent">{savedMsg}</span>}
      </div>

      {/* Sinov xati */}
      <div className="card p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Send size={18} className="text-primary" /> Sinov xati
        </h2>
        <p className="mt-1 text-sm text-muted">
          Avval saqlang, keyin sinang. Sinov mock rejimni chetlab o'tadi — sozlamani yoqishdan oldin tekshirib olasiz.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <input
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder="qabul qiluvchi@example.com"
            className="input max-w-xs"
          />
          <button onClick={runTest} disabled={testing || !testTo.trim()} className="btn-outline disabled:opacity-50">
            {testing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Yuborish
          </button>
        </div>

        {testResult && (
          <div className={`mt-4 rounded-xl border p-4 text-sm ${testResult.success ? 'border-emerald-200 bg-emerald-50/60' : 'border-red-200 bg-red-50'}`}>
            {testResult.success ? (
              <p className="flex items-start gap-2 text-emerald-700">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <span>{testResult.message}</span>
              </p>
            ) : (
              <>
                <p className="flex items-start gap-2 text-red-700">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>
                    {testResult.step ? `${testResult.step} bosqichida xatolik: ` : ''}
                    {testResult.error}
                  </span>
                </p>
                {testResult.hint && <p className="mt-2 pl-6 text-red-600/90">{testResult.hint}</p>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Telegram bot ---------------- */
function TelegramTab() {
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const applyCfg = (c) => {
    setCfg(c);
    setEnabled(c.enabled !== false);
  };

  useEffect(() => {
    api.get('/admin/telegram')
      .then((res) => applyCfg(res.config))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSavedMsg('');
    setTestResult(null);
    try {
      const body = { enabled };
      if (token.trim()) body.token = token.trim();
      const res = await api.put('/admin/telegram', body);
      applyCfg(res.config);
      setToken('');
      setSavedMsg('Saqlandi ✓');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const runTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      setTestResult(await api.post('/admin/telegram/test'));
    } catch (err) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  if (error) return <ErrorState message={error} />;
  if (loading) return <Spinner />;

  const st = cfg.status || {};
  // Nega ishlamayotganini aniq aytamiz — "ishlamayapti" o'zi yetarli emas
  const reasonText = {
    'no-token': 'Token qo\'yilmagan',
    disabled: 'O\'chirib qo\'yilgan',
    error: st.error || 'Xatolik',
  }[st.reason] || 'Ishlamayapti';

  return (
    <div className="space-y-4">
      {/* Holat */}
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <span className={`grid h-11 w-11 place-items-center rounded-xl ${st.running ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
          <Bot size={20} />
        </span>
        <div className="flex-1">
          <p className="font-semibold text-ink">
            {st.running ? `Bot ishlayapti — @${st.username}` : `Bot ishlamayapti — ${reasonText}`}
          </p>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
            {st.running && (
              <span className="badge bg-slate-100 text-slate-600">
                {st.mode === 'webhook' ? 'webhook' : 'polling (lokal)'}
              </span>
            )}
            <SourceBadge source={cfg.source} />
            <span className="inline-flex items-center gap-1"><Users size={13} /> {cfg.linkedCount} ta hisob ulangan</span>
          </p>
        </div>
        <button
          onClick={() => { setEnabled((v) => !v); setSavedMsg(''); }}
          className={`relative h-7 w-12 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
          aria-label="Botni yoqish/o'chirish"
        >
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>

      {st.reason === 'error' && (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {st.error}
        </p>
      )}

      <p className="flex items-start gap-2 rounded-xl border border-line bg-slate-50 p-3 text-sm text-muted">
        <Info size={16} className="mt-0.5 shrink-0" />
        <span>
          Token Telegram'dagi <span className="font-mono">@BotFather</span> dan olinadi:
          <span className="font-mono"> /newbot</span> → nom va foydalanuvchi nomini kiriting → token beriladi.
          Saqlagach bot darhol ishga tushadi (server qayta yuklanmaydi).
        </span>
      </p>

      {/* Token */}
      <div className="card p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <KeyRound size={18} className="text-primary" /> Bot tokeni
        </h2>
        <input
          type="password"
          value={token}
          onChange={(e) => { setToken(e.target.value); setSavedMsg(''); }}
          placeholder={cfg.tokenSet ? `Joriy: ${cfg.tokenPreview} — yangisini kiriting` : '123456789:AAE...'}
          className="input mt-3 font-mono"
          autoComplete="new-password"
        />
        <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
          <Lock size={12} /> Faqat serverda qoladi. Bo'sh qoldirilsa mavjudi o'zgarmaydi.
        </p>
      </div>

      {/* Saqlash + sinov */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Saqlash
        </button>
        <button onClick={runTest} disabled={testing || !st.running} className="btn-outline disabled:opacity-50">
          {testing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Sinov xabari
        </button>
        {savedMsg && <span className="text-sm font-medium text-accent">{savedMsg}</span>}
      </div>

      {testResult && (
        <div className={`rounded-xl border p-4 text-sm ${testResult.success ? 'border-emerald-200 bg-emerald-50/60' : 'border-red-200 bg-red-50'}`}>
          {testResult.success ? (
            <p className="flex items-start gap-2 text-emerald-700">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> {testResult.message}
            </p>
          ) : (
            <p className="flex items-start gap-2 text-red-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" /> {testResult.error}
            </p>
          )}
        </div>
      )}

      {/* Foydalanuvchi nima qiladi */}
      <div className="card p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <Users size={18} className="text-primary" /> Foydalanuvchilar qanday ulanadi
        </h2>
        <ol className="mt-3 space-y-1.5 text-sm text-muted">
          <li>1. Saytga kiradi → <b className="text-ink">Profil</b> → "Telegram'ga ulash"</li>
          <li>2. Bir martalik havola botni ochadi va hisob bog'lanadi (havola 15 daqiqa amal qiladi)</li>
          <li>3. Botda <span className="font-mono">/kurslarim</span>, <span className="font-mono">/yordam</span>, <span className="font-mono">/uzish</span> buyruqlari ishlaydi</li>
        </ol>
      </div>
    </div>
  );
}

/* ---------------- Bot himoyasi (Turnstile) ---------------- */
function SecurityTab() {
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [siteKey, setSiteKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const applyCfg = (c) => {
    setCfg(c);
    setSiteKey(c.siteKey || '');
  };

  useEffect(() => {
    api.get('/admin/security')
      .then((res) => applyCfg(res.config))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setSavedMsg('');
    try {
      const body = { siteKey };
      if (secretKey.trim()) body.secretKey = secretKey.trim();
      const res = await api.put('/admin/security', body);
      applyCfg(res.config);
      setSecretKey('');
      setSavedMsg('Saqlandi ✓');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (error) return <ErrorState message={error} />;
  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      {/* Holat */}
      <div className="card flex flex-wrap items-center gap-4 p-5">
        <span className={`grid h-11 w-11 place-items-center rounded-xl ${cfg.active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
          <ShieldCheck size={20} />
        </span>
        <div className="flex-1">
          <p className="font-semibold text-ink">
            CAPTCHA {cfg.active ? 'yoqilgan' : "o'chirilgan"}
          </p>
          <p className="text-sm text-muted">
            {cfg.active
              ? <>Ro'yxatdan o'tish va parol tiklash formalari himoyalangan <SourceBadge source={cfg.source} /></>
              : "Ikkala kalit ham to'ldirilsa himoya avtomatik yoqiladi."}
          </p>
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-line bg-slate-50 p-3 text-sm text-muted">
        <Info size={16} className="mt-0.5 shrink-0" />
        <span>
          Kalitlar Cloudflare Turnstile'dan olinadi (bepul va cheksiz):
          <span className="font-mono"> dash.cloudflare.com → Turnstile → Add site</span>.
          Saytga <span className="font-mono">ustoz.uz</span> va <span className="font-mono">localhost</span> domenlarini qo'shing.
        </span>
      </p>

      {/* Kalitlar */}
      <div className="card p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-ink">
          <KeyRound size={18} className="text-primary" /> Turnstile kalitlari
        </h2>
        <div className="mt-4 space-y-3">
          <Field label="Ommaviy kalit (Site Key)">
            <input
              value={siteKey}
              onChange={(e) => { setSiteKey(e.target.value); setSavedMsg(''); }}
              placeholder="0x4AAAAAAA..."
              className="input font-mono"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-muted">Brauzerga beriladi — maxfiy emas.</p>
          </Field>
          <Field label="Maxfiy kalit (Secret Key)">
            <input
              type="password"
              value={secretKey}
              onChange={(e) => { setSecretKey(e.target.value); setSavedMsg(''); }}
              placeholder={cfg.secretSet ? `Joriy: ${cfg.secretPreview} — yangisini kiriting` : '0x4AAAAAAA...'}
              className="input font-mono"
              autoComplete="new-password"
            />
            <p className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <Lock size={12} /> Faqat serverda qoladi. Bo'sh qoldirilsa mavjudi o'zgarmaydi.
            </p>
          </Field>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Saqlash
        </button>
        {savedMsg && <span className="text-sm font-medium text-accent">{savedMsg}</span>}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      {children}
    </div>
  );
}
