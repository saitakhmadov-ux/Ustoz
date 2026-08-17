'use client';

import {
  Check, Lock, Play, FileText, ChevronRight,
} from 'lucide-react';

// Kurs yoʻl xaritasi.
//
// Oddiy roʻyxat oʻrniga — yoʻl: darslar tik chiziq (umurtqa) boʻylab tugunlar
// sifatida joylashadi. Bajarilgan qismi toʻldirilgan, oldinda turgani boʻsh.
// Shu tufayli oʻquvchi qayerda turganini va oldinda nima borligini koʻradi.
//
// Tugun holatlari:
//   done      — bajarilgan (toʻldirilgan, belgili)
//   current   — hozir ochiq turgan dars (halqa bilan ajratilgan)
//   available — ochiq, lekin bajarilmagan
//   locked    — qulflangan

function nodeState(lesson, activeId) {
  if (lesson.id === activeId) return 'current';
  if (lesson.locked) return 'locked';
  if (lesson.completed) return 'done';
  return 'available';
}

function Node({ state }) {
  const base = 'relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors';
  if (state === 'done') {
    return (
      <span className={`${base} border-accent bg-accent text-on-accent`}>
        <Check size={15} strokeWidth={3} />
      </span>
    );
  }
  if (state === 'current') {
    return (
      <span className={`${base} border-primary bg-surface text-primary ring-4 ring-primary/20`}>
        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
      </span>
    );
  }
  if (state === 'locked') {
    return (
      <span className={`${base} border-line bg-surface text-subtle`}>
        <Lock size={13} />
      </span>
    );
  }
  return <span className={`${base} border-field bg-surface`} />;
}

export default function LessonPath({ sections, activeId, onSelect }) {
  // Umumiy roʻyxatda oldingi dars bajarilganmi — chiziq rangini shu belgilaydi
  let seenIndex = 0;
  const flat = sections.flatMap((s) => s.lessons);

  return (
    <nav className="px-4 pb-6 pt-2">
      {sections.map((section, si) => (
        <div key={section.id} className="mb-1">
          {/* Boʻlim belgisi — yoʻldagi bekat */}
          <div className="flex items-center gap-3 py-3">
            <span
              className="relative z-10 h-2.5 w-2.5 shrink-0 rotate-45 border border-field bg-surface"
              aria-hidden="true"
              style={{ marginLeft: 9 }}
            />
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">
              {si + 1}-boʻlim · {section.title}
            </p>
          </div>

          <ul>
            {section.lessons.map((lesson) => {
              const state = nodeState(lesson, activeId);
              const idx = seenIndex;
              seenIndex += 1;
              const prev = flat[idx - 1];
              // Ushbu tugun ustidagi chiziq boʻlagi: oldingi dars bajarilgan boʻlsa toʻldirilgan
              const spineDone = idx === 0 ? lesson.completed : prev?.completed;

              return (
                <li key={lesson.id} className="relative">
                  {/* Umurtqa — tugunlar orasidagi chiziq */}
                  <span
                    aria-hidden="true"
                    className={`absolute left-[13px] top-0 h-full w-0.5 ${spineDone ? 'bg-accent' : 'bg-line'}`}
                  />
                  <button
                    type="button"
                    onClick={() => onSelect(lesson)}
                    disabled={lesson.locked}
                    title={lesson.locked ? 'Avval oldingi darsni yakunlang' : undefined}
                    aria-current={state === 'current' ? 'step' : undefined}
                    className={`group relative flex w-full items-start gap-3 rounded-xl py-2 pl-0 pr-2 text-left transition-colors
                      ${state === 'current' ? 'bg-indigo-50' : lesson.locked ? 'cursor-not-allowed' : 'hover:bg-slate-50'}`}
                  >
                    <Node state={state} />

                    <span className="min-w-0 flex-1 pt-0.5">
                      <span
                        className={`block text-sm leading-snug
                          ${state === 'current' ? 'font-semibold text-primary'
                            : state === 'locked' ? 'text-subtle'
                              : state === 'done' ? 'text-muted' : 'text-ink'}`}
                      >
                        {lesson.title}
                      </span>

                      <span className="mt-0.5 flex items-center gap-2 text-[11px] text-subtle">
                        {lesson.videoUrl ? <Play size={11} /> : <FileText size={11} />}
                        {!lesson.locked && !lesson.completed && lesson.tasksTotal > 1 && (
                          <span>{lesson.tasksDone}/{lesson.tasksTotal} vazifa</span>
                        )}
                        {lesson.completed && <span>bajarildi</span>}
                        {lesson.locked && <span>qulflangan</span>}
                      </span>
                    </span>

                    {state === 'current' && (
                      <ChevronRight size={16} className="mt-1 shrink-0 text-primary" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
