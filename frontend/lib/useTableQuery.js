'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Admin roʻyxat sahifalari uchun umumiy soʻrov holati.
//
// Bitta joyda: qidiruv (debounce bilan), filtrlar, sahifalash va
// manzil qatori (URL) bilan sinxronlash. Shu tufayli sahifani yangilaganda
// yoki havolani ulashganda filtrlar saqlanib qoladi.
//
// Ishlatilishi:
//   const t = useTableQuery({ filters: { q: '', role: '' } });
//   api.get(`/admin/users?${t.params}`)
//   <DataToolbar search={t.search} onSearch={t.setSearch} ... />
//
// Eslatma: useSearchParams oʻrniga window.location ishlatilgan — bu sahifalar
// baribir faqat brauzerda ishlaydi (RequireAuth), shuning uchun Suspense
// chegarasi talab qilinmaydi va ortiqcha qayta render boʻlmaydi.
export function useTableQuery({
  filters = {},
  perPage = 20,
  debounceMs = 400,
  searchKey = 'q',
  syncUrl = true,
} = {}) {
  // Boshlangʻich qiymatlar birinchi renderdayoq qotib qoladi
  const defaultsRef = useRef(filters);
  const defaults = defaultsRef.current;

  const readFromUrl = () => {
    if (typeof window === 'undefined') return { values: defaults, page: 1 };
    const sp = new URLSearchParams(window.location.search);
    const values = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const v = sp.get(key);
      if (v !== null) values[key] = v;
    }
    const p = Number(sp.get('page'));
    return { values, page: Number.isInteger(p) && p > 0 ? p : 1 };
  };

  const [initial] = useState(readFromUrl);
  const [values, setValues] = useState(initial.values);
  const [page, setPage] = useState(initial.page);
  const [search, setSearch] = useState(String(initial.values[searchKey] ?? ''));

  // Yozishni toʻxtatgandan keyin qidiramiz — har harfda soʻrov ketmaydi
  useEffect(() => {
    const next = search.trim();
    if (next === (values[searchKey] ?? '')) return;
    const t = setTimeout(() => {
      setValues((v) => ({ ...v, [searchKey]: next }));
      setPage(1);
    }, debounceMs);
    return () => clearTimeout(t);
  }, [search, values, searchKey, debounceMs]);

  // Manzil qatorini yangilaymiz — faqat sukut qiymatidan farq qilganlarini.
  // Begona parametrlarga (masalan sahifa yorligʻi ?tab=) tegmaymiz: jadval
  // oʻzi egalik qiladigan kalitlarni va pageʼni almashtiradi, xolos.
  useEffect(() => {
    if (!syncUrl || typeof window === 'undefined') return;
    const sp = new URLSearchParams(window.location.search);
    for (const [k, v] of Object.entries(values)) {
      if (v !== '' && v != null && v !== false && String(v) !== String(defaults[k])) {
        sp.set(k, String(v));
      } else {
        sp.delete(k);
      }
    }
    if (page > 1) sp.set('page', String(page));
    else sp.delete('page');
    const qs = sp.toString();
    window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
  }, [values, page, syncUrl, defaults]);

  // Filtrni oʻzgartirish — har doim birinchi sahifaga qaytaramiz
  const set = useCallback((key, value) => {
    setValues((v) => ({ ...v, [key]: value }));
    setPage(1);
  }, []);

  const reset = useCallback(() => {
    setValues(defaults);
    setSearch(String(defaults[searchKey] ?? ''));
    setPage(1);
  }, [defaults, searchKey]);

  // Sahifadagi oxirgi yozuv oʻchirilganda boʻsh sahifada qolmaslik uchun
  const pageBackIfEmpty = useCallback((remainingOnPage, reload) => {
    if (remainingOnPage <= 1 && page > 1) setPage((p) => p - 1);
    else reload();
  }, [page]);

  // API uchun tayyor soʻrov qatori
  const params = useMemo(() => {
    const sp = new URLSearchParams({ page: String(page), limit: String(perPage) });
    for (const [k, v] of Object.entries(values)) {
      if (v === '' || v == null || v === false) continue;
      sp.set(k, v === true ? '1' : String(v));
    }
    return sp.toString();
  }, [values, page, perPage]);

  const hasFilters = useMemo(
    () => Object.keys(defaults).some((k) => String(values[k] ?? '') !== String(defaults[k] ?? '')),
    [values, defaults],
  );

  return { values, set, page, setPage, search, setSearch, params, hasFilters, reset, pageBackIfEmpty };
}
