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

// Bitta yozuvni CSV qatoriga aylantiradi
function line(columns, row) {
  return columns
    .map((c) => cell(c.format ? c.format(row[c.key], row) : row[c.key]))
    .join(SEP);
}

// columns — [{ key, label, format? }]
// rows    — obyektlar massivi
function toCsv(columns, rows) {
  const head = columns.map((c) => cell(c.label)).join(SEP);
  return BOM + [head, ...rows.map((r) => line(columns, r))].join('\r\n') + '\r\n';
}

// Express javobiga CSV faylni yuklab berish sarlavhalari bilan yozadi.
function sendCsv(res, filename, columns, rows) {
  const safe = String(filename).replace(/[^\w.-]/g, '_');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safe}"`);
  res.send(toCsv(columns, rows));
}

// Katta hisobotlar uchun: qatorlarni bo'lak-bo'lak yozadi va butun jadvalni
// xotirada yig'maydi. Chaqiruvchi yozuvlarni bazadan porsiya-porsiya o'qib
// `write(rows)` ga uzatadi, oxirida `end()` chaqiradi.
function startCsv(res, filename, columns) {
  const safe = String(filename).replace(/[^\w.-]/g, '_');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${safe}"`);
  res.write(BOM + columns.map((c) => cell(c.label)).join(SEP) + '\r\n');
  return {
    write(rows) {
      if (!rows || rows.length === 0) return;
      res.write(rows.map((r) => line(columns, r)).join('\r\n') + '\r\n');
    },
    end() {
      res.end();
    },
  };
}

// Sanani hisobot uchun o'qiladigan ko'rinishda (2026-08-10)
function csvDate(d) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

module.exports = { toCsv, sendCsv, startCsv, csvDate };
