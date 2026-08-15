'use client';

// Yozish mashqi pleeri — mashqning yuragi.
//
// Ishlash tartibi: matn belgi-belgi chiziladi, foydalanuvchi klaviaturada
// yozadi, har bir belgi darhol bo'yaladi (to'g'ri / xato / joriy). Vaqt
// BIRINCHI bosishda boshlanadi — sahifa ochilib turgani hisobga olinmaydi.
//
// Matn oddiy <div> ichida: <input> ishlatilmaydi, shuning uchun matnni
// nusxa-ko'chirib qo'yib bo'lmaydi.
//
// Aniqlik YAKUNIY matn bo'yicha hisoblanadi (server bilan bir xil qoida):
// xatoni backspace bilan tuzatsangiz aniqlik tiklanadi, ammo vaqt ketadi.

import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import { RotateCcw, Loader2, Keyboard as KeyboardIcon } from 'lucide-react';
import {
  normalizeChar, compare, wpmOf, accuracyOf, splitLines, lineIndexAt,
} from '@/lib/typing';
import TypingKeyboard from './TypingKeyboard';

const VISIBLE_LINES = 3;
// Zaxira qiymat — o'lchash tugagunicha (birinchi chizishda) ishlatiladi
const FALLBACK_PER_LINE = 46;

