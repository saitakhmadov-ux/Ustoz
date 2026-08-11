'use client';

// Formalarni botlardan himoyalash uchun uch qatlam.
// Backend (utils/humanCheck.js) shu uchtasini tekshiradi:
//   captchaToken — Cloudflare Turnstile
//   website      — honeypot: ko'rinmas maydon, faqat bot to'ldiradi
//   formMs       — forma ochilgandan yuborilgunicha o'tgan vaqt
//
// Ommaviy kalit admin panelidan (/api/home/security) olinadi — shuning uchun
// CAPTCHA'ni yoqish uchun saytni qayta joylash shart emas.
// NEXT_PUBLIC_TURNSTILE_SITE_KEY qo'yilgan bo'lsa, u ustun turadi.
// Kalit umuman bo'lmasa vidjet ko'rsatilmaydi va backend ham tekshiruvni
// o'tkazib yuboradi — lokal ishlab chiqish uchun.

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';

const ENV_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const KEY_TIMEOUT_MS = 5000;

// Kalitni sahifa umri davomida bir marta so'raymiz (bir nechta forma bo'lsa ham).
// Server javob bermasa yoki kechiksa — kalitsiz davom etamiz, aks holda
// foydalanuvchi formani umuman yubora olmay qoladi.
let keyPromise = null;
function fetchSiteKey() {
  if (ENV_SITE_KEY) return Promise.resolve(ENV_SITE_KEY);
  if (keyPromise) return keyPromise;

  keyPromise = Promise.race([
    api.get('/home/security', { auth: false }).then((res) => res?.security?.siteKey || ''),
    new Promise((resolve) => setTimeout(() => resolve(''), KEY_TIMEOUT_MS)),
  ]).catch(() => '');
  return keyPromise;
}

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
  // null — kalit hali noma'lum; '' — CAPTCHA o'chirilgan
  const [siteKey, setSiteKey] = useState(ENV_SITE_KEY || null);

  useEffect(() => {
    if (ENV_SITE_KEY) return undefined;
    let alive = true;
    fetchSiteKey().then((key) => { if (alive) setSiteKey(key); });
    return () => { alive = false; };
  }, []);

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
    siteKey,
    // Kalit aniqlanmaguncha va CAPTCHA yoqilgan bo'lsa token kelmaguncha
    // tugma bloklanadi
    ready: siteKey !== null && (!siteKey || Boolean(captchaToken)),
    enabled: Boolean(siteKey),
  };
}

// Honeypot maydoni + Turnstile vidjeti
export default function BotShield({ shield }) {
  const boxRef = useRef(null);
  const widgetId = useRef(null);
  const [failed, setFailed] = useState(false);
  const { setCaptchaToken, honeypot, setHoneypot, siteKey } = shield;

  useEffect(() => {
    if (!siteKey || !boxRef.current) return undefined;
    let cancelled = false;

    loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !boxRef.current || widgetId.current !== null) return;
        widgetId.current = turnstile.render(boxRef.current, {
          sitekey: siteKey,
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
  }, [setCaptchaToken, siteKey]);

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

      {siteKey && (
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
