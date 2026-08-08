'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { javascript } from '@codemirror/lang-javascript';
import { StreamLanguage } from '@codemirror/language';
import { python } from '@codemirror/legacy-modes/mode/python';
import { cpp, java, csharp } from '@codemirror/legacy-modes/mode/clike';
import { Play, Trash2, Terminal, Sparkles, Loader2, RotateCcw, X, Code2, Lock } from 'lucide-react';
import { api } from '@/lib/api';

const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), { ssr: false });

const RUN_TIMEOUT = 4000; // JS lokal — cheksiz sikldan himoya

// Qo'llab-quvvatlanadigan tillar (backend LANG_MAP bilan mos)
const LANGS = [
  { id: 'javascript', label: 'JavaScript', local: true },
  { id: 'python', label: 'Python' },
  { id: 'cpp', label: 'C++' },
  { id: 'csharp', label: 'C#' },
  { id: 'java', label: 'Java' },
];

// CodeMirror til kengaytmalari
const EXT = {
  javascript: javascript(),
  python: StreamLanguage.define(python),
  cpp: StreamLanguage.define(cpp),
  csharp: StreamLanguage.define(csharp),
  java: StreamLanguage.define(java),
};

// Har til uchun boshlang'ich namuna
const TEMPLATES = {
  javascript: `// JavaScript kodini yozing va "Ishga tushirish" bosing
function salomla(ism) {
  return "Salom, " + ism + "!";
}
console.log(salomla("Ustoz"));

const sonlar = [1, 2, 3, 4, 5];
console.log("Yig'indi:", sonlar.reduce((a, b) => a + b, 0));
`,
  python: `# Python kodini yozing va "Ishga tushirish" bosing
def salomla(ism):
    return "Salom, " + ism + "!"

print(salomla("Ustoz"))

sonlar = [1, 2, 3, 4, 5]
print("Yig'indi:", sum(sonlar))
`,
  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Salom, Ustoz!" << endl;

    int yigindi = 0;
    for (int i = 1; i <= 5; i++) yigindi += i;
    cout << "Yig'indi: " << yigindi << endl;
    return 0;
}
`,
  csharp: `using System;

class Program {
    static void Main() {
        Console.WriteLine("Salom, Ustoz!");

        int yigindi = 0;
        for (int i = 1; i <= 5; i++) yigindi += i;
        Console.WriteLine("Yig'indi: " + yigindi);
    }
}
`,
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Salom, Ustoz!");

        int yigindi = 0;
        for (int i = 1; i <= 5; i++) yigindi += i;
        System.out.println("Yig'indi: " + yigindi);
    }
}
`,
};

// Sandbox iframe (JS lokal bajarish)
const SANDBOX_SRCDOC = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><script>
  var fmt = function (v) {
    try {
      if (v === undefined) return 'undefined';
      if (v === null) return 'null';
      if (typeof v === 'string') return v;
      if (typeof v === 'function') return v.toString();
      if (typeof v === 'object') return JSON.stringify(v, function(k,val){ return typeof val==='function'?'[function]':val; }, 2);
      return String(v);
    } catch (e) { return String(v); }
  };
  var send = function (level, args) {
    parent.postMessage({ __pg: true, level: level, text: Array.prototype.map.call(args, fmt).join(' ') }, '*');
  };
  ['log','info','warn','error','debug'].forEach(function (m) {
    console[m] = function () { send(m === 'debug' ? 'log' : m, arguments); };
  });
  window.onerror = function (msg) { send('error', [msg]); return true; };
  window.addEventListener('unhandledrejection', function (e) {
    send('error', ['Promise xatosi: ' + (e.reason && e.reason.message ? e.reason.message : e.reason)]);
  });
  window.addEventListener('message', function (e) {
    if (!e.data || typeof e.data.__run !== 'string') return;
    try { (0, eval)(e.data.__run); }
    catch (err) { send('error', [err && err.message ? err.message : String(err)]); }
    parent.postMessage({ __pg: true, level: '__done' }, '*');
  });
  parent.postMessage({ __pg: true, level: '__ready' }, '*');
