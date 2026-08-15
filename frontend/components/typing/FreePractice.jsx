'use client';

// Erkin mashq — kursdan tashqari vaqtli test (Monkeytype uslubida).
//
// Progressga ta'sir qilmaydi: natija faqat shaxsiy rekord uchun saqlanadi.
// Matnni server tuzadi va o'zi tekshiradi, shuning uchun rekord ishonarli.

import { useCallback, useEffect, useState } from 'react';
import { Timer, Type, Loader2, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import TypingPlayer from './TypingPlayer';

const TIMES = [15, 30, 60, 120];
// Eng kichik variant ham maydonni to'ldiradi (backend bilan bir xil ro'yxat)
const COUNTS = [40, 60, 100, 200];

export default function FreePractice() {
  const [mode, setMode] = useState('time');
  const [value, setValue] = useState(30);
  const [drill, setDrill] = useState(null);
  const [result, setResult] = useState(null);
  const [best, setBest] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError(''); setResult(null); setDrill(null);
    try {
      const res = await api.get(`/typing/practice?mode=${mode}&value=${value}`);
      setDrill(res);
    } catch (err) {
      setError(err.message);
    }
  }, [mode, value]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    api.get('/typing/records').then((res) => setBest(res.best)).catch(() => {});
  }, []);

  const finish = async (typed, durationMs) => {
    setBusy(true); setError('');
    try {
      const res = await api.post('/typing/practice', { typed, durationMs });
      setResult(res.result);
      setBest(res.best);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const options = mode === 'time' ? TIMES : COUNTS;

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-line p-1">
              <button
                type="button"
                onClick={() => { setMode('time'); setValue(30); }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${mode === 'time' ? 'bg-primary text-white' : 'text-muted hover:text-ink'}`}
              >
                <Timer size={15} /> Vaqt
              </button>
              <button
                type="button"
                onClick={() => { setMode('words'); setValue(40); }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${mode === 'words' ? 'bg-primary text-white' : 'text-muted hover:text-ink'}`}
              >
                <Type size={15} /> So'zlar
              </button>
            </div>

            <div className="flex gap-1">
              {options.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setValue(o)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${value === o ? 'bg-slate-900 text-white' : 'text-muted hover:bg-slate-100'}`}
                >
                  {o}{mode === 'time' ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          {best && (
            <span className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-sm text-amber-800">
              <Zap size={15} /> Rekordingiz: <b>{best.wpm}</b> so'z/daq · {best.accuracy}%
            </span>
          )}
        </div>
      </div>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {result && (
        <div className="card flex flex-wrap items-center gap-x-8 gap-y-3 p-5">
          <span className="flex items-baseline gap-1.5">
            <b className="font-display text-3xl text-ink">{result.wpm}</b>
            <span className="text-sm text-muted">so'z/daqiqa</span>
          </span>
          <span className="flex items-baseline gap-1.5">
            <b className="font-display text-3xl text-ink">{result.accuracy}%</b>
            <span className="text-sm text-muted">aniqlik</span>
          </span>
          <span className="text-sm text-muted">{result.errors} ta xato belgi</span>
          <button type="button" onClick={load} className="btn-primary ml-auto">Yana bir marta</button>
        </div>
      )}

      {drill ? (
        <div className="card p-6 md:p-8">
          <TypingPlayer
            key={drill.text}
            text={drill.text}
            durationSec={drill.durationSec}
            showKeyboard={false}
            busy={busy}
            onFinish={finish}
            onRestart={load}
          />
        </div>
      ) : !error && (
        <div className="card grid place-items-center p-10"><Loader2 className="animate-spin text-primary" /></div>
      )}

      <p className="text-center text-xs text-muted">
        Erkin mashq natijasi kurs progressiga ta'sir qilmaydi — faqat shaxsiy rekordingiz saqlanadi.
      </p>
    </div>
  );
}
