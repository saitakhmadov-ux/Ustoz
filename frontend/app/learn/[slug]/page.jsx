'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2, Circle, PlayCircle, FileText, ChevronLeft, ChevronRight,
  Award, Menu, X, Download, Paperclip, Lock, ListChecks,
} from 'lucide-react';
import { api } from '@/lib/api';
import { fileUrl } from '@/lib/constants';
import { getEmbedUrl, isDirectVideo } from '@/lib/video';
import RequireAuth from '@/components/RequireAuth';
import QuizModal from '@/components/QuizModal';
import LockedVideo from '@/components/LockedVideo';
import AccessChip from '@/components/AccessChip';
import { Spinner, ErrorState } from '@/components/ui';

function LearnInner() {
  const { slug } = useParams();
  const [course, setCourse] = useState(null);
  const [progress, setProgress] = useState({ percent: 0, completed: 0, total: 0, completedTasks: 0, totalTasks: 0 });
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [currentId, setCurrentId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [certificate, setCertificate] = useState(null);
  const [busyKey, setBusyKey] = useState(null);

  // Kursni yuklash. keepCurrent=true bo'lsa tanlangan darsni saqlaydi (vazifa bajarilgandan keyin).
  const load = async (keepCurrent = false) => {
    if (!keepCurrent) setLoading(true);
    try {
      const res = await api.get(`/learn/${slug}`);
      setCourse(res.course);
      setProgress(res.progress);
      setAccess(res.access);
      setError('');
      setErrorCode('');
      if (!keepCurrent) {
        const all = res.course.sections.flatMap((s) => s.lessons);
        // Birinchi ochilgan (unlocked) tugallanmagan dars, aks holda birinchi ochilgan
        const target = all.find((l) => !l.locked && !l.completed) || all.find((l) => !l.locked) || all[0];
        setCurrentId(target?.id || null);
      }
    } catch (err) {
      setError(err.message);
      setErrorCode(err.code || '');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug]);

  const flatLessons = useMemo(
    () => (course ? course.sections.flatMap((s) => s.lessons) : []),
    [course]
  );
  const current = flatLessons.find((l) => l.id === currentId);
  const currentIndex = flatLessons.findIndex((l) => l.id === currentId);
  const nextLesson = currentIndex >= 0 ? flatLessons[currentIndex + 1] : null;

  // Vazifa bajarilgandan keyin server javobini qo'llash (progress/sertifikat + qulflarni yangilash)
  const applyResult = async (res) => {
    if (res?.progress) setProgress(res.progress);
    if (res?.certificate) setCertificate(res.certificate);
    await load(true); // qulflar kaskadini yangilash uchun qayta yuklaymiz
  };

  const completeTask = async (taskKey) => {
    setBusyKey(taskKey);
    try {
      const res = await api.post(`/lessons/${current.id}/task`, { taskKey });
      await applyResult(res);
    } catch (err) {
      setError(err.message);
      setErrorCode(err.code || '');
    } finally {
      setBusyKey(null);
    }
  };

  const goTo = (lesson) => {
    if (lesson.locked) return;
    setCurrentId(lesson.id);
    setSidebarOpen(false);
  };

  if (loading) return <Spinner label="Kurs yuklanmoqda..." />;

  // Muddat tugagan yoki yozilmagan — bloklangan ekran
  if (errorCode === 'ACCESS_EXPIRED' || errorCode === 'NOT_ENROLLED') {
    const expired = errorCode === 'ACCESS_EXPIRED';
    return (
      <div className="container-page flex min-h-[calc(100vh-4rem)] items-center justify-center py-10">
        <div className="card max-w-md p-8 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-600">
            <Lock size={26} />
          </span>
          <h1 className="mt-4 text-2xl">{expired ? 'Foydalanish muddati tugagan' : 'Siz bu kursga yozilmagansiz'}</h1>
          <p className="mt-2 text-muted">
            {expired
              ? 'Bu kursdan foydalanish muddati yakunlandi. Davom etish uchun kursga qayta yoziling — o\'quv jarayoningiz saqlanadi.'
              : 'Kurs kontentiga kirish uchun avval kursga yoziling.'}
          </p>
          <Link href={`/courses/${slug}`} className="btn-primary mt-6 w-full">
            {expired ? 'Kursga qayta yozilish' : 'Kurs sahifasiga o\'tish'}
          </Link>
        </div>
      </div>
    );
  }

  if (error) return <div className="container-page py-10"><ErrorState message={error} /></div>;
  if (!course || !current) return <div className="container-page py-10"><ErrorState message="Kurs kontenti topilmadi" /></div>;

  const currentLocked = current.locked;

  // Video qulfi: darsda video bo'lsa va u ko'rilmagan bo'lsa — matn/PDF/test bloklanadi.
  const videoTask = current.tasks?.find((t) => t.type === 'VIDEO');
  const videoDone = videoTask?.done ?? false;
  const videoGate = !!current.videoGate; // backend hisoblaydi (staff uchun false)

  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[340px_1fr]">
      {/* Yon panel (curriculum) */}
      <aside className={`border-r border-line bg-white lg:block ${sidebarOpen ? 'fixed inset-0 z-50 overflow-y-auto' : 'hidden'}`}>
        <div className="border-b border-line p-5">
          <div className="flex items-center justify-between">
            <Link href={`/courses/${slug}`} className="text-sm text-primary hover:underline">← Kurs sahifasi</Link>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
          </div>
          <h2 className="mt-3 font-display text-lg font-bold leading-snug">{course.title}</h2>

          {/* Progress + muddat */}
          <div className="mt-3">
            <div className="flex items-end justify-between">
              <span className="text-sm text-muted">{progress.completedTasks ?? 0}/{progress.totalTasks ?? 0} vazifa</span>
              <span className="font-display text-3xl font-bold leading-none text-primary">{progress.percent}%</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress.percent}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-muted">{progress.completedLessons ?? progress.completed}/{progress.totalLessons ?? progress.total} dars</span>
              <AccessChip access={access} />
            </div>
          </div>
        </div>

        <nav className="p-3">
          {course.sections.map((section, si) => (
            <div key={section.id} className="mb-4">
              <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">
                {si + 1}. {section.title}
              </p>
              <ul className="mt-1 space-y-0.5">
                {section.lessons.map((lesson) => {
                  const active = lesson.id === currentId;
                  const locked = lesson.locked;
                  return (
                    <li key={lesson.id}>
                      <button
                        onClick={() => goTo(lesson)}
                        disabled={locked}
                        title={locked ? 'Avval oldingi darsni yakunlang' : undefined}
                        className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors
                          ${active ? 'bg-indigo-50 font-medium text-primary' : locked ? 'cursor-not-allowed opacity-60' : 'hover:bg-slate-50'}`}
                      >
                        {locked
                          ? <Lock size={16} className="shrink-0 text-slate-400" />
                          : lesson.completed
                            ? <CheckCircle2 size={17} className="shrink-0 text-emerald-500" />
                            : <Circle size={17} className="shrink-0 text-slate-300" />}
                        <span className="flex-1 leading-snug">{lesson.title}</span>
                        {!locked && !lesson.completed && lesson.tasksTotal > 1 && (
                          <span className="shrink-0 text-[11px] text-muted">{lesson.tasksDone}/{lesson.tasksTotal}</span>
                        )}
                        {lesson.videoUrl
                          ? <PlayCircle size={14} className="shrink-0 text-slate-400" />
                          : <FileText size={14} className="shrink-0 text-slate-400" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Asosiy kontent */}
      <div className="bg-slate-50">
        {/* Mobil sarlavha */}
        <div className="flex items-center gap-3 border-b border-line bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}><Menu size={22} /></button>
          <span className="truncate text-sm font-medium">{course.title}</span>
          <span className="ml-auto text-lg font-bold text-primary">{progress.percent}%</span>
        </div>

        <div className="mx-auto max-w-3xl px-4 py-8">
          {/* Sertifikat bildirishnomasi */}
          {certificate && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-5 py-4 text-white">
              <Award size={28} />
              <div className="flex-1">
                <p className="font-semibold">Tabriklaymiz! Kursni tugatdingiz 🎉</p>
                <p className="text-sm text-indigo-50">Sertifikatingiz tayyor.</p>
              </div>
              <Link href={`/certificates/${certificate.id}`} className="btn-accent">Sertifikatni ko'rish</Link>
            </div>
          )}

          {currentLocked ? (
            /* Qulflangan dars ochilsa (kam holat) */
            <div className="card p-8 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Lock size={26} /></span>
              <h1 className="mt-4 text-2xl">Bu dars hali ochilmagan</h1>
              <p className="mt-2 text-muted">Ketma-ket o'qish tartibi: avvalgi darsni to'liq yakunlang, keyin bu dars ochiladi.</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl">{current.title}</h1>

              {/* Video — qulflangan pleer (oxirigacha ko'rilmaguncha keyingi materiallar ochilmaydi) */}
              {current.videoUrl && (
                <div className="mt-5">
                  <LockedVideo
                    videoUrl={current.videoUrl}
                    onComplete={videoDone ? undefined : () => completeTask(`video:${current.id}`)}
                  />
                </div>
              )}

              {/* Video ko'rilmaguncha qolgan materiallar bloklanadi */}
              {videoGate ? (
                <div className="mt-6 rounded-2xl border border-line bg-white p-6 text-center shadow-card">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                    <Lock size={22} />
                  </span>
                  <p className="mt-3 font-semibold text-ink">Materiallar bloklangan</p>
                  <p className="mt-1 text-sm text-muted">Yuqoridagi videoni oxirigacha ko'ring — keyin matn, PDF va test ochiladi.</p>
                </div>
              ) : (
                <>
              {/* Matnli material */}
              {current.content && (
                <div className="prose mt-6 max-w-none rounded-2xl bg-white p-6 text-[15px] leading-relaxed text-ink shadow-card">
                  <div className="whitespace-pre-wrap">{current.content}</div>
                </div>
              )}

              {/* Qo'shimcha materiallar (video / PDF) */}
              {current.materials?.length > 0 && (
                <div className="mt-6 rounded-2xl bg-white p-6 shadow-card">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <Paperclip size={18} className="text-primary" /> Qo'shimcha materiallar
                  </h3>
                  <div className="mt-4 space-y-4">
                    {current.materials.map((m) => (
                      <div key={m.id}>
                        {m.type === 'VIDEO' ? (
                          <div>
                            <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink">
                              <PlayCircle size={15} className="text-primary" /> {m.title}
                            </p>
                            {isDirectVideo(m.url) ? (
                              <video src={fileUrl(m.url)} controls className="aspect-video w-full overflow-hidden rounded-xl bg-black" />
                            ) : (
                              <iframe
                                src={getEmbedUrl(m.url)}
                                title={m.title}
                                className="aspect-video w-full overflow-hidden rounded-xl"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            )}
                          </div>
                        ) : (
                          <a
                            href={fileUrl(m.url)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 transition-colors hover:border-primary hover:bg-indigo-50/40"
                          >
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-red-50 text-red-500">
                              <FileText size={18} />
                            </span>
                            <span className="flex-1 text-sm font-medium">{m.title}</span>
                            <Download size={16} className="text-muted" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Test */}
              {current.hasQuiz && (
                <div className="mt-6">
                  <QuizModal lesson={current} onResult={applyResult} />
                </div>
              )}
                </>
              )}

              {/* Vazifalar ro'yxati — darsni yakunlash */}
              <TaskChecklist
                lesson={current}
                busyKey={busyKey}
                onComplete={completeTask}
                videoGate={videoGate}
              />

              {/* Boshqaruv tugmalari */}
              <div className="mt-8 flex items-center justify-between gap-3">
                <button
                  onClick={() => currentIndex > 0 && setCurrentId(flatLessons[currentIndex - 1].id)}
                  disabled={currentIndex === 0}
                  className="btn-outline"
                >
                  <ChevronLeft size={16} /> Oldingi
                </button>

                {current.completed
                  ? <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600"><CheckCircle2 size={16} /> Dars yakunlandi</span>
                  : <span className="text-sm text-muted">{current.tasksDone}/{current.tasksTotal} vazifa bajarildi</span>}

                <button
                  onClick={() => nextLesson && !nextLesson.locked && setCurrentId(nextLesson.id)}
                  disabled={!nextLesson || nextLesson.locked}
                  title={nextLesson?.locked ? 'Bu darsni yakunlab, keyingisini oching' : undefined}
                  className="btn-outline"
                >
                  Keyingi {nextLesson?.locked ? <Lock size={15} /> : <ChevronRight size={16} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Darsning vazifalari ro'yxati (video/matn/material/test) — har biri belgilanadi.
function TaskChecklist({ lesson, busyKey, onComplete, videoGate }) {
  const tasks = lesson.tasks || [];
  if (tasks.length === 0) return null;
  const allDone = lesson.completed;

  return (
    <div className={`mt-6 rounded-2xl border p-5 shadow-card ${allDone ? 'border-emerald-200 bg-emerald-50/40' : 'border-line bg-white'}`}>
      <h3 className="flex items-center gap-2 text-base font-semibold">
        <ListChecks size={18} className="text-primary" />
        Darsni yakunlash
        <span className="ml-auto text-sm font-normal text-muted">{lesson.tasksDone}/{lesson.tasksTotal}</span>
      </h3>
      <ul className="mt-4 space-y-2">
        {tasks.map((t) => {
          const isQuiz = t.type === 'QUIZ';
          const isVideo = t.type === 'VIDEO';
          const busy = busyKey === t.key;
          // Video vazifasi qulf ostida emas; boshqa vazifalar video ko'rilmasa bloklanadi
          const gated = videoGate && !isVideo;
          return (
            <li
              key={t.key}
              className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm
                ${t.done ? 'border-emerald-200 bg-emerald-50/50' : 'border-line bg-white'}`}
            >
              {t.done
                ? <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
                : gated
                  ? <Lock size={16} className="shrink-0 text-slate-300" />
                  : <Circle size={18} className="shrink-0 text-slate-300" />}
              <span className={`flex-1 ${t.done ? 'text-muted line-through' : gated ? 'text-slate-400' : 'text-ink'}`}>{t.label}</span>
              {t.done ? (
                <span className="text-xs font-medium text-emerald-600">Bajarildi</span>
              ) : isVideo ? (
                <span className="text-xs text-muted">Video oxirigacha ko'rilganda belgilanadi</span>
              ) : gated ? (
                <span className="text-xs text-muted">Avval videoni ko'ring</span>
              ) : isQuiz ? (
                <span className="text-xs text-muted">Yuqoridagi testdan o'ting</span>
              ) : (
                <button
                  onClick={() => onComplete(t.key)}
                  disabled={busy}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
                >
                  {busy ? '...' : 'Belgilash'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {allDone && (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-600">
          <CheckCircle2 size={15} /> Barcha vazifalar bajarildi — keyingi dars ochildi.
        </p>
      )}
    </div>
  );
}

export default function LearnPage() {
  return (
    <RequireAuth>
      <LearnInner />
    </RequireAuth>
  );
}
