'use client';

// Tasdiqlash kodi bilan ishlaydigan sahifalar uchun umumiy boʻlaklar
// (email tasdiqlash va parolni tiklash ikkalasi ham shulardan foydalanadi).

import { useCallback, useEffect, useState } from 'react';

// 6 xonali kod maydoni — faqat raqam qabul qiladi
export function CodeInput({ value, onChange, id = 'code', autoFocus = false }) {
  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="one-time-code"
      // eslint-disable-next-line jsx-a11y/no-autofocus
      autoFocus={autoFocus}
      maxLength={6}
      className="input text-center font-mono text-2xl tracking-[0.5em]"
      placeholder="000000"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      required
    />
  );
}

// "Kodni qayta yuborish" tugmasi uchun sanoq — spamning oldini oladi
export function useResendTimer(seconds = 60) {
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (left <= 0) return undefined;
    const t = setInterval(() => setLeft((v) => (v > 0 ? v - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [left]);

  const start = useCallback(() => setLeft(seconds), [seconds]);
  return { left, start, ready: left <= 0 };
}

// Manzil qatoridan parametr olish. useSearchParams oʻrniga — bu sahifalar
// faqat brauzerda ishlaydi va Suspense chegarasi talab qilinmasin.
export function useQueryParam(name) {
  const [value, setValue] = useState('');
  useEffect(() => {
    setValue(new URLSearchParams(window.location.search).get(name) || '');
  }, [name]);
  return [value, setValue];
}
