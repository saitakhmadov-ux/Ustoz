'use client';

// IELTS Computer Writing — "Klaviaturada tez yozish" kursi ichidagi boʻlim.
//
// Toʻrt rejim: Writing Task 1 (Academic / General), Writing Task 2,
// Typing Practice, Vocabulary Practice. Interfeys oʻzbekcha, topshiriqlar
// inglizcha (IELTS formatida).
//
// Boʻlim yashil (accent) urgʻu bilan ajralib turadi, ammo dizayn tizimi
// oʻsha-oʻsha: card, btn-primary, badge va boshqalar.

import { useCallback, useEffect, useState } from 'react';
import {
  PenLine, FileText, Keyboard, BookMarked, Shuffle, Loader2, History, ArrowLeft,
} from 'lucide-react';
import { api } from '@/lib/api';
import { MODES, formatTime } from '@/lib/ielts';
import { ErrorState } from '@/components/ui';
import WritingTask from './WritingTask';
import IeltsTyping from './IeltsTyping';
import IeltsResults from './IeltsResults';

const ICONS = {
  ACADEMIC_T1: PenLine,
  GENERAL_T1: FileText,
  TASK2: PenLine,
  TYPING: Keyboard,
  VOCAB: BookMarked,
};

// Bosh ekrandagi kartochkalar: Task 1 ikkita formatga ega
const CARDS = [
  { id: 'T1', title: 'Writing Task 1', desc: 'Diagramma tavsifi yoki xat — 20 daqiqa, 150 soʻz', icon: PenLine },
  { id: 'TASK2', title: 'Writing Task 2', desc: 'Esse — 40 daqiqa, 250 soʻz', icon: FileText },
  { id: 'TYPING', title: 'Typing Practice', desc: 'Inglizcha paragrafni koʻchirib yozish', icon: Keyboard },
  { id: 'VOCAB', title: 'Vocabulary Practice', desc: 'IELTS akademik lugʻati (3 daraja)', icon: BookMarked },
];