<\/script></body></html>`;

// Kod maydoni modali (o'ng tomondan sirg'alib chiqadi, AI Ustoz kabi).
// props: open, onClose, enabled (kurs dasturlash kursimi), onAskAI({code, errorText})
export default function CodePlayground({ open, onClose, enabled, onAskAI }) {
  const [lang, setLang] = useState('javascript');
  const [codes, setCodes] = useState(() => ({ ...TEMPLATES }));
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const iframeRef = useRef(null);
  const timerRef = useRef(null);
  const runningRef = useRef(false);

  const code = codes[lang];
  const setCode = (val) => setCodes((prev) => ({ ...prev, [lang]: val }));
  const lastErrorText = logs.filter((l) => l.level === 'error').map((l) => l.text).join('\n');
  const isLocal = LANGS.find((l) => l.id === lang)?.local;
  const extensions = useMemo(() => [EXT[lang] || EXT.javascript], [lang]);

  const finishRun = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    runningRef.current = false;
    setRunning(false);
    if (iframeRef.current) { iframeRef.current.remove(); iframeRef.current = null; }
  }, []);

  // JS lokal — iframe xabarlari
  useEffect(() => {
    const onMsg = (e) => {
      const d = e.data;
      if (!d || !d.__pg) return;
      if (d.level === '__ready') {
        if (iframeRef.current && runningRef.current) iframeRef.current.contentWindow.postMessage({ __run: code }, '*');
        return;
      }
      if (d.level === '__done') { finishRun(); return; }
      setLogs((prev) => [...prev, { level: d.level, text: d.text }]);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [code, finishRun]);

  useEffect(() => () => finishRun(), [finishRun]);

  // Esc bilan yopish
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const runLocalJs = () => {
    runningRef.current = true;
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.style.display = 'none';
    iframe.srcdoc = SANDBOX_SRCDOC;
    document.body.appendChild(iframe);
    iframeRef.current = iframe;
    timerRef.current = setTimeout(() => {
      setLogs((prev) => [...prev, { level: 'error', text: 'Vaqt tugadi (4s) — kod juda uzoq ishladi. Cheksiz sikl bo\'lishi mumkin.' }]);
      finishRun();
    }, RUN_TIMEOUT);
  };

  const runRemote = async () => {
    try {
      const res = await api.post('/code/run', { language: lang, code });
      const out = [];
      if (res.compileOutput?.trim()) out.push({ level: 'error', text: res.compileOutput.trimEnd() });
      if (res.stdout?.trim()) out.push({ level: 'log', text: res.stdout.replace(/\n$/, '') });
      if (res.stderr?.trim()) out.push({ level: 'error', text: res.stderr.trimEnd() });
      if (out.length === 0) out.push({ level: 'muted', text: `(natija yo'q) — ${LANGS.find((l) => l.id === lang)?.label} muvaffaqiyatli tugadi` });
      setLogs(out);
    } catch (err) {
      setLogs([{ level: 'error', text: err.message || 'Kodni ishga tushirishda xatolik' }]);
    } finally {
      setRunning(false);
    }
  };

  const run = () => {
    if (running) return;
    setLogs([]);
    setRunning(true);
    if (isLocal) runLocalJs();
    else runRemote();
  };

  const reset = () => { setCodes((prev) => ({ ...prev, [lang]: TEMPLATES[lang] })); setLogs([]); };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl animate-[slideIn_.25s_ease]">
        <style>{`@keyframes slideIn{from{transform:translateX(24px);opacity:.6}to{transform:translateX(0);opacity:1}}`}</style>

        {/* Sarlavha (yashil) */}
        <div className="flex items-center gap-3 border-b border-line bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-4 text-white">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20"><Code2 size={22} /></span>
          <div className="flex-1">
            <p className="font-display font-semibold leading-tight">Kod maydoni</p>
            <p className="text-xs text-emerald-50">Kod yozib, shu yerda ishga tushiring</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/20"><X size={20} /></button>
        </div>

        {!enabled ? (
          /* Dasturlashga aloqasi yo'q kurs */
          <div className="flex flex-1 items-center justify-center p-8">
            <div className="max-w-sm text-center">
              <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-slate-100 text-slate-400"><Lock size={30} /></span>
              <p className="mt-4 font-display text-lg font-semibold text-ink">Bu kursda mavjud emas</p>
              <p className="mt-2 text-muted">
                Sizning kursingizda ushbu imkoniyatdan foydalana olmaysiz, bu oyna dasturlash kurslarida ishlaydi.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Boshqaruv paneli */}
            <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
              <select
                value={lang}
                onChange={(e) => { setLang(e.target.value); setLogs([]); }}
                className="rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              >
                {LANGS.map((l) => <option key={l.id} value={l.id}>{l.label}{l.local ? ' (brauzerda)' : ''}</option>)}
              </select>
              <button
                onClick={run}
                disabled={running}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
              >
                {running ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
                {running ? 'Ishlayapti...' : 'Ishga tushirish'}
              </button>
              <button onClick={() => setLogs([])} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-2 text-sm text-ink transition-colors hover:bg-slate-50" title="Konsolni tozalash">
                <Trash2 size={15} />
              </button>
              <button onClick={reset} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-2 text-sm text-ink transition-colors hover:bg-slate-50" title="Boshlang'ich kod">
                <RotateCcw size={15} />
              </button>
              <button
                onClick={() => onAskAI?.({ code, errorText: lastErrorText || undefined })}
                className={`ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors
                  ${lastErrorText ? 'bg-amber-500 text-white hover:bg-amber-600' : 'border border-primary/40 bg-indigo-50 text-primary hover:bg-indigo-100'}`}
                title="Kodni AI Ustozga yuborib, yordam so'rang"
              >
                <Sparkles size={15} /> AI Ustozdan so'rash
              </button>
            </div>

            {/* Muharrir */}
            <div className="min-h-0 flex-1 overflow-auto">
              <CodeMirror
                value={code}
                theme="light"
                extensions={extensions}
                onChange={setCode}
                basicSetup={{ lineNumbers: true, highlightActiveLine: true, tabSize: 2 }}
                style={{ fontSize: 14 }}
              />
            </div>

            {/* Konsol */}
            <div className="max-h-[38%] shrink-0 overflow-y-auto border-t border-line bg-slate-900 px-4 py-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                <Terminal size={12} /> Konsol {!isLocal && running && <span className="text-slate-400">— serverda bajarilmoqda...</span>}
              </div>
              <div className="space-y-1 font-mono text-[13px] leading-relaxed">
                {logs.length === 0 ? (
                  <p className="text-slate-600">// Natija shu yerda ko'rinadi</p>
                ) : (
                  logs.map((l, i) => (
                    <div key={i} className={`whitespace-pre-wrap break-words ${
                      l.level === 'error' ? 'text-red-400' : l.level === 'warn' ? 'text-amber-300' : l.level === 'muted' ? 'text-slate-500' : 'text-slate-100'
                    }`}>
                      {l.level === 'error' ? '⛔ ' : l.level === 'warn' ? '⚠️ ' : ''}{l.text}
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
