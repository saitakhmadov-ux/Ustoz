'use client';

// Klaviatura mashqi kursining o'quv sahifasi (kind === 'TYPING').
//
// Odatiy kursdagi video/material/test bloklari bu yerda yo'q: har bir dars —
// bitta yozish mashqi. Qulflar, progress va sertifikat esa odatdagi tizimdan
// keladi, shuning uchun bu ko'rinish faqat mashqni chizadi.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, Circle, Lock, Keyboard, Menu, X, Award, Zap, Loader2, ChevronRight, Trophy,
  PenLine,
} from 'lucide-react';
import { api } from '@/lib/api';
import { MODE_LABEL, styleFor } from '@/lib/typing';
import AccessChip from '@/components/AccessChip';
import TypingPlayer from './TypingPlayer';
import TypingResults from './TypingResults';
import FreePractice from './FreePractice';
import Leaderboard from './Leaderboard';
import IeltsSection from '@/components/ielts/IeltsSection';

export default function TypingCourseView({
  course, progress, access, certificate, onReload,
}) {
  const [tab, setTab] = useState('lessons'); // 'lessons' | 'practice' | 'records'
  const [currentId, setCurrentId] = useState(null);
  const [drill, setDrill] = useState(null);
  const [result, setResult] = useState(null);
  const [cert, setCert] = useState(certificate || null);
  const [busy, setBusy] = useState(false);
  const [loadingDrill, setLoadingDrill] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const lessons = useMemo(
    () => course.sections.flatMap((s) => s.lessons),
    [course],
  );

  // Boshlanishida: birinchi ochiq va tugatilmagan dars
  useEffect(() => {
    if (currentId && lessons.some((l) => l.id === currentId)) return;
    const target = lessons.find((l) => !l.locked && !l.completed)
      || lessons.find((l) => !l.locked)
      || lessons[0];
    setCurrentId(target?.id || null);
  }, [lessons, currentId]);

  const current = lessons.find((l) => l.id === currentId) || null;
  const currentIndex = lessons.findIndex((l) => l.id === currentId);
  const next = currentIndex >= 0 ? lessons[currentIndex + 1] : null;
  // Animatsiya uslubi dars tartibiga bog'langan: ketma-ket darslar bir xil
  // ko'rinmaydi, ammo bitta dars har safar o'zining uslubi bilan ochiladi.
  const anim = styleFor(currentIndex);

  // Mashqni serverdan olish (matn shu yerdan keladi — vaqtli mashqda uzaytirilgan holda)
  const loadDrill = useCallback(async (lessonId) => {
    if (!lessonId) return;
    setLoadingDrill(true); setError(''); setResult(null); setDrill(null);
    try {
      const res = await api.post(`/lessons/${lessonId}/typing/start`);
      setDrill(res.drill);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDrill(false);
    }
  }, []);

  useEffect(() => {
    if (currentId && !current?.locked) loadDrill(currentId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  const finish = async (typed, durationMs) => {
    setBusy(true); setError('');
    try {
      const res = await api.post(`/lessons/${currentId}/typing`, { typed, durationMs });
      setResult(res.result);
      if (res.certificate) setCert(res.certificate);
      // O'tgan bo'lsa qulflar va progress yangilanadi
      if (res.result.passed) await onReload?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const goTo = (lesson) => {
    if (lesson.locked) return;
    setCurrentId(lesson.id);
    setSidebarOpen(false);
  };

  const sidebar = (
    <aside className="space-y-5">
      {course.sections.map((s) => (
        <div key={s.id}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{s.title}</p>
          <ul className="space-y-1">
            {s.lessons.map((l) => {
              const activeItem = l.id === currentId;
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => goTo(l)}
                    disabled={l.locked}
                    className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors
                      ${activeItem ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-slate-100'}
                      ${l.locked ? 'cursor-not-allowed text-slate-400' : ''}`}
                  >
                    {l.locked ? <Lock size={15} className="shrink-0" />
                      : l.completed ? <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
                        : <Circle size={15} className="shrink-0 text-slate-300" />}
                    <span className="min-w-0 flex-1 truncate">{l.title}</span>
                    {l.typing?.best && (
                      <span className="shrink-0 text-xs text-muted">{l.typing.best.wpm}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );

  return (
    // Odatiy `container-page` dan kengroq: mashq maydoni va klaviatura
    // katta ekranda ham to'liq joyni egallasin
    <div className="mx-auto w-full max-w-[1600px] px-4 py-6 md:px-6">
      {/* Sarlavha */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-white">
            <Keyboard size={22} />
          </span>
          <div>
            <h1 className="font-display text-xl font-bold text-ink">{course.title}</h1>
            <p className="text-sm text-muted">
              {progress.completedTasks} / {progress.totalTasks} dars · {progress.percent}%
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <AccessChip access={access} />
          {cert && (
            <Link href={`/certificates/${cert.id}`} className="btn-outline text-sm">
              <Award size={16} /> Sertifikat
            </Link>
          )}
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="btn-outline text-sm lg:hidden"
          >
            <Menu size={16} /> Darslar
          </button>
        </div>
      </div>

      {/* Umumiy progress */}
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress.percent}%` }} />
      </div>

      {/* Bo'limlar */}
      <div className="mt-6 flex gap-1 border-b border-line">
        <button
          type="button"
          onClick={() => setTab('lessons')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors
            ${tab === 'lessons' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink'}`}
        >
          <Keyboard size={16} /> Darslar
        </button>
        <button
          type="button"
          onClick={() => setTab('practice')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors
            ${tab === 'practice' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink'}`}
        >
          <Zap size={16} /> Erkin mashq
        </button>
        {/* IELTS bo'limi — yashil urg'u bilan ajratilgan */}
        <button
          type="button"
          onClick={() => setTab('ielts')}
          className={`flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition-colors
            ${tab === 'ielts'
              ? 'border-accent bg-accent/10 text-accent-dark'
              : 'border-transparent bg-accent/5 text-accent-dark hover:bg-accent/10'}`}
        >
          <PenLine size={16} /> IELTS Writing
        </button>
        <button
          type="button"
          onClick={() => setTab('records')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors
            ${tab === 'records' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink'}`}
        >
          <Trophy size={16} /> Rekordlar
        </button>
      </div>

      {tab === 'ielts' ? (
        <div className="mt-6"><IeltsSection slug={course.slug} /></div>
      ) : tab === 'records' ? (
        <div className="mt-6"><Leaderboard /></div>
      ) : tab === 'practice' ? (
        <div className="mt-6"><FreePractice /></div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <div className="hidden lg:block">{sidebar}</div>

          <div className="min-w-0">
            {error && (
              <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            {!current ? (
              <div className="card p-10 text-center text-muted">Darslar topilmadi</div>
            ) : (
              <div className="card p-6 md:p-8">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted">
                      {currentIndex + 1}-dars · {MODE_LABEL[current.typing?.mode] || 'Mashq'}
                    </p>
                    <h2 className="font-display text-lg font-semibold text-ink">{current.title}</h2>
                  </div>
                  {current.completed && (
                    <span className="badge bg-emerald-50 text-emerald-700">
                      <CheckCircle2 size={14} /> Yakunlangan
                      {current.typing?.best && ` · eng yaxshi ${current.typing.best.wpm} so'z/daq`}
                    </span>
                  )}
                </div>

                {result ? (
                  <TypingResults
                    result={result}
                    target={{
                      wpm: current.typing?.targetWpm || 0,
                      accuracy: current.typing?.targetAccuracy || 0,
                    }}
                    certificate={cert && result.passed ? cert : null}
                    hasNext={Boolean(next)}
                    anim={anim}
                    onRetry={() => loadDrill(currentId)}
                    onNext={() => next && setCurrentId(next.id)}
                  />
                ) : loadingDrill || !drill ? (
                  <div className="grid place-items-center py-16">
                    <Loader2 className="animate-spin text-primary" />
                  </div>
                ) : (
                  <TypingPlayer
                    key={drill.text}
                    text={drill.text}
                    durationSec={drill.durationSec}
                    targetWpm={drill.targetWpm}
                    targetAccuracy={drill.targetAccuracy}
                    showKeyboard={drill.showKeyboard}
                    hint={drill.hint}
                    anim={anim}
                    busy={busy}
                    onFinish={finish}
                    onRestart={() => loadDrill(currentId)}
                  />
                )}
              </div>
            )}

            {next && !next.locked && (
              <button
                type="button"
                onClick={() => setCurrentId(next.id)}
                className="mt-4 flex w-full items-center justify-between rounded-xl border border-line bg-white px-4 py-3 text-sm hover:border-primary"
              >
                <span className="text-muted">Keyingi dars: <b className="text-ink">{next.title}</b></span>
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobil darslar ro'yxati */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Yopish"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <div className="absolute right-0 top-0 h-full w-80 max-w-[85%] overflow-y-auto bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <b className="font-display">Darslar</b>
              <button type="button" onClick={() => setSidebarOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            {sidebar}
          </div>
        </div>
      )}
    </div>
  );
}
