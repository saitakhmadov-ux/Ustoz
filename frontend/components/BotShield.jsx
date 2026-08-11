'use client';

// Formalarni botlardan himoyalash uchun uch qatlam.
// Backend (utils/humanCheck.js) shu uchtasini tekshiradi:
//   captchaToken — Cloudflare Turnstile
//   website      — honeypot: ko'rinmas maydon, faqat bot to'ldiradi
//   formMs       — forma ochilgandan yuborilgunicha o'tgan vaqt
//
// NEXT_PUBLIC_TURNSTILE_SITE_KEY qo'yilmagan bo'lsa vidjet ko'rsatilmaydi va
// backend ham tekshiruvni o'tkazib yuboradi — lokal ishlab chiqish uchun.

import { useCallback, useEffect, useRef, useState } from 'react';

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

// Skriptni bir marta yuklaymiz (bir nechta forma bo'lsa ham)
let scriptPromise = null;
function loadTurnstile() {
  if (typeof window === 'undefined') return Promise.reject(new Error('server'));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(window.turnstile);
    s.onerror = () => reject(new Error('Turnstile yuklanmadi'));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

// Forma holati: token, honeypot va vaqt hisoblagichi
export function useBotShield() {
  const [captchaToken, setCaptchaToken] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const startedAt = useRef(Date.now());

  // Har bir yuborishda backendga qo'shiladigan maydonlar
  const fields = useCallback(() => ({
    captchaToken,
    website: honeypot,
    formMs: Date.now() - startedAt.current,
  }), [captchaToken, honeypot]);

  return {
    fields,
    captchaToken,
    setCaptchaToken,
    honeypot,
    setHoneypot,
    // CAPTCHA yoqilgan bo'lsa token kelmaguncha tugma bloklanadi
    ready: !SITE_KEY || Boolean(captchaToken),
    enabled: Boolean(SITE_KEY),
  };
}

// Honeypot maydoni + Turnstile vidjeti
export default function BotShield({ shield }) {
  const boxRef = useRef(null);
  const widgetId = useRef(null);
  const [failed, setFailed] = useState(false);
  const { setCaptchaToken, honeypot, setHoneypot } = shield;

  useEffect(() => {
    if (!SITE_KEY || !boxRef.current) return undefined;
    let cancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !boxRef.current || widgetId.current !== null) return;
        widgetId.current = turnstile.render(boxRef.current, {
          sitekey: SITE_KEY,
          language: 'uz',
          callback: (token) => setCaptchaToken(token),
          'expired-callback': () => setCaptchaToken(''),
          'error-callback': () => { setCaptchaToken(''); setFailed(true); },
        });
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      if (widgetId.current !== null && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch { /* e'tiborsiz */ }
        widgetId.current = null;
      }
    };
  }, [setCaptchaToken]);

  return (
    <>
      {/* Honeypot — ekranda yo'q, ammo displey:none emas: ba'zi botlar
          yashirin maydonni o'tkazib yuboradi, shuning uchun ko'rinishdan
          chiqarib qo'yamiz. Skrinrider uchun aria-hidden va tabIndex -1. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor="website">Veb-sayt (to'ldirmang)</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {SITE_KEY && (
        <div className="mb-4">
          <div ref={boxRef} />
          {failed && (
            <p className="mt-2 text-xs text-amber-700">
              Tekshiruv vidjetini yuklab bo'lmadi. Sahifani yangilab ko'ring.
            </p>
          )}
        </div>
      )}
    </>
  );
}
