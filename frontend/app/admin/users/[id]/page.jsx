'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Shield, User, GraduationCap, Wallet, Award, MessageSquare,
  BookOpen, Plus, Trash2, CalendarPlus, Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatPrice } from '@/lib/constants';
import { StarRating } from '@/components/Stars';
import { Spinner, ErrorState } from '@/components/ui';

const ROLES = {
  ADMIN: { label: 'Bosh admin', cls: 'bg-indigo-50 text-indigo-700', Icon: Shield },
  INSTRUCTOR: { label: 'Ustoz', cls: 'bg-indigo-50 text-indigo-700', Icon: GraduationCap },
  USER: { label: 'Foydalanuvchi', cls: 'bg-slate-100 text-slate-600', Icon: User },
};

const PAY_STATUS = {
  PAID: { label: "Toʻlangan", cls: 'bg-emerald-50 text-emerald-700' },
  PENDING: { label: 'Kutilmoqda', cls: 'bg-amber-50 text-amber-700' },
  FAILED: { label: 'Muvaffaqiyatsiz', cls: 'bg-red-50 text-red-700' },
};

export default function AdminUserDetailPage() {
  const { id } = useParams();
  const { user: me } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  // Qoʻlda kursga yozish formasi
  const [courses, setCourses] = useState([]);
  const [enrollCourseId, setEnrollCourseId] = useState('');
  const [enrollMonths, setEnrollMonths] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/users/${id}`)
      .then((res) => { setData(res); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Qoʻlda yozish uchun kurslar roʻyxati
  useEffect(() => {
    api.get('/courses/admin/all')
      .then((res) => setCourses(res.courses || []))
      .catch(() => {});
  }, []);

  const changeRole = async (role) => {
    if (!confirm(`Rolni "${ROLES[role]?.label || role}" ga oʻzgartirasizmi?`)) return;
    setBusy('role');
    try {
      await api.patch(`/admin/users/${id}/role`, { role });
      load();
    } catch (err) { alert(err.message); } finally { setBusy(''); }
  };

  const enroll = async (e) => {
    e.preventDefault();
    if (!enrollCourseId) return;
    setBusy('enroll');
    try {
      const body = { courseId: enrollCourseId };
      const m = parseInt(enrollMonths, 10);
      if (Number.isInteger(m) && m > 0) body.months = m;
      await api.post(`/admin/users/${id}/enrollments`, body);
      setEnrollCourseId(''); setEnrollMonths('');
      load();
    } catch (err) { alert(err.message); } finally { setBusy(''); }
  };

  const extend = async (enrollmentId) => {
    const input = prompt('Necha oyga uzaytirilsin? (1–60)', '3');
    if (input === null) return;
    const months = parseInt(input, 10);
    if (!Number.isInteger(months) || months < 1 || months > 60) {
      return alert('1 dan 60 gacha son kiriting');
    }
    setBusy(enrollmentId);
    try {
      await api.patch(`/admin/enrollments/${enrollmentId}`, { months });
      load();
    } catch (err) { alert(err.message); } finally { setBusy(''); }
  };

  const unenroll = async (enrollmentId, title) => {
    if (!confirm(`"${title}" kursidan chiqarasizmi? Oʻquvchining bu kursdagi progressi ham oʻchadi.`)) return;
    setBusy(enrollmentId);
    try {
      await api.del(`/admin/enrollments/${enrollmentId}`);
      load();
    } catch (err) { alert(err.message); } finally { setBusy(''); }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const { user, enrollments, payments, certificates, reviews, summary } = data;
  const role = ROLES[user.role] || ROLES.USER;
  const isSelf = me?.id === user.id;
  const enrolledIds = new Set(enrollments.map((e) => e.courseId));

  const cards = [
    { label: 'Kurslar', value: summary.enrollments, icon: BookOpen, color: 'bg-indigo-50 text-indigo-600' },
    { label: 'Sertifikatlar', value: summary.certificates, icon: Award, color: 'bg-amber-50 text-amber-600' },
    { label: 'Sharhlar', value: summary.reviews, icon: MessageSquare, color: 'bg-slate-100 text-slate-600' },
    { label: "Toʻlangan", value: formatPrice(summary.paidTotal), icon: Wallet, color: 'bg-emerald-50 text-emerald-600' },
  ];

  return (
    <div>
      <Link href="/admin/users" className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary">
        <ArrowLeft size={16} /> Odamlar
      </Link>

      {/* Profil */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-lg font-bold text-on-primary">
          {user.fullName?.charAt(0)?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl">{user.fullName}{isSelf && <span className="ml-2 text-sm text-muted">(siz)</span>}</h1>
          <p className="text-sm text-muted">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${role.cls}`}><role.Icon size={12} /> {role.label}</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">
        Roʻyxatdan oʻtgan: {new Date(user.createdAt).toLocaleDateString('uz-UZ')}
      </p>

      {/* Rolni oʻzgartirish */}
      <div className="card mt-6 p-5">
        <h2 className="text-lg">Rol</h2>
        <p className="mt-1 text-sm text-muted">
          Rolni oʻzgartirish foydalanuvchi maʼlumotlari va progressini saqlaydi.
        </p>
        {isSelf ? (
          <p className="mt-3 rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-muted">
            Oʻz rolingizni oʻzgartira olmaysiz.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(ROLES).map(([key, r]) => (
              <button
                key={key}
                onClick={() => changeRole(key)}
                disabled={user.role === key || busy === 'role'}
                className={user.role === key ? 'btn-primary' : 'btn-outline'}
              >
                {busy === 'role' ? <Loader2 size={15} className="animate-spin" /> : <r.Icon size={15} />}
                {r.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Umumiy koʻrsatkichlar */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="card p-5">
              <span className={`grid h-11 w-11 place-items-center rounded-xl ${c.color}`}><Icon size={20} /></span>
              <div className="mt-3 font-display text-2xl font-bold">{c.value}</div>
              <div className="text-sm text-muted">{c.label}</div>
            </div>
          );
        })}
      </div>

      {/* Kurslari */}
      <div className="card mt-6 p-5">
        <h2 className="text-lg">Kurslari va progressi</h2>

        {/* Qoʻlda kursga yozish */}
        <form onSubmit={enroll} className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-3">
          <select
            className="input min-w-[220px] flex-1"
            value={enrollCourseId}
            onChange={(e) => setEnrollCourseId(e.target.value)}
          >
            <option value="">Kursni tanlang — qoʻlda yozish</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}{enrolledIds.has(c.id) ? ' (yozilgan — muddat yangilanadi)' : ''}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="1"
            max="60"
            className="input max-w-[130px]"
            placeholder="Oy (ixtiyoriy)"
            value={enrollMonths}
            onChange={(e) => setEnrollMonths(e.target.value)}
          />
          <button type="submit" disabled={!enrollCourseId || busy === 'enroll'} className="btn-primary">
            {busy === 'enroll' ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Yozish
          </button>
        </form>

        {enrollments.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Hali hech qanday kursga yozilmagan.</p>
        ) : (
          <div className="mt-4 divide-y divide-line">
            {enrollments.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-[200px] flex-1">
                  <Link href={`/courses/${e.course.slug}`} className="font-medium hover:text-primary hover:underline">
                    {e.course.title}
                  </Link>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${e.progress.percent}%` }} />
                    </div>
                    <span className="text-xs text-muted">{e.progress.percent}%</span>
                  </div>
                </div>

                <div className="text-xs text-muted">
                  {e.access?.expired ? (
                    <span className="badge bg-red-50 text-red-700">Muddati tugagan</span>
                  ) : (
                    <span>
                      {e.access?.daysLeft != null ? `${e.access.daysLeft} kun qoldi` : 'Muddatsiz'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => extend(e.id)}
                    disabled={busy === e.id}
                    title="Muddatni uzaytirish"
                    className="grid h-8 w-8 place-items-center rounded-lg text-primary hover:bg-indigo-50"
                  >
                    {busy === e.id ? <Loader2 size={15} className="animate-spin" /> : <CalendarPlus size={16} />}
                  </button>
                  <button
                    onClick={() => unenroll(e.id, e.course.title)}
                    disabled={busy === e.id}
                    title="Kursdan chiqarish"
                    className="grid h-8 w-8 place-items-center rounded-lg text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Toʻlovlari */}
        <div className="card p-5">
          <h2 className="text-lg">Toʻlovlari</h2>
          {payments.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Toʻlov yoʻq.</p>
          ) : (
            <div className="mt-3 divide-y divide-line">
              {payments.map((p) => {
                const st = PAY_STATUS[p.status] || { label: p.status, cls: 'bg-slate-100 text-slate-600' };
                return (
                  <div key={p.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.course?.title}</p>
                      <p className="text-xs text-muted">
                        {p.provider} · {new Date(p.createdAt).toLocaleDateString('uz-UZ')}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold text-primary">{formatPrice(p.amount)}</p>
                      <span className={`badge ${st.cls} mt-0.5`}>{st.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sertifikatlari */}
        <div className="card p-5">
          <h2 className="text-lg">Sertifikatlari</h2>
          {certificates.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Hali sertifikat olmagan.</p>
          ) : (
            <div className="mt-3 divide-y divide-line">
              {certificates.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.course?.title}</p>
                    <p className="font-mono text-xs text-muted">{c.serial}</p>
                  </div>
                  <Link href={`/certificates/${c.id}`} className="shrink-0 text-primary hover:underline">
                    Koʻrish
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sharhlari */}
      <div className="card mt-6 p-5">
        <h2 className="text-lg">Sharhlari</h2>
        {reviews.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Sharh qoldirmagan.</p>
        ) : (
          <div className="mt-3 divide-y divide-line">
            {reviews.map((r) => (
              <div key={r.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{r.course?.title}</span>
                  <StarRating value={r.rating} size={13} />
                  <span className="text-xs text-muted">
                    {new Date(r.createdAt).toLocaleDateString('uz-UZ')}
                  </span>
                </div>
                {r.comment && <p className="mt-1 text-sm text-ink/90">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
