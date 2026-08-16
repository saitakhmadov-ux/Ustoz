'use client';

import { useState } from 'react';
import { Image as ImageIcon, Link2, Check, Send, Loader2 } from 'lucide-react';
import { SITE_NAME, formatDateUz } from '@/lib/constants';

// Ijtimoiy tarmoq uchun ulashish kartasi (1080×1080).
//
// Karta SVG sifatida yasaladi, so'ng canvas orqali PNG ga o'giriladi —
// hech qanday tashqi kutubxona kerak emas.
//
// DIQQAT: SVG canvas ichida chizilganda veb-shriftlar (Google Fonts)
// mavjud bo'lmaydi, faqat tizim shriftlari ishlaydi. Shuning uchun bu yerda
// ataylab tizim shrift stegi ishlatilgan — aks holda karta zaxira shriftga
// tushib, kutilmagan ko'rinishga kirardi.
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const SIZE = 1080;

// XML uchun xavfsiz matn
function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Matnni belgilangan kenglikka sig'dirib qatorlarga bo'ladi.
// Canvas o'lchovisiz taxminiy hisob: belgi kengligi ≈ 0.52 × shrift o'lchami.
function wrap(text, fontSize, maxWidth, maxLines = 3) {
  const perLine = Math.max(8, Math.floor(maxWidth / (fontSize * 0.52)));
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > perLine && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines) break;
    } else {
      cur = next;
    }
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, perLine - 1)}…`;
  }
  return lines;
}

function buildSvg({ fullName, courseTitle, serial, issuedAt, host }) {
  const date = formatDateUz(issuedAt);
  const titleLines = wrap(courseTitle, 62, 800, 3);
  // Qator qadami 82px — 62px shrift uchun tinch oraliq (bbox balandligi ~83px).
  // Blok markazi 470 da qoladi, qatorlar soni qancha bo'lishidan qat'i nazar.
  const titleStartY = 470 - (titleLines.length - 1) * 41;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1b1748"/>
      <stop offset="0.55" stop-color="#241d5e"/>
      <stop offset="1" stop-color="#141130"/>
    </linearGradient>
    <pattern id="grid" width="72" height="72" patternUnits="userSpaceOnUse">
      <g stroke="#a8842c" fill="none" stroke-width="1" opacity="0.13">
        <rect x="18" y="18" width="36" height="36"/>
        <rect x="18" y="18" width="36" height="36" transform="rotate(45 36 36)"/>
      </g>
    </pattern>
  </defs>

  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#grid)"/>
  <rect x="44" y="44" width="${SIZE - 88}" height="${SIZE - 88}" fill="none" stroke="#a8842c" stroke-width="2" opacity="0.75"/>
  <rect x="56" y="56" width="${SIZE - 112}" height="${SIZE - 112}" fill="none" stroke="#a8842c" stroke-width="1" opacity="0.35"/>

  <text x="${SIZE / 2}" y="150" text-anchor="middle" font-family="${FONT}" font-size="30" font-weight="700"
        letter-spacing="14" fill="#c9b06a">${esc(SITE_NAME.toUpperCase())}</text>
  <text x="${SIZE / 2}" y="192" text-anchor="middle" font-family="${FONT}" font-size="19"
        letter-spacing="6" fill="#8f8ab8">ONLAYN IT TA'LIM PLATFORMASI</text>

  <g transform="translate(${SIZE / 2} 268)" stroke="#a8842c" fill="none">
    <line x1="-190" y1="0" x2="-30" y2="0" stroke-width="1.5" opacity="0.6"/>
    <line x1="30" y1="0" x2="190" y2="0" stroke-width="1.5" opacity="0.6"/>
    <rect x="-15" y="-15" width="30" height="30" stroke-width="2"/>
    <rect x="-15" y="-15" width="30" height="30" stroke-width="2" transform="rotate(45)"/>
  </g>

  <text x="${SIZE / 2}" y="352" text-anchor="middle" font-family="${FONT}" font-size="26"
        letter-spacing="8" fill="#9d97c9">KURSNI TAMOMLADIM</text>

  ${titleLines.map((l, i) => `<text x="${SIZE / 2}" y="${titleStartY + i * 82}" text-anchor="middle" font-family="${FONT}" font-size="62" font-weight="700" fill="#ffffff">${esc(l)}</text>`).join('\n  ')}

  <line x1="340" y1="606" x2="740" y2="606" stroke="#a8842c" stroke-width="1.5" opacity="0.7"/>

  <text x="${SIZE / 2}" y="672" text-anchor="middle" font-family="${FONT}" font-size="22"
        letter-spacing="5" fill="#8f8ab8">SERTIFIKAT EGASI</text>
  <text x="${SIZE / 2}" y="736" text-anchor="middle" font-family="${FONT}" font-size="52" font-weight="600"
        fill="#e8e4ff">${esc(fullName)}</text>

  <g transform="translate(${SIZE / 2} 866)" stroke="#a8842c" fill="none" opacity="0.9">
    <circle r="62" stroke-width="1.5" opacity="0.5"/>
    <circle r="44" stroke-width="2"/>
    <rect x="-19" y="-19" width="38" height="38" stroke-width="1.8"/>
    <rect x="-19" y="-19" width="38" height="38" stroke-width="1.8" transform="rotate(45)"/>
    <circle r="4" fill="#a8842c" stroke="none"/>
  </g>

  <text x="80" y="${SIZE - 74}" font-family="${FONT}" font-size="21" fill="#7d78a8">${esc(date)}</text>
  <text x="${SIZE / 2}" y="${SIZE - 74}" text-anchor="middle" font-family="${FONT}" font-size="21"
        font-weight="600" letter-spacing="2" fill="#c9b06a">${esc(serial)}</text>
  <text x="${SIZE - 80}" y="${SIZE - 74}" text-anchor="end" font-family="${FONT}" font-size="21" fill="#7d78a8">${esc(host)}</text>
</svg>`;
}

