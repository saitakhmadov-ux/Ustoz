'use client';

import { useEffect, useRef, useState } from 'react';
import { Bot, Send, X, User, Copy, Check, Sparkles, AlertCircle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { api } from '@/lib/api';

// Xabar matnini ```code``` bloklari bilan yengil render qiladi (markdown kutubxonasisiz).
function RichText({ text }) {
  const parts = [];
  const re = /```(\w+)?\n?([\s\S]*?)```/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', value: text.slice(last, m.index) });
    parts.push({ type: 'code', value: m[2].replace(/\n$/, '') });
    last = re.lastIndex;
  }
  if (last < text.length) parts.push({ type: 'text', value: text.slice(last) });

  return (
    <>
      {parts.map((p, i) =>
        p.type === 'code' ? <CodeBlock key={i} code={p.value} /> : (
          <p key={i} className="whitespace-pre-wrap leading-relaxed">{p.value}</p>
        )
      )}
    </>
  );
}

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="my-2 overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-700 px-3 py-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-subtle">Kod</span>
        <button onClick={copy} className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white">
          {copied ? <><Check size={12} /> Nusxalandi</> : <><Copy size={12} /> Nusxalash</>}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[13px] leading-relaxed text-slate-100"><code>{code}</code></pre>
    </div>
  );
}

