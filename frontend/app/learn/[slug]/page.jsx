'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2, Circle, PlayCircle, FileText, ChevronLeft, ChevronRight,
  Award, Menu, X, Download, Paperclip, Lock, ListChecks, Sparkles, Code2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { fileUrl } from '@/lib/constants';
import { getEmbedUrl, isDirectVideo } from '@/lib/video';
import RequireAuth from '@/components/RequireAuth';
import QuizModal from '@/components/QuizModal';
import LockedVideo from '@/components/LockedVideo';
import AccessChip from '@/components/AccessChip';
import AIChat from '@/components/AIChat';
import CodePlayground from '@/components/CodePlayground';
import CourseRatingForm from '@/components/CourseRatingForm';
import TypingCourseView from '@/components/typing/TypingCourseView';
import LessonPath from '@/components/learn/LessonPath';
import ProgressRing from '@/components/learn/ProgressRing';
import Celebration from '@/components/learn/Celebration';
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
  const [aiOpen, setAiOpen] = useState(false);
  const [aiSeed, setAiSeed] = useState(null);
  const [codeOpen, setCodeOpen] = useState(false);
  // Dars/kurs yakunlanganda chiqadigan tantana ({ kind, left })
  const [celebration, setCelebration] = useState(null);
  // Oxirgi muvaffaqiyatli yuklash vaqti — fon yangilanishini cheklash uchun
  const lastLoadAt = useRef(0);

  // AI Ustozni ochish. seed={code, errorText} boʻlsa playground kontekstini uzatadi.
  const askAI = (seed) => { setAiSeed(seed || null); setAiOpen(true); };
  // Kod maydonidan "AI Ustozdan soʻrash" — kod panelni yopib, AI chatni ochamiz.
  const askAIFromCode = (seed) => { setCodeOpen(false); askAI(seed); };

  // Kursni yuklash. keepCurrent=true boʻlsa tanlangan darsni saqlaydi (vazifa bajarilgandan keyin).
  // silent=true — fonda jimgina yangilash: xatolik boʻlsa ekranni buzmaydi.
  const load = async (keepCurrent = false, { silent = false } = {}) => {
    if (!keepCurrent) setLoading(true);
    try {
      const res = await api.get(`/learn/${slug}`);
      setCourse(res.course);
      setProgress(res.progress);
      setAccess(res.access);
      setCertificate(res.certificate || null);
      setError('');
      setErrorCode('');
      if (!keepCurrent) {
        const all = res.course.sections.flatMap((s) => s.lessons);
        // Birinchi ochilgan (unlocked) tugallanmagan dars, aks holda birinchi ochilgan
        const target = all.find((l) => !l.locked && !l.completed) || all.find((l) => !l.locked) || all[0];
        setCurrentId(target?.id || null);
      }
      lastLoadAt.current = Date.now();
    } catch (err) {
      // Fon yangilanishi yiqilsa — oʻquvchi koʻrib turgan sahifani buzmaymiz
      if (silent) return;
      setError(err.message);
      setErrorCode(err.code || '');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug]);

  // Kurs kontenti ochiq sessiyada eskirib qolmasligi uchun.
  //
  // Sahifa maʼlumotni faqat ochilganda oladi, admin esa shu payt darsni
  // tahrirlashi mumkin (masalan video havolasini almashtirishi). Oʻquvchi
  // sahifaga QAYTGANDA — boshqa ilovadan, boshqa varaqdan yoki "Orqaga"
  // tugmasi bilan (bfcache) — kontentni jimgina yangilaymiz.
  //
  // Uchta hodisa kerak: visibilitychange (varaq almashtirish), focus (oyna
  // almashtirish — bunda varaq yashirilmaydi), pageshow (bfcache dan tiklash).
  // MIN_GAP — hodisalar ketma-ket kelganda soʻrov yogʻdirmaslik uchun.
  useEffect(() => {
    const MIN_GAP = 30000;
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastLoadAt.current < MIN_GAP) return;
      load(true, { silent: true });
    };
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
      window.removeEventListener('pageshow', refresh);
    };
    /* eslint-disable-next-line */
  }, [slug]);

  const flatLessons = useMemo(
    () => (course ? course.sections.flatMap((s) => s.lessons) : []),
    [course]
  );
  const current = flatLessons.find((l) => l.id === currentId);
  const currentIndex = flatLessons.findIndex((l) => l.id === currentId);
  const nextLesson = currentIndex >= 0 ? flatLessons[currentIndex + 1] : null;

  // Vazifa bajarilgandan keyin server javobini qoʻllash (progress/sertifikat + qulflarni yangilash)
  const applyResult = async (res) => {
    // Dars soni oshgan boʻlsa — tantana koʻrsatamiz (foiz emas, DARS soni,
    // chunki bitta darsda bir nechta vazifa boʻlishi mumkin)
    const before = progress.completedLessons ?? progress.completed ?? 0;
    const after = res?.progress?.completedLessons ?? res?.progress?.completed ?? before;
    const total = res?.progress?.totalLessons ?? res?.progress?.total ?? 0;

    if (res?.progress) setProgress(res.progress);
    if (res?.certificate) setCertificate(res.certificate);

    if (after > before) {
      setCelebration(
        res.progress?.percent >= 100
          ? { kind: 'course' }
          : { kind: 'lesson', left: Math.max(0, total - after) }
      );
    }

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
              ? 'Bu kursdan foydalanish muddati yakunlandi. Davom etish uchun kursga qayta yoziling — oʻquv jarayoningiz saqlanadi.'
              : 'Kurs kontentiga kirish uchun avval kursga yoziling.'}
          </p>
          <Link href={`/courses/${slug}`} className="btn-primary mt-6 w-full">
            {expired ? 'Kursga qayta yozilish' : 'Kurs sahifasiga oʻtish'}
          </Link>
        </div>
      </div>
    );
  }

  if (error) return <div className="container-page py-10"><ErrorState message={error} /></div>;
  if (!course) return <div className="container-page py-10"><ErrorState message="Kurs kontenti topilmadi" /></div>;

  // Klaviatura mashqi kursi — butunlay boshqa koʻrinish (video/test yoʻq)
  if (course.kind === 'TYPING') {
    return (
      <TypingCourseView
        course={course}
        progress={progress}
        access={access}
        certificate={certificate}
        onReload={() => load(true)}
      />
    );
  }

  if (!current) return <div className="container-page py-10"><ErrorState message="Kurs kontenti topilmadi" /></div>;

  const currentLocked = current.locked;

  // Video qulfi: darsda video boʻlsa va u koʻrilmagan boʻlsa — matn/PDF/test bloklanadi.
  const videoTask = current.tasks?.find((t) => t.type === 'VIDEO');
  const videoDone = videoTask?.done ?? false;
  const videoGate = !!current.videoGate; // backend hisoblaydi (staff uchun false)

  return (
    <>
    <Celebration
      celebration={celebration}
      certificate={certificate}
      onDone={() => setCelebration(null)}
    />
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-[340px_1fr]">
      {/* Yon panel (curriculum) */}
      <aside className={`border-r border-line bg-surface lg:block ${sidebarOpen ? 'fixed inset-0 z-50 overflow-y-auto' : 'hidden'}`}>
        <div className="border-b border-line p-5">
          <div className="flex items-center justify-between">
            <Link href={`/courses/${slug}`} className="text-sm text-primary hover:underline">← Kurs sahifasi</Link>
            <button className="lg:hidden" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
          </div>
          <h2 className="mt-3 font-display text-lg font-bold leading-snug">{course.title}</h2>

          {/* Progress halqasi + muddat */}
          <div className="mt-4">
            <ProgressRing
              percent={progress.percent}
              done={progress.completedLessons ?? progress.completed}
              total={progress.totalLessons ?? progress.total}
            />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-subtle">
                {progress.completedTasks ?? 0}/{progress.totalTasks ?? 0} vazifa
              </span>
              <AccessChip access={access} />
            </div>
          </div>
        </div>

        <LessonPath sections={course.sections} activeId={currentId} onSelect={goTo} />
      </aside>

      {/* Asosiy kontent */}
      <div className="bg-slate-50">
        {/* Mobil sarlavha */}
        <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)}><Menu size={22} /></button>
          <span className="truncate text-sm font-medium">{course.title}</span>
          <span className="ml-auto text-lg font-bold text-primary">{progress.percent}%</span>
        </div>

        <div className="mx-auto max-w-3xl px-4 py-8">
          {/* Sertifikat bildirishnomasi — faqat oxirgi materialda */}
          {certificate && !nextLesson && (
            <div className="mb-6 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-band-from to-band-to px-5 py-4 text-white">
              <Award size={28} />
              <div className="flex-1">
                <p className="font-semibold">Tabriklaymiz! Kursni tugatdingiz 🎉</p>
                <p className="text-sm text-white/85">Sertifikatingiz tayyor.</p>
              </div>
              <Link href={`/certificates/${certificate.id}`} className="btn-accent">Sertifikatni koʻrish</Link>
            </div>
          )}

          {currentLocked ? (
            /* Qulflangan dars ochilsa (kam holat) */
            <div className="card p-8 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-subtle"><Lock size={26} /></span>
              <h1 className="mt-4 text-2xl">Bu dars hali ochilmagan</h1>
              <p className="mt-2 text-muted">Ketma-ket oʻqish tartibi: avvalgi darsni toʻliq yakunlang, keyin bu dars ochiladi.</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl">{current.title}</h1>

              {/* Video — qulflangan pleer (oxirigacha koʻrilmaguncha keyingi materiallar ochilmaydi) */}
              {current.videoUrl && (
                <div className="mt-5">
                  <LockedVideo
                    videoUrl={current.videoUrl}
                    onComplete={videoDone ? undefined : () => completeTask(`video:${current.id}`)}
                  />
                </div>
              )}

              {/* Video koʻrilmaguncha qolgan materiallar bloklanadi */}
              {videoGate ? (
                <div className="mt-6 rounded-2xl border border-line bg-surface p-6 text-center shadow-card">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-subtle">
                    <Lock size={22} />
                  </span>
                  <p className="mt-3 font-semibold text-ink">Materiallar bloklangan</p>
                  <p className="mt-1 text-sm text-muted">Yuqoridagi videoni oxirigacha koʻring — keyin matn, PDF va test ochiladi.</p>
                </div>
              ) : (
                <>
              {/* Matnli material */}
              {current.content && (
                <div className="prose mt-6 max-w-none rounded-2xl bg-surface p-6 text-[15px] leading-relaxed text-ink shadow-card">
                  <div className="whitespace-pre-wrap">{current.content}</div>
                </div>
              )}

              {/* Qoʻshimcha materiallar (video / PDF) */}
              {current.materials?.length > 0 && (
                <div className="mt-6 rounded-2xl bg-surface p-6 shadow-card">
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <Paperclip size={18} className="text-primary" /> Qoʻshimcha materiallar
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

              {/* Vazifalar roʻyxati — darsni yakunlash */}
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

                {!nextLesson ? (
                  certificate ? (
                    <Link href={`/certificates/${certificate.id}`} className="btn-accent">
                      <Award size={16} /> Sertifikatingiz
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title="Sertifikat uchun barcha vazifalarni yakunlang"
                      className="btn-accent"
                    >
                      <Award size={16} /> Sertifikatingiz
                    </button>
                  )
                ) : (
                  <button
                    onClick={() => nextLesson && !nextLesson.locked && setCurrentId(nextLesson.id)}
                    disabled={nextLesson.locked}
                    title={nextLesson?.locked ? 'Bu darsni yakunlab, keyingisini oching' : undefined}
                    className="btn-outline"
                  >
                    Keyingi {nextLesson?.locked ? <Lock size={15} /> : <ChevronRight size={16} />}
                  </button>
                )}
              </div>

              {/* Faqat eng oxirgi materialda va kurs tugatilganda — baho + izoh */}
              {!nextLesson && progress.percent === 100 && (
                <div className="mt-8 border-t border-line pt-8">
                  <div className="mb-3">
                    <h2 className="text-lg font-semibold text-heading">Kursni baholang</h2>
                    <p className="text-sm text-muted">Fikringiz boshqa oʻquvchilarga yordam beradi.</p>
                  </div>
                  <CourseRatingForm slug={slug} />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>

      {/* Suzuvchi tugmalar — Kod maydoni (yashil) + AI Ustoz (indigo) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-stretch gap-3">
        <button
          onClick={() => setCodeOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3.5 font-semibold text-on-accent shadow-xl shadow-emerald-500/30 transition-transform hover:scale-105 hover:bg-accent-dark"
        >
          <Code2 size={18} /> Kod maydoni
        </button>
        <button
          onClick={() => askAI(null)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 font-semibold text-on-primary shadow-xl shadow-indigo-500/30 transition-transform hover:scale-105 hover:bg-primary-dark"
        >
          <Sparkles size={18} /> AI Ustoz
        </button>
      </div>

      <CodePlayground
        open={codeOpen}
        onClose={() => setCodeOpen(false)}
        enabled={!!course.codePlayground}
        onAskAI={askAIFromCode}
      />
      <AIChat open={aiOpen} onClose={() => setAiOpen(false)} slug={slug} lessonId={current?.id} seed={aiSeed} />
    </>
  );
}

// Darsning vazifalari roʻyxati (video/matn/material/test) — har biri belgilanadi.
function TaskChecklist({ lesson, busyKey, onComplete, videoGate }) {
  const tasks = lesson.tasks || [];
  if (tasks.length === 0) return null;
  const allDone = lesson.completed;

  return (
    <div className={`mt-6 rounded-2xl border p-5 shadow-card ${allDone ? 'border-emerald-200 bg-emerald-50/40' : 'border-line bg-surface'}`}>
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
          // Video vazifasi qulf ostida emas; boshqa vazifalar video koʻrilmasa bloklanadi
          const gated = videoGate && !isVideo;
          return (
            <li
              key={t.key}
              className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm
                ${t.done ? 'border-emerald-200 bg-emerald-50/50' : 'border-line bg-surface'}`}
            >
              {t.done
                ? <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
                : gated
                  ? <Lock size={16} className="shrink-0 text-slate-300" />
                  : <Circle size={18} className="shrink-0 text-slate-300" />}
              <span className={`flex-1 ${t.done ? 'text-muted line-through' : gated ? 'text-subtle' : 'text-ink'}`}>{t.label}</span>
              {t.done ? (
                <span className="text-xs font-medium text-emerald-600">Bajarildi</span>
              ) : isVideo ? (
                <span className="text-xs text-muted">Video oxirigacha koʻrilganda belgilanadi</span>
              ) : gated ? (
                <span className="text-xs text-muted">Avval videoni koʻring</span>
              ) : isQuiz ? (
                <span className="text-xs text-muted">Yuqoridagi testdan oʻting</span>
              ) : (
                <button
                  onClick={() => onComplete(t.key)}
                  disabled={busy}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-on-primary transition-colors hover:bg-primary-dark disabled:opacity-60"
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
