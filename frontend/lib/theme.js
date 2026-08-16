// Tema (yorug'/kecha) boshqaruvi.
//
// Tanlov <html data-theme="..."> orqali qo'llaniladi — globals.css dagi
// [data-theme='dark'] bloki barcha rang o'zgaruvchilarini almashtiradi.
//
// Uch holat bor: 'light', 'dark' va 'system' (qurilma sozlamasiga ergashadi).
// Standart holat — 'system'.

export const THEME_KEY = 'ustoz-theme';
export const THEMES = ['light', 'dark', 'system'];

// Sahifa chizilishidan OLDIN <head> da ishlaydigan skript. Bo'lmasa, kecha
// rejimida sahifa bir lahza oq bo'lib chaqnaydi (FOUC).
// Diqqat: bu matn brauzerga o'zgarishsiz yuboriladi — qisqa va bog'liqliksiz.
export const THEME_INIT_SCRIPT = `(function(){try{
var t=localStorage.getItem('${THEME_KEY}')||'system';
var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
if(d)document.documentElement.setAttribute('data-theme','dark');
}catch(e){}})();`;

// Saqlangan tanlovni o'qiydi ('system' — standart)
export function getStoredTheme() {
  if (typeof window === 'undefined') return 'system';
  const t = localStorage.getItem(THEME_KEY);
  return THEMES.includes(t) ? t : 'system';
}

// Tanlovni <html> ga qo'llaydi
export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const dark = theme === 'dark'
    || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  if (dark) {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

// Tanlovni saqlaydi va darhol qo'llaydi
export function setTheme(theme) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}