// Kurs-doirasidagi AI Ustoz chat modali.
// props: open, onClose, slug, lessonId, seed({code, errorText}) — playground'dan uzatilgan kontekst.
export default function AIChat({ open, onClose, slug, lessonId, seed }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);
  const seedSent = useRef(null);

  // Xabar yuborish. extra = { code, errorText } — playground kontekstini biriktiradi.
  const send = async (rawText, extra = {}) => {
    const text = (rawText ?? input).trim();
    if (!text || loading) return;
    setInput('');
    setError('');
    const history = messages.map((mm) => ({ role: mm.role, text: mm.text }));
    // Foydalanuvchi xabarini ko'rsatishda kod/xatoni ham ko'rsatamiz
    let shown = text;
    if (extra.code) shown += `\n\n\`\`\`javascript\n${extra.code}\n\`\`\``;
    if (extra.errorText) shown += `\n\n⚠️ Xato: ${extra.errorText}`;
    setMessages((prev) => [...prev, { role: 'user', text: shown }]);
    setLoading(true);
    try {
      const res = await api.post(`/learn/${slug}/mentor`, {
        message: text,
        lessonId,
        history,
        code: extra.code,
        errorText: extra.errorText,
      });
      setMessages((prev) => [...prev, { role: 'model', text: res.answer, usageId: res.usageId || null, feedback: null }]);
    } catch (err) {
      setError(err.message || 'Xatolik yuz berdi');
    } finally {
      setLoading(false);
    }
  };

  // Javobga 👍/👎 baho berish
  const sendFeedback = async (idx, helpful) => {
    const msg = messages[idx];
    if (!msg?.usageId || msg.feedback !== null) return;
    setMessages((prev) => prev.map((m, i) => (i === idx ? { ...m, feedback: helpful } : m)));
    try {
      await api.post('/ai/feedback', { usageId: msg.usageId, helpful });
    } catch {
      // baho yuborilmasa jimgina qoldiramiz (UX buzilmasin)
    }
  };

  // Playground'dan seed kelsa — bir marta avtomatik yuborish
  useEffect(() => {
    if (!open || !seed) return;
    const sig = JSON.stringify(seed);
    if (seedSent.current === sig) return;
    seedSent.current = sig;
    const q = seed.errorText
      ? 'Kodimda xato bor. Sababini tushuntirib, to\'g\'rilangan variantini bering.'
      : 'Ushbu kodni tekshirib, yaxshilash bo\'yicha maslahat bering.';
    send(q, { code: seed.code, errorText: seed.errorText });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, seed]);

  // Yangi xabarda pastga scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // Esc bilan yopish
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      {/* Fon */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative flex h-full w-full max-w-lg flex-col bg-surface shadow-2xl animate-[slideIn_.25s_ease]">
        <style>{`@keyframes slideIn{from{transform:translateX(24px);opacity:.6}to{transform:translateX(0);opacity:1}}`}</style>

        {/* Sarlavha */}
        <div className="flex items-center gap-3 border-b border-line bg-gradient-to-r from-band-from to-band-to px-5 py-4 text-white">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20"><Bot size={22} /></span>
          <div className="flex-1">
            <p className="font-display font-semibold leading-tight">AI Ustoz</p>
            <p className="text-xs text-indigo-100">Kurs bo'yicha 24/7 yordamchi</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/20"><X size={20} /></button>
        </div>

        {/* Xabarlar */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-5">
          {messages.length === 0 && !loading && (
            <div className="mx-auto mt-6 max-w-sm text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-indigo-100 text-primary"><Sparkles size={26} /></span>
              <p className="mt-3 font-display text-lg font-semibold">Savolingiz bormi?</p>
              <p className="mt-1 text-sm text-muted">
                Kurs mavzusi, kod yoki xatolik bo'yicha bemalol so'rang. Men shu kurs doirasida yordam beraman.
              </p>
              <div className="mt-4 space-y-2 text-left">
                {['Bu darsdagi tushunchani sodda tilda tushuntiring', 'Kodimdagi xatoni qanday tuzataman?', 'Bu mavzu bo\'yicha mashq bering'].map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-left text-sm transition-colors hover:border-primary hover:bg-indigo-50/50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((mm, i) => (
            <div key={i} className={`flex gap-2.5 ${mm.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${mm.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-100 text-primary'}`}>
                {mm.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </span>
              <div className="max-w-[85%]">
                <div className={`rounded-2xl px-3.5 py-2.5 text-[14px] ${mm.role === 'user' ? 'bg-primary text-on-primary' : 'border border-line bg-surface text-ink'}`}>
                  <RichText text={mm.text} />
                </div>
                {/* Foydalilik bahosi — faqat model javoblarida */}
                {mm.role === 'model' && mm.usageId && (
                  <div className="mt-1.5 flex items-center gap-1.5 pl-1">
                    {mm.feedback === null ? (
                      <>
                        <span className="text-[11px] text-muted">Foydali bo'ldimi?</span>
                        <button onClick={() => sendFeedback(i, true)} className="rounded-md p-1 text-subtle transition-colors hover:bg-emerald-50 hover:text-emerald-600" title="Ha, foydali">
                          <ThumbsUp size={14} />
                        </button>
                        <button onClick={() => sendFeedback(i, false)} className="rounded-md p-1 text-subtle transition-colors hover:bg-red-50 hover:text-red-500" title="Yo'q">
                          <ThumbsDown size={14} />
                        </button>
                      </>
                    ) : (
                      <span className={`inline-flex items-center gap-1 text-[11px] ${mm.feedback ? 'text-emerald-600' : 'text-muted'}`}>
                        {mm.feedback ? <><ThumbsUp size={12} /> Rahmat!</> : <><ThumbsDown size={12} /> Baho uchun rahmat</>}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-100 text-primary"><Bot size={16} /></span>
              <div className="rounded-2xl border border-line bg-surface px-4 py-3">
                <span className="flex gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                </span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
            </div>
          )}
        </div>

        {/* Kiritish */}
        <div className="border-t border-line bg-surface p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              placeholder="Savolingizni yozing..."
              className="max-h-32 flex-1 resize-none rounded-xl border border-line px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-on-primary transition-colors hover:bg-primary-dark disabled:opacity-50"
            >
              <Send size={17} />
            </button>
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-muted">AI xato qilishi mumkin — muhim narsalarni tekshiring.</p>
        </div>
      </div>
    </div>
  );
}
