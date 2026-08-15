'use client';

// Ro'yxatdan o'tishni Telegram orqali tasdiqlash.
//
// Oqim: "Telegram orqali tasdiqlash" -> server bir martalik t.me havolasini
// beradi -> odam botda "Start" bosadi -> shu sahifa har necha soniyada
// "tasdiqlandimi?" deb so'rab turadi -> tasdiqlangach seans o'zi boshlanadi.
//
// Nega kerak: emailga kod yuborish kunlik chegarali va xat spamga tushishi
// mumkin. Telegram bepul, tezkor va odam ayni paytda botga ham ulanadi.

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Send, ExternalLink } from 'lucide-react';
import { api } from '@/lib/api';

const POLL_MS = 3000;
// Cheksiz so'rab turmaymiz — 5 daqiqadan keyin "Tekshirish" tugmasi qoladi
const POLL_LIMIT = Math.round((5 * 60 * 1000) / POLL_MS);

export default function TelegramVerify({ pendingToken, onDone }) {
  const [link, setLink] = useState(null); // { url, pollKey, botUsername }
  const [starting, setStarting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  const pollsLeft = useRef(0);

  // Bir marta so'rov: tasdiqlandimi? Ha bo'lsa seansni boshlaymiz.
  // Qaytaradi: true — javob keldi va kutishni to'xtatish kerak.
  const checkOnce = useCallback(async (pollKey) => {
    const res = await api.post('/auth/telegram-verify/status', { pollKey }, { auth: false });
    if (res.token) {
      onDone(res);
      return true;
    }
    if (res.status === 'expired') {
      setLink(null);
      setError('Havola muddati tugadi. Qaytadan urinib ko\'ring.');
      return true;
    }
    return false;
  }, [onDone]);

  // Havola ochilgandan keyin javobni kutib turamiz
  useEffect(() => {
    if (!link?.pollKey) return undefined;
    pollsLeft.current = POLL_LIMIT;

    const timer = setInterval(async () => {
      if (pollsLeft.current <= 0) {
        clearInterval(timer);
        return;
      }
      pollsLeft.current -= 1;
      try {
        if (await checkOnce(link.pollKey)) clearInterval(timer);
      } catch {
        // Tarmoq uzilishi — keyingi urinishda davom etadi
      }
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [link, checkOnce]);

  const start = async () => {
    setError('');
    setStarting(true);
    try {
      const res = await api.post(
        '/auth/telegram-verify/start',
        { pendingToken },
        { auth: false },
      );
      setLink(res);
      // Telegram'ni yangi oynada ochamiz — bu sahifa javobni kutib qoladi.
      // Brauzer bloklasa, quyidagi havola qo'lda bosiladi.
      window.open(res.url, '_blank', 'noopener');
    } catch (err) {
      setError(err.message);
      // Bot sozlanmagan bo'lsa tugmani qayta ko'rsatishdan ma'no yo'q
      if (/mavjud emas|sozlanmagan/i.test(err.message)) setUnavailable(true);
    } finally {
      setStarting(false);
    }
  };

  const checkNow = async () => {
    if (!link?.pollKey) return;
    setError('');
    setChecking(true);
    try {
      const done = await checkOnce(link.pollKey);
      if (!done) setError('Hali tasdiqlanmadi — botda "Start" tugmasini bosing.');
      else pollsLeft.current = 0;
    } catch (err) {
      setError(err.message);
    } finally {
      setChecking(false);
    }
  };

  if (unavailable) return null;

  return (
    <div className="mt-6 border-t border-line pt-6">
      <p className="mb-3 text-center text-xs text-muted">
        Kod kelmadimi? Telegram orqali tezroq tasdiqlang
      </p>

      {error && (
        <div className="mb-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
          {error}
        </div>
      )}

      {!link ? (
        <button type="button" onClick={start} disabled={starting} className="btn-outline w-full">
          {starting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          Telegram orqali tasdiqlash
        </button>
      ) : (
        <div className="rounded-xl border border-line bg-slate-50 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium">
            <Loader2 size={15} className="animate-spin text-primary" />
            Telegram javobini kutmoqdamiz...
          </p>
          <p className="mt-2 text-xs text-muted">
            Ochilgan botda <b>“Start”</b> tugmasini bosing — hisobingiz shu zahoti
            tasdiqlanadi va bu sahifa o'zi davom etadi.
          </p>

          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <ExternalLink size={13} />
            Bot ochilmadimi? Havolani bosing
          </a>

          <button
            type="button"
            onClick={checkNow}
            disabled={checking}
            className="btn-outline mt-3 w-full"
          >
            {checking && <Loader2 size={15} className="animate-spin" />}
            Tekshirish
          </button>
        </div>
      )}
    </div>
  );
}