export default function TypingPlayer({
  text,
  durationSec = null, // TIMED mashq davomiyligi
  targetWpm = 0,
  targetAccuracy = 0,
  showKeyboard = true,
  hint = null,
  busy = false, // natija serverga yuborilmoqda
  onFinish, // (typed, durationMs)
  onRestart, // yangi urinish so'raladi (server yangi matn beradi)
}) {
  const [typed, setTyped] = useState('');
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const [focused, setFocused] = useState(false);
  const [touch, setTouch] = useState(false);
  const [perLine, setPerLine] = useState(FALLBACK_PER_LINE);
  const boxRef = useRef(null);
  const measureRef = useRef(null);
  const finishedRef = useRef(false); // ikki marta yuborilmasin

  // Yangi matn kelsa (yangi dars yoki qayta urinish) — hammasini tozalaymiz
  useEffect(() => {
    setTyped(''); setStartedAt(null); setElapsed(0); setDone(false);
    finishedRef.current = false;
    boxRef.current?.focus();
  }, [text]);

  useEffect(() => {
    setTouch(typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches);
  }, []);

  // Bir qatorga nechta belgi sig'ishini MAYDONNING O'ZIDAN o'lchaymiz: shrift
  // ekran kengligiga qarab o'zgaradi (text-xl → text-3xl), qat'iy son bo'lsa
  // matn yo o'ng tomonda bo'sh joy qoldirardi, yo qatorga sig'may ketardi.
  useEffect(() => {
    const box = boxRef.current;
    const probe = measureRef.current;
    if (!box || !probe || typeof ResizeObserver === 'undefined') return undefined;

    const recalc = () => {
      const charWidth = probe.getBoundingClientRect().width / 20; // 20 ta belgi o'lchandi
      const style = getComputedStyle(box);
      const inner = box.clientWidth
        - parseFloat(style.paddingLeft || 0)
        - parseFloat(style.paddingRight || 0);
      if (charWidth > 0 && inner > 0) {
        setPerLine(Math.max(20, Math.floor(inner / charWidth)));
      }
    };

    recalc();
    const observer = new ResizeObserver(recalc);
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  // Sanoq — faqat yozish boshlangach yuradi
  useEffect(() => {
    if (!startedAt || done) return undefined;
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 100);
    return () => clearInterval(id);
  }, [startedAt, done]);

  const finish = useCallback((finalTyped, at) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setDone(true);
    onFinish?.(finalTyped, Math.max(1, Date.now() - at));
  }, [onFinish]);

  // Vaqtli mashq: belgilangan vaqt tugadi
  useEffect(() => {
    if (!durationSec || !startedAt || done) return;
    if (elapsed >= durationSec * 1000) finish(typed, startedAt);
  }, [elapsed, durationSec, startedAt, done, typed, finish]);

  const onKeyDown = (e) => {
    if (busy || done) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return; // nusxa/qidiruv kabi amallarga tegmaymiz

    // Tab — qayta boshlash (brauzer fokusni ko'chirmasin)
    if (e.key === 'Tab') {
      e.preventDefault();
      onRestart?.();
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      setTyped((v) => v.slice(0, -1));
      return;
    }
    if (e.key.length !== 1) return; // Shift, strelkalar va h.k.

    e.preventDefault(); // probel sahifani pastga surmasin
    const at = startedAt || Date.now();
    if (!startedAt) setStartedAt(at);

    setTyped((prev) => {
      const next = prev + e.key;
      // Vaqtsiz mashq matn oxiriga yetganda tugaydi
      if (!durationSec && next.length >= text.length) finish(next, at);
      return next;
    });
  };

  // Jonli ko'rsatkichlar (server ham xuddi shunday hisoblaydi)
  const stats = useMemo(() => {
    const { correct, chars } = compare(text.slice(0, typed.length), typed);
    return {
      wpm: elapsed > 500 ? wpmOf(correct, elapsed) : 0,
      accuracy: accuracyOf(correct, chars),
      correct,
    };
  }, [text, typed, elapsed]);

  const lines = useMemo(() => splitLines(text, perLine), [text, perLine]);
  const curLine = lineIndexAt(lines, typed.length);
  // Joriy qator o'rtada tursin (birinchi qatorlarda esa boshidan)
  const from = Math.max(0, Math.min(curLine - 1, lines.length - VISIBLE_LINES));
  const shown = lines.slice(from, from + VISIBLE_LINES);

  const nextChar = text[typed.length] || null;
  const left = durationSec ? Math.max(0, durationSec - Math.floor(elapsed / 1000)) : null;
  const progress = durationSec
    ? Math.min(100, (elapsed / (durationSec * 1000)) * 100)
    : Math.min(100, (typed.length / Math.max(1, text.length)) * 100);

  return (
    <div>
      {hint && (
        <p className="mb-4 rounded-xl bg-indigo-50 px-4 py-3 text-sm text-indigo-800">{hint}</p>
      )}

      {touch && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Bu mashq kompyuter klaviaturasi uchun mo'ljallangan. Telefonda ham yozish
          mumkin, ammo natija haqiqiy tezligingizni ko'rsatmaydi.
        </p>
      )}

      {/* Ko'rsatkichlar */}
      <div className="mb-4 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
        <span className="flex items-baseline gap-1.5">
          <b className="font-display text-3xl text-ink">{stats.wpm}</b>
          <span className="text-muted">so'z/daqiqa</span>
          {targetWpm > 0 && <span className="text-xs text-muted">(maqsad: {targetWpm})</span>}
        </span>
        <span className="flex items-baseline gap-1.5">
          <b className={`font-display text-3xl ${stats.accuracy >= targetAccuracy ? 'text-ink' : 'text-amber-600'}`}>
            {stats.accuracy}%
          </b>
          <span className="text-muted">aniqlik</span>
          {targetAccuracy > 0 && <span className="text-xs text-muted">(maqsad: {targetAccuracy}%)</span>}
        </span>
        {left !== null && (
          <span className="flex items-baseline gap-1.5">
            <b className="font-display text-3xl text-ink">{left}</b>
            <span className="text-muted">soniya qoldi</span>
          </span>
        )}
      </div>

      {/* Matn maydoni */}
      <div
        ref={boxRef}
        role="textbox"
        aria-label="Yozish maydoni"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={`relative cursor-text rounded-2xl border-2 bg-white p-6 font-mono outline-none transition-colors
          text-xl leading-[2] md:p-8 xl:text-2xl 2xl:text-3xl
          ${focused ? 'border-primary' : 'border-line'}`}
        /* Uch qator joy doim band: matn qisqa bo'lsa ham maydon "sakramaydi" */
        style={{ minHeight: `calc(${VISIBLE_LINES} * 2em + 3rem)` }}
      >
        {/* Belgi kengligini o'lchash uchun ko'rinmas namuna (matn bilan bir xil shriftda) */}
        <span
          ref={measureRef}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 -z-10 whitespace-pre opacity-0"
        >
          MMMMMMMMMMMMMMMMMMMM
        </span>

        {shown.map((line) => (
          <div key={line.start} className="whitespace-pre-wrap break-words">
            {[...line.text].map((ch, j) => {
              const i = line.start + j;
              const isTyped = i < typed.length;
              const correct = isTyped && normalizeChar(typed[i]) === normalizeChar(ch);
              const isCurrent = i === typed.length;
              return (
                <span
                  key={i}
                  className={`${isCurrent ? 'rounded-sm bg-primary/15 text-ink underline decoration-primary decoration-2 underline-offset-4' : ''}
                    ${isTyped ? (correct ? 'text-ink' : 'rounded-sm bg-red-100 text-red-600') : ''}
                    ${!isTyped && !isCurrent ? 'text-slate-400' : ''}`}
                >
                  {ch}
                </span>
              );
            })}
          </div>
        ))}

        {!focused && !done && (
          <button
            type="button"
            onClick={() => boxRef.current?.focus()}
            className="absolute inset-0 grid place-items-center rounded-2xl bg-white/80 backdrop-blur-[2px]"
          >
            <span className="flex items-center gap-2 rounded-xl bg-ink px-4 py-2 font-sans text-sm font-medium text-white">
              <KeyboardIcon size={16} /> Boshlash uchun shu yerni bosing
            </span>
          </button>
        )}

        {busy && (
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-white/70">
            <Loader2 size={22} className="animate-spin text-primary" />
          </div>
        )}
      </div>

      {/* Progress chizig'i */}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <button type="button" onClick={onRestart} className="btn-ghost text-sm">
          <RotateCcw size={15} /> Qaytadan <span className="text-xs text-muted">(Tab)</span>
        </button>
        <span className="text-xs text-muted">
          {durationSec ? 'Vaqt tugaguncha yozing' : `${typed.length} / ${text.length} belgi`}
        </span>
      </div>

      {showKeyboard && !touch && (
        <div className="mt-8 overflow-x-auto pb-2">
          <TypingKeyboard nextChar={nextChar} />
        </div>
      )}
    </div>
  );
}
