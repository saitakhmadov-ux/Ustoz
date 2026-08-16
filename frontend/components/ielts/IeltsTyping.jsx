'use client';

// IELTS Typing Practice va Vocabulary Practice.
//
// Yozish dvigateli qayta yozilmadi — mavjud `TypingPlayer` ishlatiladi
// (belgi-belgi bo'yash, jonli WPM/aniqlik, klaviatura tasviri). Farqi:
// matn inglizcha va serverdan IELTS topshirig'i sifatida keladi.

import { LEVELS } from '@/lib/ielts';
import TypingPlayer from '@/components/typing/TypingPlayer';

export default function IeltsTyping({
  task, mode, level, onLevel, busy, onFinish, onRestart,
}) {
  const text = task?.body || '';

  return (
    <div className="space-y-4">
      {mode === 'VOCAB' && (
        <div className="card flex flex-wrap items-center gap-3 p-4">
          <span className="text-sm text-muted">Daraja:</span>
          <div className="flex gap-1">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => onLevel(l.id)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors
                  ${level === l.id ? 'bg-accent text-on-accent' : 'text-muted hover:bg-slate-100'}`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <span className="ml-auto text-sm text-muted">{task?.title}</span>
        </div>
      )}

      <div className="card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          {mode === 'VOCAB' ? 'IELTS academic vocabulary' : 'IELTS-style paragraph'}
        </p>
        <p className="mt-1.5 text-sm text-ink">{task?.prompt}</p>
      </div>

      <div className="card p-6 md:p-8">
        <TypingPlayer
          key={text}
          text={text}
          targetWpm={0}
          targetAccuracy={0}
          showKeyboard={mode === 'VOCAB'}
          busy={busy}
          onFinish={onFinish}
          onRestart={onRestart}
        />
      </div>
    </div>
  );
}
