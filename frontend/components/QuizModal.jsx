'use client';

import { useEffect, useRef, useState } from 'react';
import {
  HelpCircle, Loader2, Lock, CheckCircle2, XCircle, ShieldCheck, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { fileUrl } from '@/lib/constants';

// Qolgan vaqtni "N soat M daqiqa" ko'rinishida
function fmtRemaining(ms) {
  if (!ms || ms <= 0) return '';
  const totalMin = Math.ceil(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h} soat ${m} daqiqa`;
  return `${m} daqiqa`;
}

// Test — bitta oynada bitta savol, taymer bilan, ko'chirishga qarshi.
// lesson.quiz meta: { total, draw, required, available, timePerQ, passPercent,
//   cooldownHours, passed, lastScore, cooldown:{active,remainingMs,until} }
export default function QuizModal({ lesson, onResult }) {
  const meta = lesson.quiz || {};
  const [phase, setPhase] = useState('idle'); // idle | loading | active | result
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selected, setSelected] = useState(null); // joriy savolda tanlangan variant (belgilanish uchun)
  const [timeLeft, setTimeLeft] = useState(0);
  const [timePerQ, setTimePerQ] = useState(meta.timePerQ || 20);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [cooldownMs, setCooldownMs] = useState(meta.cooldown?.active ? meta.cooldown.remainingMs : 0);

  const lockRef = useRef(false); // joriy savol bir marta hal qilinishini kafolatlaydi

  // Idle kuldown taymerini jonli yangilab turamiz
  useEffect(() => {
    if (phase !== 'idle' || cooldownMs <= 0) return;
    const t = setInterval(() => setCooldownMs((m) => Math.max(0, m - 1000)), 1000);
    return () => clearInterval(t);
  }, [phase, cooldownMs]);

  // Har savol uchun teskari sanoq
  useEffect(() => {
    if (phase !== 'active') return;
    lockRef.current = false;
    setSelected(null);
    setTimeLeft(timePerQ);
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          handleAdvance(null); // vaqt tugadi — javobsiz keyingisiga
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex, phase]);

  const start = async () => {
    setError('');
    setPhase('loading');
    try {
      const res = await api.post(`/lessons/${lesson.id}/quiz/start`, {});
      setQuestions(res.quiz.questions);
      setTimePerQ(res.quiz.timePerQ);
      setAnswers({});
      setQIndex(0);
      setResult(null);
      setPhase('active');
    } catch (err) {
      if (err.code === 'QUIZ_COOLDOWN' && err.cooldown) {
        setCooldownMs(err.cooldown.remainingMs);
      }
      setError(err.message);
      setPhase('idle');
    }
  };

  // Joriy savolni yakunlab keyingisiga o'tadi (yoki testni yuboradi)
  const handleAdvance = (value) => {
    if (lockRef.current) return;
    lockRef.current = true;
    const q = questions[qIndex];
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    setTimeout(() => {
      if (qIndex + 1 < questions.length) {
        setQIndex(qIndex + 1);
      } else {
        submit(next);
      }
    }, value === null ? 150 : 400); // tanlovда qisqa belgilanish ko'rinadi
  };

  const pick = (oi) => {
    if (lockRef.current) return;
    setSelected(oi);
    handleAdvance(oi);
  };

  const submit = async (finalAnswers) => {
    setPhase('loading');
    // Barcha berilgan savollarni jo'natamiz (javobsizlar null)
    const payload = {};
    questions.forEach((q) => { payload[q.id] = finalAnswers[q.id] ?? null; });
    try {
      const res = await api.post(`/lessons/${lesson.id}/quiz`, { answers: payload });
      setResult(res);
      if (!res.passed && res.cooldown?.active) setCooldownMs(res.cooldown.remainingMs);
      setPhase('result');
    } catch (err) {
      setError(err.message);
      setPhase('idle');
    }
  };

  const exitActive = () => {
    if (!confirm('Testdan chiqasizmi? Javoblaringiz saqlanmaydi.')) return;
    setPhase('idle');
  };

  const finish = () => {
    const res = result;
    setPhase('idle');
    onResult?.(res); // sahifa progress/kuldownni yangilaydi
  };

  // ----- IDLE: test kartochkasi -----
  if (phase === 'idle' || phase === 'loading') {
    const loading = phase === 'loading';
    return (
      <div className="card p-6">
        <div className="mb-3 flex items-center gap-2">
          <HelpCircle size={20} className="text-primary" />
          <h3 className="text-lg">Test</h3>
        </div>

        {error && <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

        {meta.passed ? (
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <p className="flex items-center gap-2 font-medium"><ShieldCheck size={16} /> Testdan muvaffaqiyatli o'tgansiz</p>
            {meta.lastScore != null && <p className="mt-1 text-emerald-700">Oxirgi natija: {meta.lastScore}%</p>}
          </div>
        ) : !meta.available ? (
          <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Test hozircha tayyorlanmoqda — savollar bazasi to'ldirilmoqda.
          </div>
        ) : cooldownMs > 0 ? (
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="flex items-center gap-2 font-medium"><Lock size={16} /> Qayta topshirish vaqti hali kelmadi</p>
            <p className="mt-1">Yana <b>{fmtRemaining(cooldownMs)}</b> dan keyin urinib ko'rishingiz mumkin. Shu vaqt ichida yuqoridagi video va materiallarni qayta ko'rib chiqing.</p>
          </div>
        ) : (
          <div className="rounded-xl bg-indigo-50/60 px-4 py-3 text-sm text-ink">
            <ul className="space-y-1">
              <li>• <b>{meta.draw}</b> ta savol (bazadagi {meta.total} tadan tasodifiy)</li>
              <li>• Har savolga <b>{meta.timePerQ} soniya</b> — javob bermasangiz keyingisiga o'tadi</li>
              <li>• O'tish uchun kamida <b>{meta.passPercent}%</b> to'g'ri javob kerak</li>
              <li>• Yiqilsangiz, <b>{meta.cooldownHours} soat</b>dan keyin qayta urinish ochiladi</li>
            </ul>
          </div>
        )}

        {(meta.available && cooldownMs <= 0) && (
          <button onClick={start} disabled={loading} className="btn-primary mt-4">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <HelpCircle size={16} />}
            {meta.passed ? 'Testni qayta topshirish' : 'Testni boshlash'}
          </button>
        )}
      </div>
    );
  }

  // ----- RESULT: natija oynasi -----
  if (phase === 'result' && result) {
    return (
      <QuizOverlay onExit={null}>
        <div className="w-full max-w-md rounded-3xl bg-surface p-8 text-center shadow-2xl">
          <span className={`mx-auto grid h-16 w-16 place-items-center rounded-full ${result.passed ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
            {result.passed ? <CheckCircle2 size={34} /> : <XCircle size={34} />}
          </span>
          <h3 className="mt-4 text-2xl">{result.passed ? 'Muvaffaqiyatli!' : 'Yetarli emas'}</h3>
          <p className="mt-2 text-4xl font-display font-bold text-ink">{result.score}%</p>
          <p className="mt-1 text-muted">{result.correct} / {result.total} to'g'ri javob</p>

          <div className={`mt-5 rounded-xl px-4 py-3 text-sm ${result.passed ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
            {result.passed
              ? 'Keyingi materiallar ochildi. Davom etishingiz mumkin.'
              : `O'tish uchun ${result.passPercent}% kerak edi. Yana ${fmtRemaining(result.cooldown?.remainingMs)} dan keyin qayta urinib ko'ring — shu vaqtda materiallarni qayta ko'ring.`}
          </div>

          <button onClick={finish} className={`mt-6 w-full ${result.passed ? 'btn-primary' : 'btn-outline'}`}>
            {result.passed ? 'Davom etish' : 'Materiallarni qayta ko\'rish'}
          </button>
        </div>
      </QuizOverlay>
    );
  }

  // ----- ACTIVE: savol oynasi -----
  const q = questions[qIndex];
  if (phase === 'active' && q) {
    const pct = timePerQ > 0 ? timeLeft / timePerQ : 0;
    const danger = timeLeft <= 5;
    return (
      <QuizOverlay onExit={exitActive}>
        <div className="w-full max-w-2xl select-none rounded-3xl bg-surface p-6 shadow-2xl sm:p-8">
          {/* Yuqori: progress + taymer */}
          <div className="mb-5 flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-muted">Savol {qIndex + 1} / {questions.length}</span>
            <TimerRing pct={pct} danger={danger} label={timeLeft} />
          </div>

          {/* Savol matni + rasm */}
          <p className="text-lg font-semibold leading-snug text-ink">{q.question}</p>
          {q.imageUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={fileUrl(q.imageUrl)}
              alt="Savol rasmi"
              draggable={false}
              className="pointer-events-none mt-4 max-h-72 w-auto rounded-xl border border-line"
            />
          )}

          {/* Variantlar — faqat bosish */}
          <div className="mt-6 grid gap-3">
            {q.options.map((opt, oi) => (
              <button
                key={oi}
                onClick={() => pick(oi)}
                disabled={selected !== null}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-[15px] transition-colors
                  ${selected === oi ? 'border-primary bg-indigo-50 ring-2 ring-indigo-500/30' : 'border-line hover:border-indigo-300 hover:bg-indigo-50/40'}`}
              >
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm font-semibold ${selected === oi ? 'bg-primary text-on-primary' : 'bg-slate-100 text-muted'}`}>
                  {String.fromCharCode(65 + oi)}
                </span>
                <span className="flex-1">{opt}</span>
              </button>
            ))}
          </div>

          <p className="mt-5 text-center text-xs text-muted">Javob variantini tanlang — keyingi savolga avtomatik o'tiladi</p>
        </div>
      </QuizOverlay>
    );
  }

  return null;
}

// To'liq ekranli qoraytirilgan qatlam + ko'chirishga qarshi himoya
function QuizOverlay({ children, onExit }) {
  const block = (e) => e.preventDefault();
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-scrim p-4 backdrop-blur-sm"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      onCopy={block}
      onCut={block}
      onContextMenu={block}
      onDragStart={block}
    >
      {onExit && (
        <button
          onClick={onExit}
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-surface-glass text-ink shadow-card hover:bg-surface"
          title="Testdan chiqish"
        >
          <X size={18} />
        </button>
      )}
      {children}
    </div>
  );
}

// Taymer halqasi
function TimerRing({ pct, danger, label }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const color = danger ? '#dc2626' : '#6366F1';
  return (
    <div className="relative grid h-11 w-11 place-items-center">
      <svg className="absolute -rotate-90" width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="#E5E3F0" strokeWidth="4" />
        <circle
          cx="22" cy="22" r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
        />
      </svg>
      <span className={`text-sm font-bold ${danger ? 'text-red-600' : 'text-ink'}`}>{label}</span>
    </div>
  );
}
