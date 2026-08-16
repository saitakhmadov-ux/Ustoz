'use client';

// Ekrandagi klaviatura: keyingi bosiladigan tugma yonib turadi, tugmalar esa
// qaysi barmoq bilan bosilishi bo'yicha ranglangan.
//
// Joylashuv — AQSh/QWERTY, chunki o'zbek lotin yozuvi shu klaviaturada
// yoziladi (oʻ va gʻ uchun apostrof tugmasi ishlatiladi).
//
// O'lchamlar ekran kengligiga qarab o'sadi — katta monitorda klaviatura
// haqiqiy o'lchamiga yaqinlashadi va bo'sh joy qolmaydi.

import {
  KEY_ROWS, keyForChar, FINGER_OF, FINGER_COLOR,
} from '@/lib/typing';

// Oddiy harf tugmasi — kvadrat. O'lchamlar shunday tanlanganki, klaviatura
// yon paneldan qolgan joyga gorizontal aylantirmasdan sig'adi.
const SQUARE = 'h-9 w-9 text-xs xl:h-12 xl:w-12 xl:text-sm 2xl:h-14 2xl:w-14 2xl:text-base';

function Key({ label, width = SQUARE, active, finger }) {
  return (
    <span
      className={`grid place-items-center rounded-lg border font-medium transition-colors ${width}
        ${active
          ? 'border-primary bg-primary text-on-primary shadow-sm'
          : `border-line ${FINGER_COLOR[finger] || 'bg-surface text-muted'}`}`}
    >
      {label}
    </span>
  );
}

// Chap qo'l tugmalari — o'ng Shift bilan bosiladi (va aksincha)
const LEFT_KEYS = "`12345qwertasdfgzxcvb";
const RIGHT_KEYS = "67890-=yuiop[]hjkl;'nm,./";

export default function TypingKeyboard({ nextChar }) {
  const target = keyForChar(nextChar);
  const activeKey = target?.key || null;
  const needShift = Boolean(target?.shift);

  // Katta harf/belgi qaysi qo'lda bo'lsa — QARAMA-QARSHI Shift yonadi
  const leftShift = needShift && RIGHT_KEYS.includes(activeKey);
  const rightShift = needShift && LEFT_KEYS.includes(activeKey);

  const tall = 'h-9 xl:h-12 2xl:h-14 text-xs xl:text-sm';

  return (
    <div className="select-none">
      <div className="flex flex-col items-center gap-1 xl:gap-2">
        {KEY_ROWS.map((row, i) => (
          <div key={i} className="flex gap-1 xl:gap-2">
            {i === 2 && <Key label="Caps" width={`${tall} w-14 xl:w-20 2xl:w-24`} finger="chap-jimjiloq" />}
            {i === 3 && (
              <Key label="Shift" width={`${tall} w-16 xl:w-24 2xl:w-28`} finger="chap-jimjiloq" active={leftShift} />
            )}

            {row.map((k) => (
              <Key key={k} label={k} active={k === activeKey} finger={FINGER_OF[k]} />
            ))}

            {i === 3 && (
              <Key label="Shift" width={`${tall} w-16 xl:w-24 2xl:w-28`} finger="o'ng-jimjiloq" active={rightShift} />
            )}
          </div>
        ))}

        {/* Probel */}
        <div className="flex">
          <Key
            label="bo'shliq"
            width={`${tall} w-56 xl:w-96 2xl:w-[28rem]`}
            active={activeKey === ' '}
            finger="bosh barmoq"
          />
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        Ranglar barmoqlarni bildiradi. Yonib turgan tugma — keyingi bosiladigani.
      </p>
    </div>
  );
}
