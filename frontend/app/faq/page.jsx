'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  { q: 'Kurslardan qanday foydalanaman?', a: 'Ro\'yxatdan o\'ting, o\'zingizga mos kursni tanlang va unga yoziling. Bepul kurslarga darhol, pullik kurslarga to\'lovdan so\'ng kirish ochiladi.' },
  { q: 'To\'lovni qanday amalga oshiraman?', a: 'Pullik kursni tanlab, Click yoki Payme orqali to\'lovni amalga oshirasiz. To\'lovdan so\'ng kursga to\'liq kirish huquqiga ega bo\'lasiz.' },
  { q: 'Sertifikat olamanmi?', a: 'Ha. Kursning barcha darslarini 100% tugatganingizdan so\'ng sizga avtomatik ravishda rasmiy sertifikat beriladi. Uni chop etishingiz yoki PDF sifatida saqlashingiz mumkin.' },
  { q: 'Kursga umrbod kirish bormi?', a: 'Ha, kursga bir marta yozilganingizdan so\'ng unga cheksiz muddat kira olasiz va istalgan vaqtda takrorlashingiz mumkin.' },
  { q: 'Darslarni telefonda ko\'rsam bo\'ladimi?', a: 'Albatta. Platforma barcha qurilmalarda — kompyuter, planshet va telefonda qulay ishlaydi.' },
  { q: 'Testlar qanday ishlaydi?', a: 'Ba\'zi darslarda bilimingizni sinash uchun testlar bor. 60% va undan yuqori natija to\'plasangiz, dars avtomatik tugallangan deb belgilanadi.' },
];

export default function FaqPage() {
  const [open, setOpen] = useState(0);

  return (
    <div className="container-page max-w-3xl py-14">
      <div className="text-center">
        <h1 className="text-4xl">Ko'p so'raladigan savollar</h1>
        <p className="mt-3 text-muted">Eng ko'p beriladigan savollarga javoblar</p>
      </div>

      <div className="mt-10 space-y-3">
        {faqs.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="card overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left font-medium hover:bg-slate-50"
              >
                {item.q}
                <ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && <div className="border-t border-line px-5 py-4 text-sm text-muted">{item.a}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