// SVG matnini PNG blob ga o'giradi (canvas orqali)
function svgToPng(svg) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, SIZE, SIZE);
      URL.revokeObjectURL(url);
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG yasalmadi'))), 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Kartani chizib bo\'lmadi')); };
    img.src = url;
  });
}

export default function ShareCard({ cert, verifyUrl }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState('');

  const host = typeof window !== 'undefined' ? window.location.host : '';
  const svg = buildSvg({
    fullName: cert.user.fullName,
    courseTitle: cert.course.title,
    serial: cert.serial,
    issuedAt: cert.issuedAt,
    host,
  });

  const download = async () => {
    setErr('');
    setBusy(true);
    try {
      const blob = await svgToPng(svg);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ustoz-sertifikat-${cert.serial}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErr('Havolani nusxalab bo\'lmadi');
    }
  };

  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(verifyUrl)}`
    + `&text=${encodeURIComponent(`«${cert.course.title}» kursini tamomladim! ${SITE_NAME}`)}`;

  return (
    <div className="no-print">
      {/* Ko'rinish — haqiqiy kartaning kichraytirilgani */}
      <div
        className="mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl shadow-card"
        // Karta SVG si — o'zimiz yasagan, foydalanuvchi kiritmasi emas
        dangerouslySetInnerHTML={{ __html: svg.replace(`width="${SIZE}" height="${SIZE}"`, 'width="100%" height="100%"') }}
      />

      {err && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-center text-sm text-red-700">{err}</p>
      )}

      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <button onClick={download} disabled={busy} className="btn-primary">
          {busy ? <Loader2 size={16} className="animate-spin" /> : <ImageIcon size={16} />}
          PNG yuklab olish
        </button>
        <a href={telegramUrl} target="_blank" rel="noreferrer" className="btn-outline">
          <Send size={16} /> Telegramda ulashish
        </a>
        <button onClick={copyLink} className="btn-ghost">
          {copied ? <Check size={16} className="text-accent" /> : <Link2 size={16} />}
          {copied ? 'Nusxalandi' : 'Havolani nusxalash'}
        </button>
      </div>
    </div>
  );
}
