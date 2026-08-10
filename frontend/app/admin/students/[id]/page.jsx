'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, GraduationCap, PlayCircle, CircleSlash, Clock, Award, Star,
  ChevronDown, ChevronRight, Check, Send, Loader2, X, ListChecks, CalendarDays,
} from 'lucide-react';
import { api } from '@/lib/api';
import { Spinner, ErrorState } from '@/components/ui';
import { formatDaysLeft } from '@/lib/constants';

// Yozilish holati — yorliq va rang (ro'yxat sahifasi bilan bir xil)
const STATUS = {
  completed: { label: 'Tugatgan', cls: 'bg-emerald-50 text-emerald-700', Icon: GraduationCap },
  inProgress: { label: 'Jarayonda', cls: 'bg-indigo-50 text-indigo-700', Icon: PlayCircle },
  notStarted: { label: 'Boshlamagan', cls: 'bg-slate-100 text-slate-600', Icon: CircleSlash },
  expired: { label: 'Muddati tugagan', cls: 'bg-amber-50 text-amber-700', Icon: Clock },
};

// Muddat rangi — formatDaysLeft qaytargan tonega mos
const TONE = { ok: 'text-emerald-600', amber: 'text-amber-600', red: 'text-red-600' };

function barColor(percent) {
  if (percent >= 70) return 'bg-emerald-500';
  if (percent >= 30) return 'bg-amber-500';
  return 'bg-rose-500';
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('uz-UZ');
}

