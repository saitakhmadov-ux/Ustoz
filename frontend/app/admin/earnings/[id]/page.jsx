'use client';

// Bosh admin uchun bitta ustozning maosh tafsiloti.
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Coins, Clock, CheckCircle2, Wallet, Receipt, Ticket,
  Download, Printer, Loader2, X, Trash2, BadgePercent,
} from 'lucide-react';
import { api } from '@/lib/api';
import { formatMoney } from '@/lib/constants';
import { Spinner, ErrorState, EmptyState } from '@/components/ui';
import { StatCard, TimeBars, SplitBar } from '@/components/admin/earnings-ui';

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('uz-UZ') : '—';
}

export default function InstructorEarningsDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/earnings/instructors/${id}`)
      .then((res) => { setData(res); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const removePayout = async (p) => {
    if (!confirm(`${formatMoney(p.amount)} oʻtkazmasini oʻchirasizmi?`)) return;
    try {
      await api.del(`/admin/payouts/${p.id}`);
      load();
    } catch (err) { alert(err.message); }
  };

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const { instructor, totals, balance, bySource, monthly, earnings, payouts, promoCodes } = data;

  return (
    <div>
      <Link href="/admin/earnings" className="no-print inline-flex items-center gap-2 text-sm text-muted hover:text-primary">
        <ArrowLeft size={16} /> Maosh hisoboti
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-lg font-bold text-on-primary">
            {instructor.fullName?.charAt(0)?.toUpperCase()}
          </span>
          <div>
            <h1 className="text-2xl">{instructor.fullName}</h1>
            <p className="text-sm text-muted">{instructor.email}</p>
            <p className="mt-1 text-xs text-muted">
              {instructor.taughtCourses.length} ta kurs biriktirilgan
            </p>
          </div>
        </div>
        <div className="no-print flex gap-2">
          <button onClick={() => window.print()} className="btn-ghost">
            <Printer size={16} /> Chop etish
          </button>
          <button
            onClick={() => api.download(`/admin/earnings/export?instructorId=${id}`).catch((e) => alert(e.message))}
            className="btn-outline"
          >
            <Download size={16} /> CSV
          </button>
          <button onClick={() => setShowForm((v) => !v)} className="btn-primary">
            <Wallet size={16} /> Oʻtkazma qoʻshish
          </button>
        </div>
      </div>

      {showForm && (
        <PayoutForm
          instructorId={id}
          pending={balance.pending}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load(); }}
        />
      )}

      {/* Koʻrsatkichlar */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jami ishlagan" value={totals.instructor} hint={`${totals.sales} ta sotuv`} icon={Coins} color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Toʻlangan" value={balance.paid} hint="Hisobiga oʻtgan" icon={CheckCircle2} color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Qoldiq" value={balance.pending} hint="Hali toʻlanmagan" icon={Clock} color="bg-amber-50 text-amber-600" />
        <StatCard label="Keltirgan aylanma" value={totals.gross} hint={`Soliq: ${formatMoney(totals.tax)}`} icon={Receipt} color="bg-slate-100 text-slate-600" />
      </div>

      {/* Manba va grafik */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-lg">Daromad manbasi</h2>
          <div className="mt-5">
            <SplitBar
              parts={[
                { label: `Organik (${bySource.organic.sales})`, value: bySource.organic.instructor, cls: 'bg-indigo-500' },
                { label: `Promo kod (${bySource.referral.sales})`, value: bySource.referral.instructor, cls: 'bg-emerald-500' },
              ]}
            />
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <h3 className="text-sm font-semibold">Promo kodlari</h3>
            {promoCodes.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Kod yaratmagan</p>
            ) : (
              <ul className="mt-2 space-y-1.5 text-sm">
                {promoCodes.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-2">
                    <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold">{p.code}</code>
                    {p.discountPct > 0 && (
                      <span className="badge bg-emerald-50 text-emerald-700"><BadgePercent size={11} /> −{p.discountPct}%</span>
                    )}
                    {!p.active && <span className="badge bg-slate-100 text-muted">Oʻchirilgan</span>}
                    <span className="text-xs text-muted">
                      {p.course ? p.course.title : 'Barcha kurslari'} · {p._count.earnings} sotuv
                      {' · '}
                      {p.expiresAt ? `muddat ${formatDate(p.expiresAt)}` : 'muddatsiz'}
                      {' · '}
                      {p.maxUses ? `limit ${p.maxUses}` : 'limitsiz'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg">Oylar boʻyicha maosh</h2>
          <TimeBars
            data={monthly.map((m) => ({ key: m.month, value: m.instructor }))}
            granularity="month"
            label="ustoz ulushi"
            caption="Oxirgi 12 oy"
          />
        </div>
      </div>

      {/* Oʻtkazmalar */}
      <h2 className="mt-8 text-lg">Hisobiga oʻtkazmalar</h2>
      <div className="mt-3">
        {payouts.length === 0 ? (
          <EmptyState title="Oʻtkazma yoʻq" text="Hali bu ustozga toʻlov rasmiylashtirilmagan." icon={Wallet} />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-slate-50 text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Sana</th>
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
                          onClick={() => removePayout(p)}
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

      {/* Tranzaksiyalar */}
      <h2 className="mt-8 text-lg">Sotuvlar</h2>
      <p className="mt-1 text-sm text-muted">Oxirgi 100 ta yozuv · toʻliq roʻyxat uchun CSV eksportdan foydalaning</p>
      <div className="mt-3">
        {earnings.length === 0 ? (
          <EmptyState title="Sotuv yoʻq" text="Bu ustozning kurslari hali sotilmagan." icon={Receipt} />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-slate-50 text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Sana</th>
                    <th className="px-4 py-3">Kurs</th>
                    <th className="px-4 py-3">Oʻquvchi</th>
                    <th className="px-4 py-3 text-right">Toʻlangan</th>
                    <th className="px-4 py-3 text-right">Soliq</th>
                    <th className="px-4 py-3">Manba</th>
                    <th className="px-4 py-3 text-right">Ustozga</th>
                    <th className="px-4 py-3 text-right">Tizimga</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {earnings.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-muted">{formatDate(e.createdAt)}</td>
                      <td className="px-4 py-3">{e.course?.title}</td>
                      <td className="px-4 py-3">{e.payment?.user?.fullName}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {formatMoney(e.grossAmount)}
                        {e.payment?.discountPct > 0 && (
                          <span className="ml-1 text-xs text-emerald-600">−{e.payment.discountPct}%</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">{formatMoney(e.taxAmount)}</td>
                      <td className="px-4 py-3">
                        {e.source === 'REFERRAL' ? (
                          <span className="badge bg-emerald-50 text-emerald-700"><Ticket size={12} /> {e.promoCode?.code || 'Promo'}</span>
                        ) : (
                          <span className="badge bg-slate-100 text-slate-600">Organik</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatMoney(e.instructorAmount)}
                        <span className="ml-1 text-xs font-normal text-muted">({e.sharePct}%)</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">{formatMoney(e.platformAmount)}</td>
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

function PayoutForm({ instructorId, pending, onClose, onSaved }) {
  const [amount, setAmount] = useState(String(pending > 0 ? pending : ''));
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
      <h2 className="text-lg">Oʻtkazma qoʻshish</h2>
      <p className="mt-1 text-sm text-muted">
        Toʻlanmagan qoldiq: <b className="tabular-nums">{formatMoney(pending)}</b>
      </p>
      {error && <div className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <label className="label">Summa (soʻm)</label>
          <input type="number" className="input" value={amount} onChange={(e) => setAmount(e.target.value)} min={1} required />
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
