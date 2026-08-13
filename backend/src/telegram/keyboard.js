// Botning doimiy tugmalar paneli (reply keyboard).
//
// Buyruq yozish o'rniga foydalanuvchi xabar maydoni ostidagi tugmalarni bosadi.
// Tugma bosilganda Telegram uning MATNINI oddiy xabar sifatida yuboradi —
// shuning uchun `labelCommand()` orqali matnni buyruqqa qaytarib o'giramiz.
//
// Panel holatga qarab o'zgaradi:
//   ulanmagan   -> faqat "Hisobni ulash"
//   o'quvchi    -> kurslar, AI Ustoz, yordam
//   ustoz/admin -> yuqoridagilar + maosh, o'quvchilar
//   AI suhbati  -> "Suhbatni tugatish" birinchi qatorda
const TEACHER_ROLES = ['INSTRUCTOR', 'ADMIN'];

// Tugma yozuvlari. Kalit — ichki buyruq nomi.
const LABELS = {
  link: '🔗 Hisobni ulash',
  catalog: '🛒 Kurslar',
  courses: '📚 Kurslarim',
  ai: '🤖 AI Ustoz',
  certificates: '🎓 Sertifikatlarim',
  endChat: '✖️ Suhbatni tugatish',
  salary: '💰 Maoshim',
  students: '👥 O\'quvchilarim',
  help: '❓ Yordam',
};

// Matn -> buyruq. Tugma matni ham, "/buyruq" ham bir xil kodga boradi.
const BY_LABEL = new Map(Object.entries(LABELS).map(([cmd, label]) => [label, cmd]));

function labelCommand(text) {
  return BY_LABEL.get(String(text || '').trim()) || null;
}

// Holatga mos panel. user null bo'lsa — hisob ulanmagan.
function mainKeyboard(user, { inChat = false } = {}) {
  // Kurslar katalogi hisobsiz ham ochiq — ulanmaganga ham ko'rsatamiz
  if (!user) {
    return keyboard([[LABELS.link], [LABELS.catalog, LABELS.help]]);
  }

  const rows = [];
  if (inChat) rows.push([LABELS.endChat]);
  rows.push([LABELS.courses, LABELS.ai]);
  rows.push([LABELS.certificates, LABELS.catalog]);
  if (TEACHER_ROLES.includes(user.role)) rows.push([LABELS.salary, LABELS.students]);
  rows.push([LABELS.help]);
  return keyboard(rows);
}

function keyboard(rows) {
  return {
    reply_markup: {
      keyboard: rows.map((row) => row.map((text) => ({ text }))),
      resize_keyboard: true, // tugmalar ekranning yarmini egallamasin
      is_persistent: true, // panel yopilib qolmasin
    },
  };
}

// Panelni butunlay olib tashlash (hisob uzilganda)
const removeKeyboard = { reply_markup: { remove_keyboard: true } };

module.exports = {
  LABELS, labelCommand, mainKeyboard, removeKeyboard,
};
