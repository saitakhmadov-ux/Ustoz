'use client';

// IELTS Writing Task 1 / Task 2 mashqi.
//
// Muharrir — mavjud `.input` uslubidagi oddiy `textarea` (yangi muharrir
// arxitekturasi qurilmadi). Yuqorisida jonli hisob: "19:42 | 137 words |
// 824 characters".
//
// Vaqt tugaganda: muharrir qulflanadi, javob avtomatik yuboriladi va natija
// ko'rsatiladi — yozilgan matn HECH QACHON yo'qolmaydi. Qo'shimcha himoya:
// har o'zgarishda qoralama localStorage ga yoziladi, shuning uchun sahifa
// yangilansa yoki brauzer yopilsa ham matn joyida qoladi.

import {
  useCallback, useEffect, useMemo, useRef, useState,
} from 'react';
import {
  Clock, Send, RotateCcw, Loader2, AlertTriangle, Lock,
} from 'lucide-react';
import { countChars, countWords, formatTime, draftKey } from '@/lib/ielts';
import ChartView from './ChartView';

export default function WritingTask({
  task, busy, onSubmit, onReset,
}) {
  const totalSec = task.durationSec || 1200;
  const [text, setText] = useState('');
  const [startedAt, setStartedAt] = useState(null);
  const [left, setLeft] = useState(totalSec);
  const [locked, setLocked] = useState(false);
  const [restored, setRestored] = useState(false);
  const areaRef = useRef(null);
  const sentRef = useRef(false);

  const key = draftKey(task.id);

  // Qoralamani tiklash (sahifa yangilangan bo'lsa)
  useEffect(() => {
    setText(''); setStartedAt(null); setLeft(totalSec); setLocked(false);
    setRestored(false); sentRef.current = false;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved?.text) {
        setText(saved.text);
        setStartedAt(saved.startedAt || null);
        setRestored(true);
      }
    } catch { /* qoralama buzilgan bo'lsa e'tiborsiz qoldiramiz */ }
  }, [key, totalSec]);

  // Har o'zgarishda qoralamani saqlaymiz
  useEffect(() => {
    if (locked) return;
    if (!text) { localStorage.removeItem(key); return; }
    try {
      localStorage.setItem(key, JSON.stringify({ text, startedAt, at: Date.now() }));
    } catch { /* joy yetmasa — jim o'tamiz */ }
  }, [text, startedAt, key, locked]);

  const finish = useCallback((finalText, ms) => {
    if (sentRef.current) return;
    sentRef.current = true;
    setLocked(true);
    localStorage.removeItem(key);
    onSubmit(finalText, ms);
  }, [key, onSubmit]);

  // Sanoq — yozish boshlangandan keyin yuradi
  useEffect(() => {
    if (!startedAt || locked) return undefined;
    const tick = () => {
      const spent = Math.floor((Date.now() - startedAt) / 1000);
      const rest = totalSec - spent;
      setLeft(rest);
      if (rest <= 0) finish(text, Math.max(1000, Date.now() - startedAt));
    };
    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [startedAt, locked, totalSec, text, finish]);

  const onChange = (e) => {
    if (locked) return;
    if (!startedAt) setStartedAt(Date.now()); // vaqt birinchi harfda boshlanadi
    setText(e.target.value);
  };

  const words = useMemo(() => countWords(text), [text]);
  const chars = countChars(text);
  const enough = !task.minWords || words >= task.minWords;
  const low = left <= 60 && left > 0 && startedAt;

  const submitNow = () => {
    if (!text.trim() || busy) return;
    finish(text, Math.max(1000, Date.now() - (startedAt || Date.now() - 1000)));
  };

  const reset = () => {
    localStorage.removeItem(key);
    sentRef.current = false;
    setText(''); setStartedAt(null); setLeft(totalSec); setLocked(false); setRestored(false);
    onReset?.();
    areaRef.current?.focus();
  };

  return (
    <div className="space-y-4">
      {/* Topshiriq */}
      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="badge bg-accent/10 text-accent-dark">{task.subtype}</span>
          {task.minWords && <span className="badge bg-slate-100 text-slate-600">Minimum {task.minWords} words</span>}
          <span className="badge bg-slate-100 text-slate-600">{Math.round(totalSec / 60)} minutes</span>
        </div>
        <p className="mt-3 whitespace-pre-line leading-relaxed text-ink">{task.prompt}</p>
      </div>

      {task.visual && task.visual !== 'NONE' && <ChartView task={task} />}

      {/* Hisoblagichlar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-white px-4 py-3">
        <span className={`flex items-center gap-2 font-display text-2xl font-bold tabular-nums
          ${low ? 'text-red-600' : locked ? 'text-muted' : 'text-ink'}`}
        >
          <Clock size={20} className={low ? 'animate-pulse' : ''} /> {formatTime(left)}
        </span>
        <span className="text-muted">|</span>
        <span className={`text-sm ${enough ? 'text-accent-dark' : 'text-muted'}`}>
          <b className="font-display text-lg text-ink">{words}</b> words
          {task.minWords && !enough && <span className="ml-1 text-amber-700">(min {task.minWords})</span>}
        </span>
        <span className="text-muted">|</span>
        <span className="text-sm text-muted"><b className="font-display text-lg text-ink">{chars}</b> characters</span>

        {!startedAt && !locked && (
          <span className="ml-auto text-xs text-muted">Vaqt birinchi harfni yozganingizda boshlanadi</span>
        )}
      </div>

      {restored && !locked && (
        <p className="flex items-start gap-2 rounded-xl bg-indigo-50 px-4 py-2.5 text-sm text-indigo-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          Saqlangan qoralama tiklandi — oldingi matningiz yo'qolmadi.
        </p>
      )}

      {/* Muharrir */}
      <div className="relative">
        <textarea
          ref={areaRef}
          className="input min-h-[340px] font-sans text-base leading-relaxed disabled:bg-slate-50"
          placeholder="Write your answer here..."
          value={text}
          onChange={onChange}
          disabled={locked}
          spellCheck={false}
        />
        {locked && (
          <span className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-slate-900/80 px-2.5 py-1 text-xs font-medium text-white">
            <Lock size={13} /> Yakunlandi
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={submitNow} disabled={locked || busy || !text.trim()} className="btn-primary disabled:opacity-50">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Submit
        </button>
        <button type="button" onClick={reset} disabled={busy} className="btn-outline disabled:opacity-50">
          <RotateCcw size={16} /> Reset
        </button>
        <span className="text-xs text-muted">
          Vaqt tugaganda javob avtomatik yuboriladi — yozganingiz yo'qolmaydi.
        </span>
      </div>
    </div>
  );
}
