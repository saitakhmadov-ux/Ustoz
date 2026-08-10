// CSV eksport yordamchisi.
//
// Excel o'zbekcha harflarni to'g'ri ochishi uchun fayl boshiga UTF-8 BOM
// qo'yiladi. Ajratgich sifatida nuqtali vergul (;) ishlatiladi — Excel'ning
// mintaqaviy sozlamalarida vergul o'nlik ajratgich bo'lgani uchun ustunlar
// vergul bilan to'g'ri bo'linmaydi.

const BOM = '﻿';
const SEP = ';';

// Bitta katakni qalqonlash: qo'shtirnoq, ajratgich yoki yangi qator bo'lsa
// qo'shtirnoq ichiga olinadi.
function cell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes('"') || s.includes(SEP) || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// columns — [{ key, label, format? }]
// rows    — obyektlar massivi
function toCsv(columns, rows) {
  const head = columns.map((c) => cell(c.label)).join(SEP);
  const body = rows.map((r) => columns
    .map((c) => cell(c.format ? c.format(r[c.key], r) : r[c.key]))
    .join(SEP));
  return BOM + [head, ...body].join('\r\n') + '\r\n';
}

// Express javobiga CSV faylni yuklab berish sarlavhalari bilan yozadi.
function sendCsv(res, filename, columns, rows) {
  const safe = String(filename).replace(/[^\w.-]/g, '_');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safe}"`);
  res.send(toCsv(columns, rows));
}

// Sanani hisobot uchun o'qiladigan ko'rinishda (2026-08-10)
function csvDate(d) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

module.exports = { toCsv, sendCsv, csvDate };
