'use client';

// Bosh admin uchun "Moliya" boʻlimi — platformadagi butun pul oqimi bir joyda:
// tranzaksiyalar, taqsimot, ustozlar kesimi, oʻtkazmalar va foiz sozlamalari.
// Avval "Toʻlovlar" alohida sahifa edi va aylanma raqami ikki joyda takrorlanardi.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Wallet, Coins, Landmark, Receipt, Clock, CheckCircle2, Users, AlertTriangle,
  Download, Printer, Plus, Loader2, X, Settings2, Trash2, ArrowRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/constants';
import { Spinner, ErrorState, EmptyState } from '@/components/ui';
import {
  StatCard, TimeBars, SplitBar, PeriodTabs, GrowthBadge, PERIOD_CAPTION,
} from '@/components/admin/earnings-ui';
import PaymentsTable from '@/components/admin/PaymentsTable';

// Pul yoʻli boʻyicha tartib: tushdi -> taqsimlandi -> kimga tegishli -> toʻlandi -> qoida
const TABS = [
  { key: 'overview', label: 'Umumiy' },
  { key: 'payments', label: "Toʻlovlar" },
  { key: 'instructors', label: 'Ustozlar' },
  { key: 'payouts', label: "Oʻtkazmalar" },
  { key: 'settings', label: 'Foizlar' },
];

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('uz-UZ') : '—';
}

export default function AdminEarnings() {
  const [tab, setTab] = useState('overview');
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/earnings?period=${period}`)
      .then((res) => { setData(res); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // Yorliq manzil qatorida saqlanadi — eski /admin/payments havolasi ham shu orqali keladi
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('tab');
    if (TABS.some((x) => x.key === t)) setTab(t);
  }, []);

  const changeTab = (key) => {
    setTab(key);
    const qs = key === 'overview' ? '' : `?tab=${key}`;
    window.history.replaceState(null, '', window.location.pathname + qs);
  };

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const { totals, payoutTotals, config, unassigned } = data;
  // Tizimning sof daromadi: ustozli kurslardan tushgan ulush + ustozsiz
  // kurslardan soliqdan keyin qolgan mablag'
  const unassignedNet = Math.round(unassigned.gross * (1 - config.taxPct / 100));
  const platformTotal = totals.platform + unassignedNet;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl">Moliya</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            Platformadagi butun pul oqimi. Har bir sotuvdan {config.taxPct}%
            soliq ushlanadi; qolgan sof foyda organik sotuvda tizim {100 - config.organicInstructorPct}% /
            ustoz {config.organicInstructorPct}%, promo kod orqali esa tizim {100 - config.referralInstructorPct}% /
            ustoz {config.referralInstructorPct}% nisbatida taqsimlanadi.
          </p>
        </div>
        <div className="no-print flex gap-2">
          <button onClick={() => window.print()} className="btn-ghost">
            <Printer size={16} /> Chop etish
          </button>
          <button
            onClick={() => api.download('/admin/earnings/export').catch((e) => alert(e.message))}
            className="btn-outline"
          >
            <Download size={16} /> CSV
          </button>
        </div>
      </div>

      <p className="print-only mt-2 text-xs text-muted">
        Hisobot sanasi: {new Date().toLocaleDateString('uz-UZ')}
      </p>

      {/* Asosiy koʻrsatkichlar */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Jami aylanma"
          value={totals.gross + unassigned.gross}
          hint={`${totals.sales + unassigned.sales} ta sotuv`}
          icon={Receipt}
          color="bg-slate-100 text-slate-600"
        />
        <StatCard
          label="Ushlangan soliq"
          value={totals.tax + (unassigned.gross - unassignedNet)}
          hint={`${config.taxPct}% stavka`}
          icon={Landmark}
          color="bg-red-50 text-red-600"
        />
        <StatCard
          label="Tizim sof daromadi"
          value={platformTotal}
          hint="Soliq va ustoz ulushidan keyin"
          icon={Coins}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Ustozlarga qarz"
          value={payoutTotals.pending}
          hint={`${formatMoney(payoutTotals.earned)} dan ${formatMoney(payoutTotals.paid)} toʻlangan`}
          icon={Clock}
          color="bg-amber-50 text-amber-600"
        />
      </div>

      <div className="no-print mt-6 flex flex-wrap gap-2 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => changeTab(t.key)}
            className={`-mb-px border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors
              ${tab === t.key ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'overview' && (
          <Overview data={data} period={period} setPeriod={setPeriod} platformTotal={platformTotal} unassignedNet={unassignedNet} />
        )}
        {tab === 'payments' && <PaymentsTable />}
        {tab === 'instructors' && <InstructorsTable data={data} onChanged={load} />}
        {tab === 'payouts' && <PayoutsTab instructors={data.byInstructor} onChanged={load} />}
        {tab === 'settings' && <SettingsTab config={data.config} onSaved={load} />}
      </div>
    </div>
  );
}

