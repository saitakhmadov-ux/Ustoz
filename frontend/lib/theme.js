// Tema (yorug'/kecha) boshqaruvi.
//
// Tanlov <html data-theme="..."> orqali qoʻllaniladi — globals.css dagi
// [data-theme='dark'] bloki barcha rang oʻzgaruvchilarini almashtiradi.
//
// Uch holat bor: 'light', 'dark' va 'system' (qurilma sozlamasiga ergashadi).
// Standart holat — 'system'.

export const THEME_KEY = 'ustoz-theme';
export const THEMES = ['light', 'dark', 'system'];

// Sahifa chizilishidan OLDIN <head> da ishlaydigan skript. Boʻlmasa, kecha
// rejimida sahifa bir lahza oq boʻlib chaqnaydi (FOUC).
// Diqqat: bu matn brauzerga oʻzgarishsiz yuboriladi — qisqa va bogʻliqliksiz.
export const THEME_INIT_SCRIPT = `(function(){try{
var t=localStorage.getItem('${THEME_KEY}')||'system';
var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
if(d)document.documentElement.setAttribute('data-theme','dark');
}catch(e){}})();`;

// Saqlangan tanlovni oʻqiydi ('system' — standart)
export function getStoredTheme() {
  if (typeof window === 'undefined') return 'system';
  const t = localStorage.getItem(THEME_KEY);
  return THEMES.includes(t) ? t : 'system';
}

// Tanlovni <html> ga qoʻllaydi
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

// Tanlovni saqlaydi va darhol qoʻllaydi
export function setTheme(theme) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}