export default function IeltsSection({ slug }) {
  const [mode, setMode] = useState(null); // null = bosh ekran
  const [level, setLevel] = useState('EASY');
  const [task, setTask] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [canEvaluate, setCanEvaluate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const loadTask = useCallback(async (type, lvl, taskId = null) => {
    setLoading(true); setError(''); setAttempt(null); setTask(null);
    try {
      const q = new URLSearchParams({ type });
      if (type === 'VOCAB' && lvl) q.set('level', lvl);
      if (taskId) q.set('taskId', taskId);
      const res = await api.get(`/learn/${slug}/ielts/task?${q}`);
      setTask(res.task);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const loadHistory = useCallback(async () => {
    try {
      const res = await api.get(`/learn/${slug}/ielts/attempts`);
      setHistory(res.attempts || []);
    } catch { /* tarix koʻrinmasa ham mashq ishlaydi */ }
  }, [slug]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const start = (type) => {
    setMode(type);
    setShowHistory(false);
    loadTask(type, level);
  };

  // Natijani yuborish (yozma va koʻchirish mashqlari uchun umumiy)
  const submit = async (text, durationMs) => {
    setBusy(true); setError('');
    try {
      const res = await api.post(`/learn/${slug}/ielts/attempt`, {
        taskId: task.id, text, durationMs,
      });
      setAttempt(res.attempt);
      setCanEvaluate(res.canEvaluate);
      loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  /* ---------------- Bosh ekran ---------------- */
  if (!mode) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5">
          <h2 className="font-display text-lg font-semibold text-heading">IELTS Computer Writing</h2>
          <p className="mt-1 text-sm text-muted">
            Kompyuterda IELTS yozish formatiga mashq: taymer, soʻz chegarasi va real
            vaqtdagi hisob. Bu rasmiy imtihon emas — mashq boʻlimi.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => (c.id === 'T1' ? setMode('T1_PICK') : start(c.id))}
                className="card flex items-start gap-4 p-5 text-left transition-colors hover:border-accent"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent-dark">
                  <Icon size={22} />
                </span>
                <span>
                  <b className="block text-ink">{c.title}</b>
                  <span className="text-sm text-muted">{c.desc}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Natijalar tarixi */}
        <div className="card p-5">
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className="flex w-full items-center gap-2 text-left"
          >
            <History size={17} className="text-muted" />
            <b className="text-ink">Mening natijalarim</b>
            <span className="text-sm text-muted">({history.length})</span>
            <span className="ml-auto text-sm text-primary">{showHistory ? 'Yashirish' : 'Koʻrish'}</span>
          </button>

          {showHistory && (
            history.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-line py-6 text-center text-sm text-muted">
                Hali mashq qilmagansiz.
              </p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-line text-left text-xs uppercase text-muted">
                    <tr>
                      <th className="py-2 pr-3">Topshiriq</th>
                      <th className="py-2 pr-3">Natija</th>
                      <th className="py-2 pr-3">Vaqt</th>
                      <th className="py-2 text-right">Sana</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {history.map((h) => (
                      <tr key={h.id}>
                        <td className="py-2 pr-3">
                          <span className="text-ink">{h.task?.title || '—'}</span>
                          <span className="ml-2 text-xs text-muted">{h.task?.subtype}</span>
                        </td>
                        <td className="py-2 pr-3 text-muted">
                          {h.accuracy != null
                            ? `${h.wpm} WPM · ${h.accuracy}%`
                            : `${h.words} words${h.aiBand ? ` · band ${h.aiBand}` : ''}`}
                        </td>
                        <td className="py-2 pr-3 text-muted">{formatTime(h.durationMs / 1000)}</td>
                        <td className="py-2 text-right text-muted">
                          {new Date(h.createdAt).toLocaleDateString('uz-UZ')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  /* ---------------- Task 1: format tanlash ---------------- */
  if (mode === 'T1_PICK') {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setMode(null)} className="btn-ghost text-sm">
          <ArrowLeft size={15} /> Orqaga
        </button>
        <div className="card p-5">
          <h3 className="font-display text-lg font-semibold text-heading">Writing Task 1 — formatni tanlang</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {['ACADEMIC_T1', 'GENERAL_T1'].map((id) => {
              const m = MODES.find((x) => x.id === id);
              const Icon = ICONS[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => start(id)}
                  className="rounded-xl border border-line p-4 text-left transition-colors hover:border-accent"
                >
                  <span className="flex items-center gap-2 font-medium text-ink"><Icon size={17} /> {m.sub}</span>
                  <span className="mt-1 block text-sm text-muted">{m.hint}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- Mashq ekrani ---------------- */
  const isCopy = mode === 'TYPING' || mode === 'VOCAB';
  const modeInfo = MODES.find((m) => m.id === mode);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => { setMode(null); setTask(null); setAttempt(null); }} className="btn-ghost text-sm">
          <ArrowLeft size={15} /> Boʻlimlar
        </button>
        <span className="badge bg-accent/10 text-accent-dark">
          {modeInfo?.label} {modeInfo?.sub ? `· ${modeInfo.sub}` : ''}
        </span>
        {!attempt && (
          <button type="button" onClick={() => loadTask(mode, level)} className="btn-ghost ml-auto text-sm">
            <Shuffle size={15} /> Boshqa topshiriq
          </button>
        )}
      </div>

      {error && <ErrorState message={error} />}

      {loading || !task ? (
        !error && <div className="card grid place-items-center p-12"><Loader2 className="animate-spin text-primary" /></div>
      ) : attempt ? (
        <IeltsResults
          attempt={attempt}
          slug={slug}
          canEvaluate={canEvaluate}
          onRetry={() => { setAttempt(null); loadTask(mode, level, task.id); }}
          onNewTask={() => { setAttempt(null); loadTask(mode, level); }}
        />
      ) : isCopy ? (
        <IeltsTyping
          task={task}
          mode={mode}
          level={level}
          onLevel={(l) => { setLevel(l); loadTask(mode, l); }}
          busy={busy}
          onFinish={submit}
          onRestart={() => loadTask(mode, level, task.id)}
        />
      ) : (
        <WritingTask
          key={task.id}
          task={task}
          busy={busy}
          onSubmit={submit}
          onReset={() => {}}
        />
      )}
    </div>
  );
}
