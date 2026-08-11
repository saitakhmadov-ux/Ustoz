'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Wallet, Coins, Clock, CheckCircle2, Receipt, Ticket,
  Download, Printer, Plus, Loader2, X, Copy, Check, Trash2, Power, Link2, BadgePercent,
  CalendarClock, CalendarX, Hash,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatMoney } from '@/lib/constants';
import { Spinner, ErrorState, EmptyState, Pagination } from '@/components/ui';
import {
  StatCard, TimeBars, SplitBar, SplitBreakdown, PeriodTabs, GrowthBadge, PERIOD_CAPTION,
} from '@/components/admin/earnings-ui';

const TABS = [
  { key: 'overview', label: 'Umumiy' },
  { key: 'transactions', label: 'Tranzaksiyalar' },
  { key: 'payouts', label: "To'lovlar" },
  { key: 'promo', label: 'Promo kodlar' },
];

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString('uz-UZ') : '—';
}

// Ustozning shaxsiy maosh paneli. Bosh admin ham ochishi mumkin —
// u holda barcha kurslar bo'yicha jamlangan ko'rinish chiqadi.
export default function InstructorEarnings() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('overview');
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/teaching/earnings?period=${period}`)
      .then((res) => { setData(res); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [period]);

  useEffect(() => { load(); }, [load]);

  if (loading && !data) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const { totals, balance, config } = data;

  return (
    <div>
      {/* Sarlavha va amallar */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl">{isAdmin ? 'Maosh hisoboti' : 'Maoshim'}</h1>
          <p className="mt-1 text-sm text-muted">
            Pulli kurslardan tushgan daromadingiz. Har bir sotuvdan {config.taxPct}% soliq
            ushlanadi, qolgan sof foydadan sizga organik sotuvda {config.organicInstructorPct}%,
            promo kodingiz orqali kelgan sotuvda {config.referralInstructorPct}% ajratiladi.
          </p>
        </div>
        <div className="no-print flex gap-2">
          <button onClick={() => window.print()} className="btn-ghost">
            <Printer size={16} /> Chop etish
          </button>
          <button
            onClick={() => api.download('/admin/teaching/earnings/export').catch((e) => alert(e.message))}
            className="btn-outline"
          >
            <Download size={16} /> CSV
          </button>
        </div>
      </div>

      {/* Chop etilganda sana ko'rinsin */}
      <p className="print-only mt-2 text-xs text-muted">
        Hisobot sanasi: {new Date().toLocaleDateString('uz-UZ')}
      </p>

      {/* Asosiy ko'rsatkichlar — barcha tablarda ko'rinadi */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Jami ishlagan daromad"
          value={totals.instructor}
          hint={`${totals.sales} ta sotuvdan`}
          icon={Coins}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Kutilayotgan (to'lanmagan)"
          value={balance.pending}
          hint="Hisobingizga hali o'tmagan"
          icon={Clock}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Hisobingizga o'tgan"
          value={balance.paid}
          hint="Tasdiqlangan o'tkazmalar"
          icon={CheckCircle2}
          color="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Shu oy"
          value={data.thisMonth.instructor}
          hint={`${data.thisMonth.sales} ta sotuv`}
          icon={Wallet}
          color="bg-slate-100 text-slate-600"
          growth={data.thisMonth.growth}
        />
      </div>

      {/* Tablar */}
      <div className="no-print mt-6 flex flex-wrap gap-2 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors
              ${tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-ink'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'overview' && (
          <Overview data={data} period={period} setPeriod={setPeriod} />
        )}
        {tab === 'transactions' && <Transactions courses={data.byCourse} />}
        {tab === 'payouts' && <Payouts />}
        {tab === 'promo' && <PromoCodes courses={data.byCourse} />}
      </div>
    </div>
  );
}

// ---------- Umumiy ----------
function Overview({ data, period, setPeriod }) {
  const { totals, bySource, byCourse, series, config } = data;

  return (
    <div className="space-y-6">
      {/* Pul qayerga ketdi — shaffof hisob */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="text-lg">Pul qanday taqsimlangan</h2>
          <p className="mt-1 text-sm text-muted">Butun davr bo'yicha jami</p>
          <div className="mt-4">
            <SplitBreakdown
              gross={totals.gross}
              tax={totals.tax}
              taxPct={config.taxPct}
              instructor={totals.instructor}
              platform={totals.platform}
            />
          </div>
        </div>

        <div className="card p-5">
          <h2 className="text-lg">Daromad manbasi</h2>
          <p className="mt-1 text-sm text-muted">
            Promo kod orqali kelgan sotuvda ulushingiz {config.referralInstructorPct}%
            (organikda {config.organicInstructorPct}%)
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
              <div className="text-muted">O'rtacha chek</div>
              <div className="mt-0.5 font-semibold tabular-nums">{formatMoney(totals.avgCheck)}</div>
            </div>
            <div>
              <div className="text-muted">Jami sotuvlar</div>
              <div className="mt-0.5 font-semibold tabular-nums">{totals.sales}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Maosh dinamikasi */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg">Maosh dinamikasi</h2>
            <p className="mt-1 text-sm text-muted">Ishlab topgan summangiz</p>
          </div>
          <div className="no-print"><PeriodTabs value={period} onChange={setPeriod} /></div>
        </div>
        <TimeBars
          data={series.points}
          granularity={series.granularity}
          color="var(--color-primary)"
          label="sizning ulushingiz"
          caption={PERIOD_CAPTION[period]}
        />
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4 text-sm">
          <span className="text-muted">Tanlangan davr ({period}):</span>
          <span><b className="tabular-nums">{formatMoney(data.period.instructor)}</b> daromad</span>
          <span><b className="tabular-nums">{data.period.sales}</b> sotuv</span>
          <GrowthBadge value={data.period.growth.instructor} />
        </div>
      </div>

      {/* Kurslar kesimi */}
      <div className="card overflow-hidden">
        <div className="p-5 pb-3">
          <h2 className="text-lg">Kurslar bo'yicha</h2>
          <p className="mt-1 text-sm text-muted">Qaysi kurs qancha daromad keltirgan</p>
        </div>
        {byCourse.length === 0 ? (
          <div className="p-5 pt-0">
            <EmptyState
              title="Pulli kurs yo'q"
              text="Sizga pulli kurs biriktirilgach, daromad shu yerda ko'rinadi."
              icon={Coins}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y border-line bg-slate-50 text-left text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Kurs</th>
                  <th className="px-4 py-3 text-right">Sotuv</th>
                  <th className="px-4 py-3 text-right">Aylanma</th>
                  <th className="px-4 py-3 text-right">Soliq</th>
                  <th className="px-4 py-3 text-right">Organik</th>
                  <th className="px-4 py-3 text-right">Promo kod</th>
                  <th className="px-4 py-3 text-right">Sizning ulush</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {byCourse.map((c) => (
                  <tr key={c.courseId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{c.title}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{c.sales}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{formatMoney(c.gross)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{formatMoney(c.tax)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{formatMoney(c.organicInstructor)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted">{formatMoney(c.referralInstructor)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(c.instructor)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-line bg-slate-50 font-semibold">
                <tr>
                  <td className="px-4 py-3">Jami</td>
                  <td className="px-4 py-3 text-right tabular-nums">{totals.sales}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(totals.gross)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(totals.tax)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(bySource.organic.instructor)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(bySource.referral.instructor)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatMoney(totals.instructor)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- Tranzaksiyalar ----------
function Transactions({ courses }) {
  const [rows, setRows] = useState([]);
  const [sums, setSums] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [courseId, setCourseId] = useState('');
  const [source, setSource] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = useCallback(() => {
    const p = new URLSearchParams({ page: String(page), limit: '20' });
    if (courseId) p.set('courseId', courseId);
    if (source) p.set('source', source);
    if (from) p.set('from', from);
    if (to) p.set('to', to);
    return p;
  }, [page, courseId, source, from, to]);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/teaching/earnings/transactions?${params()}`)
      .then((res) => {
        setRows(res.transactions);
        setSums(res.filteredTotals);
        setPagination(res.pagination);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [params]);

  const hasFilters = courseId || source || from || to;

  return (
    <div>
      <div className="no-print flex flex-wrap items-end gap-3">
        {courses.length > 1 && (
          <select className="input max-w-[220px]" value={courseId} onChange={(e) => { setCourseId(e.target.value); setPage(1); }}>
            <option value="">Barcha kurslar</option>
            {courses.map((c) => <option key={c.courseId} value={c.courseId}>{c.title}</option>)}
          </select>
        )}
        <select className="input max-w-[170px]" value={source} onChange={(e) => { setSource(e.target.value); setPage(1); }}>
          <option value="">Barcha manbalar</option>
          <option value="ORGANIC">Organik</option>
          <option value="REFERRAL">Promo kod</option>
        </select>
        <div>
          <label className="label">Dan</label>
          <input type="date" className="input" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </div>
        <div>
          <label className="label">Gacha</label>
          <input type="date" className="input" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </div>
        {hasFilters && (
          <button
            type="button"
            className="btn-ghost"
            onClick={() => { setCourseId(''); setSource(''); setFrom(''); setTo(''); setPage(1); }}
          >
            <X size={16} /> Tozalash
          </button>
        )}
        <button
          type="button"
          className="btn-outline ml-auto"
          onClick={() => api.download(`/admin/teaching/earnings/export?${params()}`).catch((e) => alert(e.message))}
        >
          <Download size={16} /> Tanlanganini CSV
        </button>
      </div>

      {/* Filtrga mos yig'indi */}
      {sums && (
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {[
            { label: 'Sotuvlar', value: sums.sales, money: false },
            { label: 'Aylanma', value: sums.gross },
            { label: 'Soliq', value: sums.tax },
            { label: 'Sizning ulush', value: sums.instructor, strong: true },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-slate-50 px-4 py-3">
              <div className="text-xs text-muted">{s.label}</div>
              <div className={`mt-0.5 tabular-nums ${s.strong ? 'font-bold text-emerald-700' : 'font-semibold'}`}>
                {s.money === false ? s.value : formatMoney(s.value)}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        {error ? <ErrorState message={error} /> : loading ? <Spinner /> : rows.length === 0 ? (
          <EmptyState
            title="Tranzaksiya yo'q"
            text={hasFilters ? 'Filtrni o\'zgartirib ko\'ring.' : 'Pulli kursingiz sotilgach, har bir sotuv shu yerda ko\'rinadi.'}
            icon={Receipt}
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-slate-50 text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Sana</th>
                    <th className="px-4 py-3">Kurs</th>
                    <th className="px-4 py-3">O'quvchi</th>
                    <th className="px-4 py-3 text-right">Asl narx</th>
                    <th className="px-4 py-3 text-right">To'langan</th>
                    <th className="px-4 py-3 text-right">Soliq</th>
                    <th className="px-4 py-3">Manba</th>
                    <th className="px-4 py-3 text-right">Sizning ulush</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-muted">{formatDate(t.createdAt)}</td>
                      <td className="px-4 py-3">{t.course?.title}</td>
                      <td className="px-4 py-3">
                        <span className="block">{t.payment?.user?.fullName}</span>
                        <span className="block text-xs text-muted">{t.payment?.user?.email}</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">
                        {formatMoney(t.payment?.originalAmount || t.grossAmount)}
                        {t.payment?.discountPct > 0 && (
                          <span className="ml-1 text-xs text-emerald-600">−{t.payment.discountPct}%</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatMoney(t.grossAmount)}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">
                        {formatMoney(t.taxAmount)}
                        <span className="ml-1 text-xs">({t.taxPct}%)</span>
                      </td>
                      <td className="px-4 py-3">
                        {t.source === 'REFERRAL' ? (
                          <span className="badge bg-emerald-50 text-emerald-700">
                            <Ticket size={12} /> {t.promoCode?.code || 'Promo'}
                          </span>
                        ) : (
                          <span className="badge bg-slate-100 text-slate-600">Organik</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {formatMoney(t.instructorAmount)}
                        <span className="ml-1 text-xs font-normal text-muted">({t.sharePct}%)</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && (
              <Pagination
                page={pagination.page}
                pages={pagination.pages}
                total={pagination.total}
                onChange={setPage}
                label="tranzaksiya"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------- To'lovlar (o'tkazmalar) ----------
function Payouts() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/teaching/payouts')
      .then((res) => { setData(res); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <ErrorState message={error} />;
  if (loading) return <Spinner />;
  if (!data) return null;

  return (
    <div>
      <div className="card p-5">
        <h2 className="text-lg">Hisob-kitob holati</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <div className="text-sm text-muted">Jami ishlangan</div>
            <div className="mt-0.5 font-display text-xl font-bold tabular-nums">{formatMoney(data.balance.earned)}</div>
          </div>
          <div>
            <div className="text-sm text-muted">Hisobingizga o'tgan</div>
            <div className="mt-0.5 font-display text-xl font-bold tabular-nums text-indigo-600">{formatMoney(data.balance.paid)}</div>
          </div>
          <div>
            <div className="text-sm text-muted">Kutilayotgan</div>
            <div className="mt-0.5 font-display text-xl font-bold tabular-nums text-amber-600">{formatMoney(data.balance.pending)}</div>
          </div>
        </div>
      </div>

      <h2 className="mt-6 text-lg">Hisobingizga o'tgan summalar</h2>
      <div className="mt-3">
        {data.payouts.length === 0 ? (
          <EmptyState
            title="Hali o'tkazma yo'q"
            text="Bosh admin o'tkazmani rasmiylashtirgach, u shu yerda ko'rinadi."
            icon={Wallet}
          />
        ) : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-line bg-slate-50 text-left text-xs uppercase text-muted">
                  <tr>
                    <th className="px-4 py-3">Sana</th>
                    <th className="px-4 py-3 text-right">Summa</th>
                    <th className="px-4 py-3">Usul</th>
                    <th className="px-4 py-3">Davr</th>
                    <th className="px-4 py-3">Izoh</th>
                    <th className="px-4 py-3">Holat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {data.payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-muted">{formatDate(p.paidAt || p.createdAt)}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(p.amount)}</td>
                      <td className="px-4 py-3 text-muted">{p.method || '—'}</td>
                      <td className="px-4 py-3 text-muted">
                        {p.periodFrom ? `${formatDate(p.periodFrom)} — ${formatDate(p.periodTo)}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted">{p.note || '—'}</td>
                      <td className="px-4 py-3">
                        {p.status === 'PAID' ? (
                          <span className="badge bg-emerald-50 text-emerald-700"><CheckCircle2 size={12} /> O'tkazilgan</span>
                        ) : (
                          <span className="badge bg-amber-50 text-amber-700"><Clock size={12} /> Kutilmoqda</span>
                        )}
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

// ---------- Promo kodlar ----------
function PromoCodes({ courses }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '', discountPct: 10, courseId: '', expiresAt: '', maxUses: '',
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [copied, setCopied] = useState('');
  // Umumiy kodlar uchun havola qaysi kursga yasalishi
  const [linkCourse, setLinkCourse] = useState({});

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/teaching/promo-codes')
      .then((res) => { setData(res); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openForm = async () => {
    setShowForm(true);
    setFormError('');
    try {
      const res = await api.get('/admin/teaching/promo-codes/suggest');
      setForm((f) => ({ ...f, code: res.code }));
    } catch { /* taklif olinmasa foydalanuvchi o'zi kiritadi */ }
  };

  const create = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await api.post('/admin/teaching/promo-codes', {
        code: form.code.trim().toUpperCase(),
        discountPct: Number(form.discountPct),
        courseId: form.courseId || null,
        // Bo'sh qoldirilsa — muddatsiz / cheksiz
        expiresAt: form.expiresAt || null,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
      });
      setShowForm(false);
      setForm({ code: '', discountPct: 10, courseId: '', expiresAt: '', maxUses: '' });
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (p) => {
    try {
      await api.patch(`/admin/teaching/promo-codes/${p.id}`, { active: !p.active });
      load();
    } catch (err) { alert(err.message); }
  };

  const remove = async (p) => {
    if (!confirm(`"${p.code}" kodini o'chirasizmi? U orqali yozilgan daromad tarixi saqlanadi.`)) return;
    try {
      await api.del(`/admin/teaching/promo-codes/${p.id}`);
      load();
    } catch (err) { alert(err.message); }
  };

  const copy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(''), 1800);
    } catch { alert('Nusxalab bo\'lmadi'); }
  };

  // Kod uchun ulashiladigan havola
  const shareLink = (p) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const slug = p.course ? p.course.slug : (linkCourse[p.id] || (courses[0] && courses[0].slug));
    if (!slug) return null;
    return `${origin}/courses/${slug}?promo=${p.code}`;
  };

  if (error) return <ErrorState message={error} />;
  if (loading) return <Spinner />;
  if (!data) return null;

  const paidCourses = courses.filter((c) => c.slug);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg">Promo kodlaringiz</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Kod orqali kelgan o'quvchidan sof foydaning <b>{data.referralPct}%</b> i sizga
            o'tadi (oddiy sotuvda esa {data.organicPct}%). Chegirma {data.maxDiscountPct}% gacha —
            chegirma o'quvchini kodni ishlatishga undaydi, lekin sotuv summasini
            kamaytirgani uchun ulushingiz ham shunga mos kamayadi. Har bir kod faqat
            sizning kursingizda va bitta o'quvchida bir martagina ishlaydi.
          </p>
        </div>
        <button onClick={openForm} className="btn-primary no-print">
          <Plus size={16} /> Yangi kod
        </button>
      </div>

      {showForm && (
        <form onSubmit={create} className="card mt-4 p-5">
          {formError && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{formError}</div>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="label">Kod</label>
              <input
                className="input font-mono uppercase"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="ALISHER10"
                maxLength={24}
                required
              />
              <p className="mt-1 text-xs text-muted">Lotin harflari, raqam va chiziqcha</p>
            </div>
            <div>
              <label className="label">Chegirma (%)</label>
              <input
                type="number"
                className="input"
                min={0}
                max={data.maxDiscountPct}
                value={form.discountPct}
                onChange={(e) => setForm({ ...form, discountPct: e.target.value })}
              />
              <p className="mt-1 text-xs text-muted">0 dan {data.maxDiscountPct}% gacha</p>
            </div>
            <div>
              <label className="label">Kurs</label>
              <select
                className="input"
                value={form.courseId}
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
              >
                <option value="">Barcha kurslarim</option>
                {paidCourses.map((c) => (
                  <option key={c.courseId} value={c.courseId}>{c.title}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted">Kod faqat sizning kursingizda ishlaydi</p>
            </div>
          </div>

          {/* Ixtiyoriy cheklovlar — bo'sh qoldirilsa kod muddatsiz va cheksiz */}
          <div className="mt-4 grid gap-4 border-t border-line pt-4 md:grid-cols-2">
            <div>
              <label className="label">Amal muddati</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="input"
                  min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
                {form.expiresAt && (
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, expiresAt: '' })}
                    className="btn-ghost shrink-0"
                    title="Muddatni olib tashlash"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <p className="mt-1 text-xs text-muted">
                {form.expiresAt
                  ? 'Shu kunning oxirigacha amal qiladi'
                  : "Bo'sh — kod muddatsiz ishlaydi"}
              </p>
            </div>
            <div>
              <label className="label">Foydalanish limiti</label>
              <input
                type="number"
                className="input"
                min={1}
                value={form.maxUses}
                onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                placeholder="Masalan: 50"
              />
              <p className="mt-1 text-xs text-muted">
                {form.maxUses
                  ? `Birinchi ${form.maxUses} ta xariddan keyin kod to'xtaydi`
                  : "Bo'sh — cheksiz. Har o'quvchi kodni baribir bir marta ishlatadi"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <Loader2 size={16} className="animate-spin" />} Yaratish
            </button>
            <button type="button" onClick={() => { setShowForm(false); setFormError(''); }} className="btn-ghost">
              <X size={16} /> Bekor qilish
            </button>
          </div>
        </form>
      )}

      <div className="mt-5 space-y-4">
        {data.promoCodes.length === 0 ? (
          <EmptyState
            title="Hali kod yo'q"
            text="Promo kod yarating va uni ijtimoiy tarmoqlarda ulashing — kod orqali kelgan har bir o'quvchidan ko'proq ulush olasiz."
            icon={Ticket}
          />
        ) : data.promoCodes.map((p) => {
          const link = shareLink(p);
          return (
            <div key={p.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded-lg bg-slate-100 px-2.5 py-1 font-mono text-base font-bold tracking-wide">
                      {p.code}
                    </code>
                    {p.discountPct > 0 && (
                      <span className="badge bg-emerald-50 text-emerald-700">
                        <BadgePercent size={12} /> −{p.discountPct}%
                      </span>
                    )}
                    {/* Holat: nofaol / muddati tugagan / limit tugagan / ishlayapti */}
                    {!p.active ? (
                      <span className="badge bg-slate-100 text-slate-500">O'chirilgan</span>
                    ) : p.expired ? (
                      <span className="badge bg-red-50 text-red-700">
                        <CalendarX size={12} /> Muddati tugagan
                      </span>
                    ) : p.remaining === 0 ? (
                      <span className="badge bg-amber-50 text-amber-700">
                        <Hash size={12} /> Limit tugagan
                      </span>
                    ) : (
                      <span className="badge bg-indigo-50 text-indigo-700">Faol</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {p.course ? `Faqat: ${p.course.title}` : 'Barcha kurslaringiz uchun'}
                    {' · '}Yaratilgan: {formatDate(p.createdAt)}
                  </p>
                  {/* Cheklovlar — o'rnatilmagani "cheksiz" deb ko'rsatiladi */}
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock size={12} />
                      {p.expiresAt
                        ? `Muddat: ${formatDate(p.expiresAt)}${p.expired ? ' (tugagan)' : ''}`
                        : 'Muddatsiz'}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Hash size={12} />
                      {p.maxUses
                        ? `Limit: ${p.uses}/${p.maxUses} ishlatilgan`
                        : 'Limitsiz'}
                    </span>
                    <span>Har o'quvchi — 1 marta</span>
                  </p>
                </div>
                <div className="no-print flex gap-1.5">
                  <button
                    onClick={() => copy(p.code, `code-${p.id}`)}
                    className="btn-ghost"
                    title="Kodni nusxalash"
                  >
                    {copied === `code-${p.id}` ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                    Kod
                  </button>
                  <button onClick={() => toggle(p)} className="btn-ghost" title={p.active ? "O'chirish" : 'Yoqish'}>
                    <Power size={16} /> {p.active ? "O'chirish" : 'Yoqish'}
                  </button>
                  <button
                    onClick={() => remove(p)}
                    className="grid h-9 w-9 place-items-center rounded-lg text-red-600 hover:bg-red-50"
                    title="Butunlay o'chirish"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Natijalar */}
              <div className="mt-4 grid gap-4 border-t border-line pt-4 sm:grid-cols-3">
                <div>
                  <div className="text-xs text-muted">Nechta sotuv keltirgan</div>
                  <div className="mt-0.5 font-semibold tabular-nums">{p.uses}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">Aylanma</div>
                  <div className="mt-0.5 font-semibold tabular-nums">{formatMoney(p.revenue)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">Sizga tushgani</div>
                  <div className="mt-0.5 font-semibold tabular-nums text-emerald-700">{formatMoney(p.earned)}</div>
                </div>
              </div>

              {/* Ulashish havolasi */}
              {paidCourses.length > 0 && (
                <div className="no-print mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3">
                  <Link2 size={16} className="text-muted" />
                  {!p.course && paidCourses.length > 1 && (
                    <select
                      className="input max-w-[220px] py-1.5 text-sm"
                      value={linkCourse[p.id] || paidCourses[0].slug}
                      onChange={(e) => setLinkCourse({ ...linkCourse, [p.id]: e.target.value })}
                    >
                      {paidCourses.map((c) => (
                        <option key={c.courseId} value={c.slug}>{c.title}</option>
                      ))}
                    </select>
                  )}
                  <code className="min-w-0 flex-1 truncate text-xs text-muted">{link || '—'}</code>
                  {link && (
                    <button onClick={() => copy(link, `link-${p.id}`)} className="btn-outline py-1.5 text-sm">
                      {copied === `link-${p.id}` ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
                      Havolani nusxalash
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
