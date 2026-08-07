'use client';

import { useEffect, useState } from 'react';
import { GraduationCap, PlayCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { fileUrl } from '@/lib/constants';

// Edura uslubidagi rasmli hero: surat(lar) + dekorativ doira/nuqtalar + jonli suzuvchi kartalar.
// Rasmlar admin panel (/admin/hero) orqali yuklanadi va belgilangan interval bilan almashib turadi.
// Admin hech rasm yuklamagan bo'lsa quyidagi standart surat ko'rsatiladi.
const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=900&q=80';

export default function HeroVisual() {
  const [stats, setStats] = useState(null);
  const [images, setImages] = useState([DEFAULT_IMAGE]);
  const [intervalSec, setIntervalSec] = useState(5);
  const [idx, setIdx] = useState(0);

  // 3D parallax: sichqoncha ustida sahna mayin egiladi, qatlamlar turli chuqurlikda suradi.
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, active: false });

  useEffect(() => {
    api.get('/home/stats', { auth: false }).then((r) => setStats(r.stats)).catch(() => {});
    api.get('/home/hero', { auth: false })
      .then((r) => {
        const imgs = (r.hero?.images || []).map(fileUrl).filter(Boolean);
        if (imgs.length) {
          setImages(imgs);
          setIdx(0);
        }
        if (r.hero?.intervalSec) setIntervalSec(r.hero.intervalSec);
      })
      .catch(() => {});
  }, []);

  // Bir nechta rasm bo'lsa — interval bilan almashtiramiz (crossfade)
  useEffect(() => {
    if (images.length < 2) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % images.length);
    }, Math.max(2, intervalSec) * 1000);
    return () => clearInterval(t);
  }, [images, intervalSec]);

  // Faqat aniq kursor (sichqoncha) va harakatga ruxsat bo'lganda ishlaydi
  const tiltEnabled = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return (
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  };

  const handleMove = (e) => {
    if (!tiltEnabled()) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width; // 0..1
    const py = (e.clientY - r.top) / r.height; // 0..1
    const MAX = 6; // egilish burchagi (daraja) — nozik
    setTilt({ ry: (px - 0.5) * 2 * MAX, rx: -(py - 0.5) * 2 * MAX, active: true });
  };

  const handleLeave = () => setTilt({ rx: 0, ry: 0, active: false });

  // Harakat vaqtida tez, chiqqanda mayin qaytish
  const ease = tilt.active ? 'transform 80ms linear' : 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)';

  const sceneStyle = {
    transformStyle: 'preserve-3d',
    transform: `rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`,
    transition: ease,
    willChange: 'transform',
  };

  // Qatlam chuqurligi — faqat hover paytida qo'llanadi (tinch holatda hammasi tekis, o'lcham o'zgarmaydi)
  const depth = (z) => ({
    transform: `translateZ(${tilt.active ? z : 0}px)`,
    transition: ease,
  });

  return (
    <div
      className="relative mx-auto w-full max-w-md [perspective:1200px] md:max-w-none"
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      <div className="relative" style={sceneStyle}>
        {/* Dekorativ nuqta pattern (yuqori chap) — orqaga suriladi */}
        <svg
          className="absolute -left-5 -top-5 h-24 w-24 text-indigo-300/70"
          viewBox="0 0 100 100"
          fill="currentColor"
          aria-hidden="true"
          style={depth(-24)}
        >
          {[0, 1, 2, 3, 4].map((r) =>
            [0, 1, 2, 3, 4].map((c) => (
              <circle key={`${r}-${c}`} cx={8 + c * 20} cy={8 + r * 20} r="3" opacity="0.5" />
            ))
          )}
        </svg>

        {/* Yumshoq rangli nurlar (indigo + emerald) — eng orqada, chuqurlik uchun */}
        <div className="pointer-events-none absolute -right-8 -top-8 h-52 w-52 rounded-full bg-indigo-400/25 blur-3xl" aria-hidden="true" style={depth(-50)} />
        <div className="pointer-events-none absolute -left-10 bottom-6 h-52 w-52 rounded-full bg-emerald-300/25 blur-3xl" aria-hidden="true" style={depth(-50)} />

        {/* Orqadagi nozik siljitilgan ramka — rasm ortida */}
        <div className="absolute inset-x-8 top-9 bottom-1 rounded-[2rem] border border-indigo-200/70" aria-hidden="true" style={depth(-12)} />

        {/* Surat(lar) — oq ramkada, crossfade almashinuvi; oldinga chiqadi */}
        <div className="relative z-10 px-4 pt-2" style={depth(28)}>
          <div className="mx-auto max-w-md rounded-[2rem] bg-white p-2.5 shadow-card-hover ring-1 ring-line md:max-w-none">
            <div className="relative aspect-[7/6] w-full overflow-hidden rounded-[1.5rem] bg-slate-100">
              {images.map((src, i) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={`${src}-${i}`}
                  src={src}
                  alt="Ustoz platformasida o'qiyotgan o'quvchilar"
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-in-out ${
                    i === idx ? 'opacity-100' : 'opacity-0'
                  }`}
                  aria-hidden={i === idx ? undefined : true}
                />
              ))}

              {/* Ko'p rasm bo'lsa — pastda nuqta indikatorlari */}
              {images.length > 1 && (
                <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5">
                  {images.map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/70'
                      }`}
                      aria-hidden="true"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Suzuvchi karta: kurslar (yuqori o'ng) — eng oldinda suzadi */}
        <div className="absolute right-0 top-14 z-20 hidden sm:block" style={depth(70)}>
          <div className="float-slow flex items-center gap-3 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-card-hover backdrop-blur">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-primary">
              <PlayCircle size={20} />
            </span>
            <div>
              <div className="font-display text-lg font-bold leading-none text-ink">{stats ? stats.courses : '—'}</div>
              <div className="text-xs text-muted">Onlayn kurslar</div>
            </div>
          </div>
        </div>

        {/* Suzuvchi karta: o'quvchilar (past chap) — eng oldinda suzadi */}
        <div className="absolute -left-2 bottom-12 z-20 hidden sm:block" style={depth(70)}>
          <div className="float-slow flex items-center gap-3 rounded-2xl border border-line bg-white/95 px-4 py-3 shadow-card-hover backdrop-blur" style={{ animationDelay: '-3s' }}>
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-accent">
              <GraduationCap size={20} />
            </span>
            <div>
              <div className="font-display text-lg font-bold leading-none text-ink">Top 5</div>
              <div className="text-xs text-muted">Faol ustozlar</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