// Bir kurs bo'yicha darslar ro'yxati — bo'limlar kesimida guruhlanadi
function LessonBreakdown({ lessons }) {
  const sections = [];
  for (const l of lessons) {
    const last = sections[sections.length - 1];
    if (last && last.id === l.sectionId) last.lessons.push(l);
    else sections.push({ id: l.sectionId, title: l.sectionTitle, lessons: [l] });
  }

  return (
    <div className="mt-3 space-y-4">
      {sections.map((s) => (
        <div key={s.id}>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">{s.title}</div>
          <ul className="mt-2 space-y-1.5">
            {s.lessons.map((l) => {
              const done = l.tasks.filter((t) => t.done).length;
              return (
                <li key={l.id} className="flex items-start gap-2.5 text-sm">
                  <span
                    className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full
                      ${l.done ? 'bg-emerald-500 text-white' : 'border border-line bg-white'}`}
                  >
                    {l.done && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span className={`min-w-0 flex-1 ${l.done ? '' : 'text-muted'}`}>{l.title}</span>
                  <span className="shrink-0 text-xs text-muted">{done}/{l.tasks.length}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function StudentDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openCourse, setOpenCourse] = useState(null); // dars tafsiloti ochilgan kurs

  // Xabar yuborish
  const [showMessage, setShowMessage] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [sending, setSending] = useState(false);
  const [msgError, setMsgError] = useState('');
  const [sent, setSent] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/teaching/students/${id}`)
      .then((res) => { setData(res); setError(''); })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const sendMessage = async (e) => {
    e.preventDefault();
    setMsgError(''); setSent(false);
    if (title.trim().length < 2) return setMsgError('Sarlavha juda qisqa');
    if (body.trim().length < 1) return setMsgError('Xabar matnini kiriting');
    setSending(true);
    try {
      await api.post('/admin/notifications', {
        mode: 'users',
        userIds: [id],
        title: title.trim(),
        body: body.trim(),
        sendEmail,
      });
      setTitle(''); setBody(''); setSendEmail(false);
      setShowMessage(false);
      setSent(true);
    } catch (err) {
      setMsgError(err.message);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const { student, enrollments } = data;

  return (
    <div>
      <Link href="/admin/students" className="inline-flex items-center gap-2 text-sm text-muted hover:text-primary">
        <ArrowLeft size={16} /> O'quvchilar
      </Link>

      {/* Profil */}
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-primary text-lg font-bold text-white">
          {student.fullName?.charAt(0)?.toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl">{student.fullName}</h1>
          <p className="text-sm text-muted">{student.email}</p>
        </div>
        <button onClick={() => { setShowMessage((v) => !v); setSent(false); }} className="btn-primary">
          <Send size={16} /> Xabar yuborish
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Ro'yxatdan o'tgan: {formatDate(student.createdAt)}
      </p>

      {sent && (
        <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          Xabar yuborildi.
        </div>
      )}

      {/* Xabar formasi */}
      {showMessage && (
        <form onSubmit={sendMessage} className="card mt-4 p-5">
          <h2 className="text-lg">Shaxsiy xabar</h2>
          <p className="mt-1 text-sm text-muted">
            Xabar faqat <b>{student.fullName}</b> ga boradi.
          </p>
          {msgError && (
            <div className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{msgError}</div>
          )}
          <div className="mt-3 space-y-3">
            <div>
              <label className="label">Sarlavha</label>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Masalan: Kursni davom ettiring"
              />
            </div>
            <div>
              <label className="label">Xabar</label>
              <textarea
                className="input min-h-[110px]"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Xabar matni..."
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
              Email orqali ham yuborilsin
            </label>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" disabled={sending} className="btn-primary">
              {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Yuborish
            </button>
            <button type="button" onClick={() => { setShowMessage(false); setMsgError(''); }} className="btn-ghost">
              <X size={16} /> Bekor qilish
            </button>
          </div>
        </form>
      )}

      {/* Kurslar kesimida */}
      <h2 className="mt-8 text-lg">Kurslardagi progressi</h2>
      <div className="mt-3 space-y-4">
        {enrollments.map((e) => {
          const st = STATUS[e.status];
          const days = formatDaysLeft(e.access);
          const open = openCourse === e.course.id;
          return (
            <div key={e.enrollmentId} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/courses/${e.course.slug}`} className="font-medium hover:text-primary">
                    {e.course.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={12} /> Yozilgan: {formatDate(e.enrolledAt)}
                    </span>
                    {e.lastActivityAt && (
                      <span>Oxirgi faollik: {formatDate(e.lastActivityAt)}</span>
                    )}
                    {days && (
                      <span className={TONE[days.tone] || 'text-muted'}>{days.label}</span>
                    )}
                  </div>
                </div>
                <span className={`badge ${st.cls}`}><st.Icon size={12} /> {st.label}</span>
              </div>

              {/* Progress */}
              <div className="mt-4 flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${barColor(e.progress.percent)}`}
                    style={{ width: `${e.progress.percent}%` }}
                  />
                </div>
                <span className="text-sm font-semibold">{e.progress.percent}%</span>
              </div>
              <div className="mt-1.5 text-xs text-muted">
                {e.progress.completedLessons}/{e.progress.totalLessons} dars ·{' '}
                {e.progress.completedTasks}/{e.progress.totalTasks} vazifa
              </div>

              {/* Sertifikat va sharh */}
              <div className="mt-3 flex flex-wrap gap-2">
                {e.certificate && (
                  <span className="badge bg-amber-50 text-amber-700">
                    <Award size={12} /> Sertifikat №{e.certificate.serial} · {formatDate(e.certificate.issuedAt)}
                  </span>
                )}
                {e.review && (
                  <span className="badge bg-slate-100 text-slate-600">
                    <Star size={12} /> Bahosi: {e.review.rating}/5
                  </span>
                )}
              </div>
              {e.review?.comment && (
                <p className="mt-2 rounded-xl bg-slate-50 px-4 py-2.5 text-sm text-muted">
                  “{e.review.comment}”
                </p>
              )}

              {/* Test urinishlari */}
              {e.attempts.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Test urinishlari
                  </div>
                  <ul className="mt-2 space-y-1.5">
                    {e.attempts.slice(0, 8).map((a) => (
                      <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                        <span
                          className={`badge ${a.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}
                        >
                          {a.score}%
                        </span>
                        <span className="min-w-0 flex-1 truncate">{a.lessonTitle}</span>
                        <span className="text-xs text-muted">
                          {a.correct}/{a.total} · {formatDate(a.createdAt)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Dars-dars bajarilishi */}
              {e.lessons.length > 0 && (
                <div className="mt-4 border-t border-line pt-3">
                  <button
                    type="button"
                    onClick={() => setOpenCourse(open ? null : e.course.id)}
                    className="inline-flex items-center gap-2 text-sm font-medium text-muted hover:text-primary"
                  >
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <ListChecks size={16} /> Darslar bo'yicha tafsilot
                  </button>
                  {open && <LessonBreakdown lessons={e.lessons} />}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
