'use client';

import { useRef, useState, useCallback } from 'react';

// Kartochkalar uchun 3D egilish (tilt) oʻrovi.
// Sichqoncha harakatiga qarab kartochka markazga nisbatan mayin egiladi;
// sichqoncha chiqqanda tekis holatiga qaytadi. Sensor ekran va reduced-motion da oʻchadi.
// Kartochka oʻlchami oʻzgarmaydi — oʻrov faqat transform beradi (perspective transform ichida).
export default function TiltCard({ children, className = '', max = 7, glare = true }) {
  const outerRef = useRef(null);
  const [style, setStyle] = useState(null);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, on: false });

  // Faqat aniq kursor (sichqoncha) va harakatga ruxsat boʻlganda ishlaydi
  const enabled = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return (
      window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }, []);

  const handleMove = (e) => {
    if (!enabled()) return;
    const el = outerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width; // 0..1
    const py = (e.clientY - rect.top) / rect.height; // 0..1
    const rotateY = (px - 0.5) * 2 * max; // chap/oʻng burilish
    const rotateX = -(py - 0.5) * 2 * max; // yuqori/past burilish
    setStyle({
      transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(6px)`,
      transition: 'transform 60ms linear',
    });
    if (glare) setGlarePos({ x: px * 100, y: py * 100, on: true });
  };

  const handleLeave = () => {
    // Mayin ravishda tekis holatga qaytish
    setStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateZ(0)',
      transition: 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)',
    });
    setGlarePos((g) => ({ ...g, on: false }));
  };

  return (
    <div ref={outerRef} className={className} onMouseMove={handleMove} onMouseLeave={handleLeave}>
      <div
        className="relative h-full [transform-style:preserve-3d]"
        style={{ willChange: 'transform', ...(style || {}) }}
      >
        {children}
        {glare && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl transition-opacity duration-300"
            style={{
              opacity: glarePos.on ? 1 : 0,
              background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(129,140,248,0.16), transparent 55%)`,
            }}
          />
        )}
      </div>
    </div>
  );
}
