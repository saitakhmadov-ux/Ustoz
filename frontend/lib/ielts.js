// IELTS moduli uchun umumiy yordamchilar (brauzer tomoni).
//
// Soʻz/belgi sanash qoidasi backend/src/utils/ielts.js bilan AYNAN bir xil —
// aks holda ekranda koʻringan son server saqlagan sondan farq qiladi.

export const MODES = [
  {
    id: 'ACADEMIC_T1',
    label: 'Writing Task 1',
    sub: 'Academic',
    hint: 'Diagramma, jadval, jarayon yoki xaritani tasvirlash',
    minWords: 150,
    minutes: 20,
  },
  {
    id: 'GENERAL_T1',
    label: 'Writing Task 1',
    sub: 'General Training',
    hint: 'Rasmiy, yarim rasmiy yoki norasmiy xat yozish',
    minWords: 150,
    minutes: 20,
  },
  {
    id: 'TASK2',
    label: 'Writing Task 2',
    sub: 'Essay',
    hint: 'Fikr, muhokama, afzallik/kamchilik va muammo/yechim esselari',
    minWords: 250,
    minutes: 40,
  },
  {
    id: 'TYPING',
    label: 'Typing Practice',
    sub: 'Paragraph',
    hint: 'IELTS uslubidagi inglizcha paragrafni koʻchirib yozish',
  },
  {
    id: 'VOCAB',
    label: 'Vocabulary Practice',
    sub: 'Academic words',
    hint: 'IELTS akademik lugʻatini terish (Easy / Medium / Hard)',
  },
];

export const LEVELS = [
  { id: 'EASY', label: 'Easy' },
  { id: 'MEDIUM', label: 'Medium' },
  { id: 'HARD', label: 'Hard' },
];

// IELTS qoidasi: soʻzlar boʻsh joy bilan ajratiladi (defisli soʻz — bitta soʻz)
export function countWords(text) {
  const s = String(text || '').trim();
  if (!s) return 0;
  return s.split(/\s+/).filter(Boolean).length;
}

export const countChars = (text) => String(text || '').length;

// 1234 -> "20:34"
export function formatTime(totalSec) {
  const s = Math.max(0, Math.round(totalSec));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// Diagramma ranglari — saytning mavjud palitrasi
export const CHART_COLORS = ['#4f46e5', '#059669', '#f59e0b', '#e11d48', '#0ea5e9', '#7c3aed'];

// Oʻq uchun "qulay" maksimal qiymat (10, 25, 50, 100, 250 ...)
export function niceMax(value) {
  if (!(value > 0)) return 10;
  const exp = 10 ** Math.floor(Math.log10(value));
  const norm = value / exp;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10;
  return step * exp;
}

// Qoralamani saqlash kaliti — sahifa yangilansa ham matn yoʻqolmasin
export const draftKey = (taskId) => `ielts_draft_${taskId}`;