// ---------- Umumiy ----------
function Overview({ data, period, setPeriod, platformTotal, unassignedNet }) {
  const { totals, bySource, series, config, unassigned } = data;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pul oqimi */}
        <div className="card p-5">
          <h2 className="text-lg">Pul oqimi (butun davr)</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-4 font-semibold">
              {/* Yuqoridagi "Jami aylanma" kartochkasi bilan bir xil raqam — nomi ham bir xil */}
              <dt>Aylanma (oʻquvchilar toʻlagani)</dt>
              <dd className="tabular-nums">{formatMoney(totals.gross + unassigned.gross)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 text-red-600">
              <dt>Soliq ({config.taxPct}%)</dt>
              <dd className="tabular-nums">− {formatMoney(totals.tax + (unassigned.gross - unassignedNet))}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-2 font-semibold">
              <dt>Sof foyda</dt>
              <dd className="tabular-nums">{formatMoney(totals.net + unassignedNet)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 text-amber-700">
              <dt>Ustozlarga tegishli</dt>
              <dd className="tabular-nums">{formatMoney(totals.instructor)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 font-semibold text-emerald-700">
              <dt>Tizimga qoladi</dt>
              <dd className="tabular-nums">{formatMoney(platformTotal)}</dd>
            </div>
          </dl>

          {unassigned.sales > 0 && (
            <div className="mt-4 flex gap-2.5 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                <b>{unassigned.sales} ta sotuv</b> ({formatMoney(unassigned.gross)}) ustoz
                biriktirilmagan kurslardan. Bunday sotuvdan hech kimga ulush ajratilmaydi —
                soliqdan keyingi mablag' toʻliq tizimga qoladi. Kurslarga ustoz biriktirsangiz,
                keyingi sotuvlar ustoz hisobiga ham yoziladi.
              </span>
            </div>
          )}
        </div>

        {/* Manba */}
        <div className="card p-5">
          <h2 className="text-lg">Ustoz ulushi manbasi</h2>
          <p className="mt-1 text-sm text-muted">
            Promo kod orqali sotuvda ustoz koʻproq oladi ({config.referralInstructorPct}%),
            tizim esa kamroq ({100 - config.referralInstructorPct}%)
          </p>
          <div className="mt-5">
            <SplitBar
              parts={[
                { label: `Organik (${bySource.organic.sales} sotuv)`, value: bySource.organic.instructor, cls: 'bg-indigo-500' },
                { label: `Promo kod (${bySource.referral.sales} sotuv)`, value: bySource.referral.instructor, cls: 'bg-emerald-500' },
              ]}
            />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 text-sm">
            <div>
              <div className="text-muted">Oʻrtacha chek</div>
              <div className="mt-0.5 font-semibold tabular-nums">{formatMoney(totals.avgCheck)}</div>
            </div>
            <div>
              <div className="text-muted">Ustozli sotuvlar</div>
              <div className="mt-0.5 font-semibold tabular-nums">{totals.sales}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grafik */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg">Aylanma dinamikasi</h2>
            <p className="mt-1 text-sm text-muted">Ustozli kurslardan tushgan toʻlovlar</p>
          </div>
          <div className="no-print"><PeriodTabs value={period} onChange={setPeriod} /></div>
        </div>
        <TimeBars
          data={series.points}
          granularity={series.granularity}
          color="var(--color-primary)"
          label="aylanma"
          caption={PERIOD_CAPTION[period]}
        />
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4 text-sm">
          <span className="text-muted">Tanlangan davr ({period}):</span>
          <span><b className="tabular-nums">{formatMoney(data.period.gross)}</b> aylanma</span>
          <span><b className="tabular-nums">{formatMoney(data.period.platform)}</b> tizimga</span>
          <span><b className="tabular-nums">{formatMoney(data.period.instructor)}</b> ustozlarga</span>
          <GrowthBadge value={data.period.growth.gross} />
        </div>
      </div>
    </div>
  );
}

// ---------- Ustozlar kesimi ----------
function InstructorsTable({ data, onChanged }) {
  const [payFor, setPayFor] = useState(null); // oʻtkazma qoʻshilayotgan ustoz

  if (data.byInstructor.length === 0) {
    return (
      <EmptyState
        title="Ustoz yoʻq"
        text="Odamlar boʻlimidan ustoz qoʻshing va ularga pulli kurs biriktiring."
        icon={Users}
      />
    );
  }

  return (
    <div>
      {payFor && (
        <PayoutForm
          instructor={payFor}
          onClose={() => setPayFor(null)}
          onSaved={() => { setPayFor(null); onChanged(); }}
        />
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line bg-slate-50 text-left text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Ustoz</th>
                <th className="px-4 py-3 text-right">Kurs</th>
                <th className="px-4 py-3 text-right">Sotuv</th>
                <th className="px-4 py-3 text-right">Aylanma</th>
                <th className="px-4 py-3 text-right">Ishlagan</th>
                <th className="px-4 py-3 text-right">Toʻlangan</th>
                <th className="px-4 py-3 text-right">Qoldiq</th>
                <th className="px-4 py-3 text-right no-print">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.byInstructor.map((i) => (
                <tr key={i.instructorId} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/earnings/${i.instructorId}`} className="font-medium hover:text-primary">
                      {i.fullName}
                    </Link>
                    <span className="block text-xs text-muted">{i.email}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{i.courses}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{i.sales}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-muted">{formatMoney(i.gross)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(i.instructor)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-indigo-600">{formatMoney(i.paid)}</td>
                  <td className={`px-4 py-3 text-right font-semibold tabular-nums ${i.pending > 0 ? 'text-amber-600' : 'text-muted'}`}>
                    {formatMoney(i.pending)}
                  </td>
                  <td className="px-4 py-3 text-right no-print">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setPayFor(i)}
                        disabled={i.pending <= 0}
                        className="btn-outline py-1.5 text-xs disabled:cursor-not-allowed disabled:opacity-40"
                        title={i.pending > 0 ? "Oʻtkazma qoʻshish" : "Toʻlanmagan qoldiq yoʻq"}
                      >
                        <Wallet size={14} /> Toʻlash
                      </button>
                      <Link href={`/admin/earnings/${i.instructorId}`} className="btn-ghost py-1.5 text-xs">
                        Tafsilot <ArrowRight size={14} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-line bg-slate-50 font-semibold">
              <tr>
                <td className="px-4 py-3">Jami</td>
                <td className="px-4 py-3" />
                <td className="px-4 py-3 text-right tabular-nums">{data.totals.sales}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(data.totals.gross)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(data.payoutTotals.earned)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(data.payoutTotals.paid)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatMoney(data.payoutTotals.pending)}</td>
                <td className="px-4 py-3 no-print" />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// Oʻtkazma qoʻshish formasi
function PayoutForm({ instructor, onClose, onSaved }) {
  const [amount, setAmount] = useState(String(instructor.pending > 0 ? instructor.pending : ''));
  const [method, setMethod] = useState('Karta');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const value = parseInt(amount, 10);
    if (!Number.isFinite(value) || value <= 0) return setError('Summani toʻgʻri kiriting');
    setSaving(true);
    try {
      await api.post('/admin/payouts', {
        instructorId: instructor.instructorId,
        amount: value,
        method: method.trim() || undefined,
        note: note.trim() || undefined,
        status: 'PAID',
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="card mb-4 p-5">
      <h2 className="text-lg">{instructor.fullName} — oʻtkazma qoʻshish</h2>
      <p className="mt-1 text-sm text-muted">
        Toʻlanmagan qoldiq: <b className="tabular-nums">{formatMoney(instructor.pending)}</b>
      </p>
      {error && <div className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <label className="label">Summa (soʻm)</label>
          <input
            type="number"
            className="input"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min={1}
            required
          />
        </div>
        <div>
          <label className="label">Usul</label>
          <input className="input" value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Karta / Bank / Naqd" />
        </div>
        <div>
          <label className="label">Izoh</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Masalan: iyul oyi uchun" />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Tasdiqlash
        </button>
        <button type="button" onClick={onClose} className="btn-ghost"><X size={16} /> Bekor qilish</button>
      </div>
    </form>
  );
}

// ---------- Oʻtkazmalar ----------
function PayoutsTab({ instructors, onChanged }) {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/payouts')
      .then((res) => { setPayouts(res.payouts); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (p) => {
    if (!confirm(`${formatMoney(p.amount)} oʻtkazmasini oʻchirasizmi? Ustozning qoldigʻi shunga oshadi.`)) return;
    try {
      await api.del(`/admin/payouts/${p.id}`);
      load();
      onChanged();
    } catch (err) { alert(err.message); }
  };

  const total = payouts.filter((p) => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg">Ustozlarga oʻtkazmalar</h2>
          <p className="mt-1 text-sm text-muted">
            Jami oʻtkazilgan: <b className="tabular-nums">{formatMoney(total)}</b>
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary no-print">
          <Plus size={16} /> Yangi oʻtkazma
        </button>
      </div>

      {showForm && (
        <ManualPayoutForm
          instructors={instructors}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); onChanged(); }}
        />
      )}

      <div className="mt-4">
        {error ? <ErrorState message={error} /> : loading ? <Spinner /> : payouts.length === 0 ? (
          <EmptyState
            title="Oʻtkazma yoʻq"
            text="Ustozlar yorligʻidan qoldiqni koʻrib, oʻtkazma qoʻshing."
            icon={Wallet}
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-slate-50 text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Sana</th>
                    <th className="px-4 py-3">Ustoz</th>
                    <th className="px-4 py-3 text-right">Summa</th>
                    <th className="px-4 py-3">Usul</th>
                    <th className="px-4 py-3">Izoh</th>
                    <th className="px-4 py-3">Kiritdi</th>
                    <th className="px-4 py-3">Holat</th>
                    <th className="px-4 py-3 text-right no-print">Amal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-muted">{formatDate(p.paidAt || p.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Link href={`/admin/earnings/${p.instructor.id}`} className="hover:text-primary">
                          {p.instructor.fullName}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(p.amount)}</td>
                      <td className="px-4 py-3 text-muted">{p.method || '—'}</td>
                      <td className="px-4 py-3 text-muted">{p.note || '—'}</td>
                      <td className="px-4 py-3 text-muted">{p.createdBy?.fullName || '—'}</td>
                      <td className="px-4 py-3">
                        {p.status === 'PAID' ? (
                          <span className="badge bg-emerald-50 text-emerald-700"><CheckCircle2 size={12} /> Oʻtkazilgan</span>
                        ) : (
                          <span className="badge bg-amber-50 text-amber-700"><Clock size={12} /> Kutilmoqda</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right no-print">
                        <button
                          onClick={() => remove(p)}
                          className="ml-auto grid h-8 w-8 place-items-center rounded-lg text-red-600 hover:bg-red-50"
                          title="Oʻchirish"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ManualPayoutForm({ instructors, onClose, onSaved }) {
  const [instructorId, setInstructorId] = useState(instructors[0]?.instructorId || '');
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('Karta');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selected = instructors.find((i) => i.instructorId === instructorId);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const value = parseInt(amount, 10);
    if (!instructorId) return setError('Ustozni tanlang');
    if (!Number.isFinite(value) || value <= 0) return setError('Summani toʻgʻri kiriting');
    setSaving(true);
    try {
      await api.post('/admin/payouts', {
        instructorId,
        amount: value,
        method: method.trim() || undefined,
        note: note.trim() || undefined,
        status: 'PAID',
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="card mt-4 p-5">
      {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 md:grid-cols-4">
        <div>
          <label className="label">Ustoz</label>
          <select className="input" value={instructorId} onChange={(e) => setInstructorId(e.target.value)}>
            {instructors.map((i) => (
              <option key={i.instructorId} value={i.instructorId}>{i.fullName}</option>
            ))}
          </select>
          {selected && (
            <p className="mt-1 text-xs text-muted">Qoldiq: {formatMoney(selected.pending)}</p>
          )}
        </div>
        <div>
          <label className="label">Summa (soʻm)</label>
          <input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} min={1} required />
        </div>
        <div>
          <label className="label">Usul</label>
          <input className="input" value={method} onChange={(e) => setMethod(e.target.value)} />
        </div>
        <div>
          <label className="label">Izoh</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Saqlash
        </button>
        <button type="button" onClick={onClose} className="btn-ghost"><X size={16} /> Bekor qilish</button>
      </div>
    </form>
  );
}

// ---------- Foiz sozlamalari ----------
function SettingsTab({ config, onSaved }) {
  const [form, setForm] = useState(config);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const save = async (e) => {
    e.preventDefault();
    setError(''); setMessage('');
    setSaving(true);
    try {
      const res = await api.put('/admin/payout-config', {
        taxPct: Number(form.taxPct),
        organicInstructorPct: Number(form.organicInstructorPct),
        referralInstructorPct: Number(form.referralInstructorPct),
        maxDiscountPct: Number(form.maxDiscountPct),
      });
      setForm(res.config);
      setMessage(res.message);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // Misol: 500 000 soʻmlik kurs boʻyicha taqsimot
  const sample = 500000;
  const tax = Math.round((sample * form.taxPct) / 100);
  const net = sample - tax;
  const orgIns = Math.round((net * form.organicInstructorPct) / 100);
  const refIns = Math.round((net * form.referralInstructorPct) / 100);

  const fields = [
    { key: 'taxPct', label: 'Soliq (%)', hint: 'Har bir sotuvdan ushlab qolinadi' },
    { key: 'organicInstructorPct', label: 'Organik sotuvda ustoz ulushi (%)', hint: 'Sof foydadan' },
    { key: 'referralInstructorPct', label: 'Promo kod orqali ustoz ulushi (%)', hint: 'Sof foydadan' },
    { key: 'maxDiscountPct', label: 'Eng yuqori chegirma (%)', hint: 'Ustoz shu chegaradan oshira olmaydi' },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={save} className="card p-5">
        <h2 className="text-lg"><Settings2 size={18} className="mr-1.5 inline" /> Taqsimot foizlari</h2>
        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Oʻzgartirish faqat <b>keyingi</b> sotuvlarga qoʻllanadi. Mavjud daromad
          yozuvlarida foizlar saqlangan va qayta hisoblanmaydi — oʻtgan oylardagi
          maosh oʻzgarmaydi.
        </div>
        {error && <div className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        {message && <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">{message}</div>}

        <div className="mt-4 space-y-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input
                type="number"
                className="input"
                min={0}
                max={100}
                value={form[f.key]}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              />
              <p className="mt-1 text-xs text-muted">{f.hint}</p>
            </div>
          ))}
        </div>
        <button type="submit" disabled={saving} className="btn-primary mt-5">
          {saving && <Loader2 size={16} className="animate-spin" />} Saqlash
        </button>
      </form>

      {/* Jonli misol */}
      <div className="card p-5">
        <h2 className="text-lg">Misol: {formatMoney(sample)} lik kurs</h2>
        <p className="mt-1 text-sm text-muted">Yuqoridagi foizlar bilan qanday taqsimlanadi</p>

        <div className="mt-4 space-y-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-sm font-semibold">Organik sotuv</div>
            <dl className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Soliq ({form.taxPct}%)</dt><dd className="tabular-nums text-red-600">− {formatMoney(tax)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Ustozga ({form.organicInstructorPct}%)</dt><dd className="tabular-nums font-semibold">{formatMoney(orgIns)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Tizimga</dt><dd className="tabular-nums font-semibold text-emerald-700">{formatMoney(net - orgIns)}</dd></div>
            </dl>
          </div>

          <div className="rounded-xl bg-emerald-50/60 p-4">
            <div className="text-sm font-semibold">Promo kod orqali</div>
            <dl className="mt-2 space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Soliq ({form.taxPct}%)</dt><dd className="tabular-nums text-red-600">− {formatMoney(tax)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Ustozga ({form.referralInstructorPct}%)</dt><dd className="tabular-nums font-semibold">{formatMoney(refIns)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Tizimga</dt><dd className="tabular-nums font-semibold text-emerald-700">{formatMoney(net - refIns)}</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
