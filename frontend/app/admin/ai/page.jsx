'use client';

import { useEffect, useState } from 'react';
import {
  Bot, Save, Loader2, KeyRound, Cpu, Sparkles, RefreshCw, Play, Power,
  BarChart3, Users, MessageSquare, Code2, ThumbsUp, ThumbsDown, TrendingUp, Info,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Spinner, ErrorState } from '@/components/ui';

export default function AdminAiPage() {
  const [tab, setTab] = useState('settings');
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 text-primary"><Bot size={22} /></span>
        <div>
          <h1 className="text-2xl">Ustoz AI</h1>
          <p className="text-sm text-muted">AI yordamchini boshqarish va foydalanish tahlili.</p>
        </div>
      </div>

      {/* Tablar */}
      <div className="mt-6 flex gap-1 border-b border-line">
        {[
          { id: 'settings', label: 'Sozlamalar', icon: Cpu },
          { id: 'analytics', label: 'Analitika', icon: BarChart3 },
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
        {tab === 'settings' ? <SettingsTab /> : <AnalyticsTab />}
      </div>
    </div>
  );
}

/* ---------------- Sozlamalar ---------------- */
function SettingsTab() {
  const [cfg, setCfg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [instructions, setInstructions] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [models, setModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const applyCfg = (c) => {
    setCfg(c);
    setModel(c.model || '');
    setInstructions(c.customInstructions || '');
    setEnabled(c.enabled !== false);
  };

  useEffect(() => {
    api.get('/admin/ai/config')
      .then((res) => applyCfg(res.config))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const loadModels = async () => {
    setLoadingModels(true);
    try {
      const res = await api.get('/admin/ai/models');
      setModels(res.models || []);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingModels(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setSavedMsg('');
    try {
      const body = { model, customInstructions: instructions, enabled };
      if (apiKey.trim()) body.apiKey = apiKey.trim();
      const res = await api.put('/admin/ai/config', body);
      applyCfg(res.config);
      setApiKey('');
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
      const res = await api.post('/admin/ai/test');
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
        <span className={`grid h-11 w-11 place-items-center rounded-xl ${enabled ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-subtle'}`}>
          <Power size={20} />
        </span>
        <div className="flex-1">
          <p className="font-semibold text-ink">AI Ustoz {enabled ? 'yoqilgan' : 'o\'chirilgan'}</p>
          <p className="text-sm text-muted">
            Kalit: {cfg.keySet
              ? <>o'rnatilgan <span className="font-mono">{cfg.keyPreview}</span> <span className="badge bg-slate-100 text-slate-600">{cfg.keySource === 'db' ? 'panel' : cfg.keySource === 'env' ? '.env' : '—'}</span></>
              : <span className="text-red-500">yo'q</span>}
          </p>
        </div>
        {/* Toggle */}
        <button
          onClick={() => { setEnabled((v) => !v); setSavedMsg(''); }}
          className={`relative h-7 w-12 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
          aria-label="AI yoqish/o'chirish"
        >
          <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-surface shadow transition-all ${enabled ? 'left-[22px]' : 'left-0.5'}`} />
        </button>
      </div>

      {/* API kalit */}
      <div className="card p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-heading"><KeyRound size={18} className="text-primary" /> API kalit</h2>
        <p className="mt-1 text-sm text-muted">Google AI Studio (aistudio.google.com/apikey) dan olinadi. Bo'sh qoldirsangiz mavjud kalit o'zgarmaydi.</p>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => { setApiKey(e.target.value); setSavedMsg(''); }}
          placeholder={cfg.keySet ? `Joriy: ${cfg.keyPreview} — yangisini kiriting` : 'API kalitni kiriting'}
          className="input mt-3 font-mono"
          autoComplete="off"
        />
      </div>

      {/* Model */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-heading"><Cpu size={18} className="text-primary" /> Gemini modeli</h2>
          <button onClick={loadModels} disabled={loadingModels} className="btn-outline text-sm">
            {loadingModels ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Modellarni yuklash
          </button>
        </div>
        <p className="mt-1 text-sm text-muted">AI qaysi model bilan ishlashini tanlang.</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          {models.length > 0 ? (
            <select value={model} onChange={(e) => { setModel(e.target.value); setSavedMsg(''); }} className="input max-w-xs">
              {!models.includes(model) && model && <option value={model}>{model} (joriy)</option>}
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          ) : (
            <input value={model} onChange={(e) => { setModel(e.target.value); setSavedMsg(''); }} placeholder="masalan: gemini-3.6-flash" className="input max-w-xs font-mono" />
          )}
          <span className="text-xs text-muted">Joriy: <span className="font-mono">{cfg.model}</span></span>
        </div>
      </div>

      {/* Yo'naltiruvchi ko'rsatmalar */}
      <div className="card p-5">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-heading"><Sparkles size={18} className="text-primary" /> Yo'naltiruvchi ko'rsatmalar</h2>
        <p className="mt-1 text-sm text-muted">
          AI xatti-harakatiga qo'shimcha yo'nalish bering — ohang, uslub, ustuvorliklar. Bu matn har bir javob uchun tizim ko'rsatmasiga qo'shiladi.
        </p>
        <textarea
          value={instructions}
          onChange={(e) => { setInstructions(e.target.value); setSavedMsg(''); }}
          rows={5}
          placeholder="Masalan: Javoblarni doim amaliy misol bilan tushuntir. Talabani o'ylashga undaydigan savol ber. Juda uzun yozma."
          className="input mt-3 min-h-[120px]"
        />
        <p className="mt-1 text-right text-xs text-muted">{instructions.length} / 4000</p>
      </div>

      {/* Saqlash + sinov */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Saqlash
        </button>
        <button onClick={runTest} disabled={testing} className="btn-outline disabled:opacity-50">
          {testing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Sinab ko'rish
        </button>
        {savedMsg && <span className="text-sm font-medium text-accent">{savedMsg}</span>}
      </div>

      {/* Sinov natijasi */}
      {testResult && (
        <div className={`card p-4 text-sm ${testResult.success ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50'}`}>
          {testResult.success ? (
            <>
              <p className="font-medium text-emerald-700">✓ Ishladi ({testResult.model})</p>
              <p className="mt-1 whitespace-pre-wrap text-ink">{testResult.answer}</p>
            </>
          ) : (
            <p className="text-red-700">⛔ {testResult.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- Analitika ---------------- */
function AnalyticsTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/ai/analytics')
      .then((res) => setData(res.analytics))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (loading) return <Spinner />;
  const a = data;

  if (a.total === 0) {
    return (
      <div className="card grid place-items-center py-16 text-center text-muted">
        <Bot size={36} className="mb-3 opacity-50" />
        <p className="font-medium text-ink">Hali foydalanish yo'q</p>
        <p className="text-sm">Talabalar AI Ustozdan foydalanishni boshlaganda bu yerda tahlil paydo bo'ladi.</p>
      </div>
    );
  }

  const maxDay = Math.max(1, ...a.byDay.map((d) => d.count));
  const maxCourse = Math.max(1, ...a.byCourse.map((c) => c.count));

  return (
    <div className="space-y-4">
      {/* Asosiy ko'rsatkichlar */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={MessageSquare} label="Jami savollar" value={a.total} tint="indigo" />
        <Stat icon={Users} label="Noyob foydalanuvchi" value={a.uniqueUsers} tint="emerald" />
        <Stat icon={TrendingUp} label="So'nggi 7 kun" value={a.last7} tint="sky" />
        <Stat icon={BarChart3} label="So'nggi 30 kun" value={a.last30} tint="violet" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Foydalilik */}
        <div className="card p-5">
          <h3 className="flex items-center gap-2 font-semibold text-heading"><ThumbsUp size={17} className="text-primary" /> Foydalilik bahosi</h3>
          {a.helpfulRate === null ? (
            <p className="mt-4 text-sm text-muted">Hali baho berilmagan. Talabalar javoblarni 👍/👎 baholasa, foydalilik shu yerda ko'rinadi.</p>
          ) : (
            <>
              <div className="mt-4 flex items-end gap-2">
                <span className="font-display text-4xl font-bold text-emerald-600">{a.helpfulRate}%</span>
                <span className="mb-1 text-sm text-muted">foydali deb baholangan</span>
              </div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-red-100">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${a.helpfulRate}%` }} />
              </div>
              <div className="mt-3 flex gap-4 text-sm">
                <span className="inline-flex items-center gap-1.5 text-emerald-600"><ThumbsUp size={15} /> {a.helpfulYes}</span>
                <span className="inline-flex items-center gap-1.5 text-red-500"><ThumbsDown size={15} /> {a.helpfulNo}</span>
              </div>
            </>
          )}
        </div>

        {/* Savol turi */}
        <div className="card p-5">
          <h3 className="flex items-center gap-2 font-semibold text-heading"><Code2 size={17} className="text-primary" /> Savol turi</h3>
          <div className="mt-4 space-y-3">
            <Bar label="Kod biriktirilgan" value={a.withCode} total={a.total} color="bg-indigo-500" />
            <Bar label="Xato tuzatish (konsol xatosi bilan)" value={a.withError} total={a.total} color="bg-amber-500" />
            <Bar label="Faqat tushuncha/nazariy" value={a.total - a.withCode} total={a.total} color="bg-emerald-500" />
          </div>
        </div>
      </div>

      {/* Kurslar bo'yicha */}
      <div className="card p-5">
        <h3 className="flex items-center gap-2 font-semibold text-heading"><BarChart3 size={17} className="text-primary" /> Kurslar bo'yicha foydalanish</h3>
        <div className="mt-4 space-y-2.5">
          {a.byCourse.map((c) => (
            <div key={c.courseId || 'none'} className="flex items-center gap-3">
              <span className="w-48 shrink-0 truncate text-sm text-ink" title={c.title}>{c.title}</span>
              <div className="h-6 flex-1 overflow-hidden rounded-lg bg-slate-100">
                <div className="flex h-full items-center rounded-lg bg-primary px-2 text-xs font-medium text-on-primary" style={{ width: `${Math.max(8, (c.count / maxCourse) * 100)}%` }}>
                  {c.count}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kunlik trend */}
      <div className="card p-5">
        <h3 className="flex items-center gap-2 font-semibold text-heading"><TrendingUp size={17} className="text-primary" /> So'nggi 14 kun</h3>
        <div className="mt-4 flex items-end gap-1.5" style={{ height: 120 }}>
          {a.byDay.map((d) => (
            <div key={d.date} className="group flex flex-1 flex-col items-center justify-end gap-1">
              <span className="text-[10px] text-muted opacity-0 group-hover:opacity-100">{d.count}</span>
              <div
                className="w-full rounded-t bg-indigo-400 transition-colors group-hover:bg-primary"
                style={{ height: `${(d.count / maxDay) * 90}px`, minHeight: d.count > 0 ? 4 : 2, opacity: d.count > 0 ? 1 : 0.3 }}
                title={`${d.date}: ${d.count}`}
              />
              <span className="text-[9px] text-muted">{d.date.slice(8)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ko'p so'raladigan mavzular */}
      {a.keywords.length > 0 && (
        <div className="card p-5">
          <h3 className="flex items-center gap-2 font-semibold text-heading"><Sparkles size={17} className="text-primary" /> Ko'p so'raladigan mavzular</h3>
          <p className="mt-1 text-sm text-muted">Savollardagi eng ko'p uchraydigan so'zlar (umumiy tasavvur uchun).</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {a.keywords.map((k) => (
              <span key={k.word} className="rounded-full border border-line bg-slate-50 px-3 py-1 text-sm" style={{ fontSize: `${Math.min(1.15, 0.85 + k.count * 0.04)}rem` }}>
                {k.word} <span className="text-muted">{k.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* So'nggi savollar namunasi */}
      {a.recentSample.length > 0 && (
        <div className="card p-5">
          <h3 className="flex items-center gap-2 font-semibold text-heading"><MessageSquare size={17} className="text-primary" /> So'nggi savollar (namuna)</h3>
          <ul className="mt-3 space-y-2">
            {a.recentSample.map((r, i) => (
              <li key={i} className="flex items-start gap-2 border-b border-line/60 pb-2 text-sm last:border-0">
                {r.hasError ? <span title="Xato tuzatish" className="mt-0.5 text-amber-500">⚠️</span>
                  : r.hasCode ? <Code2 size={15} className="mt-0.5 shrink-0 text-indigo-500" />
                  : <MessageSquare size={14} className="mt-0.5 shrink-0 text-subtle" />}
                <span className="flex-1 text-ink">{r.question}</span>
                <span className="shrink-0 text-xs text-muted">{new Date(r.createdAt).toLocaleDateString('uz')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="flex items-start gap-1.5 text-xs text-muted">
        <Info size={14} className="mt-px shrink-0" />
        Foydalilik = 👍 / (👍 + 👎). Talabalar chatda javoblarni baholaydi. Ko'proq baho — aniqroq tahlil.
      </p>
    </div>
  );
}

function Stat({ icon: Icon, label, value, tint }) {
  const tints = {
    indigo: 'bg-indigo-100 text-indigo-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    sky: 'bg-sky-100 text-sky-600',
    violet: 'bg-violet-100 text-violet-600',
  };
  return (
    <div className="card p-4">
      <span className={`grid h-9 w-9 place-items-center rounded-lg ${tints[tint]}`}><Icon size={18} /></span>
      <p className="mt-3 font-display text-2xl font-bold text-ink">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

function Bar({ label, value, total, color }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-ink">{label}</span>
        <span className="text-muted">{value} ({pct}%)</span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
